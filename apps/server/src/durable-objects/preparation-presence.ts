import { DurableObject } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/postgres-js";
import { getPreparation } from "../game-usecases/shared-preparation-read";
import { reconcilePreparationPresence } from "../game-usecases/shared-preparation-presence";
import {
  canConnect,
  SocketBudget,
  textWithinBytes,
} from "../lib/socket-limits";
import z from "zod";

const attachmentSchema = z.object({
  id: z.string(),
  connectionId: z.string(),
  seenAt: z.number(),
});
const heartbeatMs = 30_000;

/** One room per preparation, retained through its run. Presence never grants consent. */
export class PreparationPresence extends DurableObject<Env> {
  private preparationId?: string;
  private sessions = new Map<WebSocket, z.infer<typeof attachmentSchema>>();
  private operation: Promise<unknown> = Promise.resolve();
  private budget = new SocketBudget();
  private db;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.db = drizzle(env.DATABASE_URL);
    for (const ws of ctx.getWebSockets()) {
      const attachment = attachmentSchema.safeParse(ws.deserializeAttachment());
      if (attachment.success) this.sessions.set(ws, attachment.data);
      else ws.close(1008, "Invalid connection");
    }
    ctx.blockConcurrencyWhile(async () => {
      this.preparationId = await ctx.storage.get<string>("preparationId");
      if (this.preparationId) await this.reconcile();
    });
  }

  async setup(preparationId: string) {
    return this.exclusive(async () => {
      if (this.preparationId && this.preparationId !== preparationId)
        throw new Error("Preparation identity cannot change");
      await this.ctx.storage.put("preparationId", preparationId);
      this.preparationId = preparationId;
    });
  }

  async fetch(request: Request) {
    return this.exclusive(async () => {
      if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket")
        return new Response("WebSocket upgrade required", { status: 426 });
      const userId = new URL(request.url).searchParams.get("userId");
      if (!userId || !this.preparationId)
        return new Response("Preparation unavailable", { status: 403 });
      const preparation = await getPreparation(
        this.preparationId,
        userId,
        this.db,
      );
      if (preparation.closedAt)
        return new Response("Preparation closed", { status: 409 });
      await this.reconcile();
      if (!canConnect(this.sessions, userId))
        return new Response("Connection limit reached", { status: 429 });
      const [client, server] = Object.values(new WebSocketPair());
      const session = {
        id: userId,
        connectionId: crypto.randomUUID(),
        seenAt: Date.now(),
      };
      this.sessions.set(server, session);
      server.serializeAttachment(session);
      this.ctx.acceptWebSocket(server);
      try {
        await this.reconcile();
        if (this.sessions.has(server))
          server.send(JSON.stringify({ type: "connected" }));
      } catch (error) {
        this.sessions.delete(server);
        server.close(1011, "Connection could not be registered");
        throw error;
      }
      return new Response(null, { status: 101, webSocket: client });
    });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    return this.exclusive(async () => {
      const session = this.sessions.get(ws);
      if (!session) return;
      if (!textWithinBytes(message, 128) || !this.budget.take(ws, 6)) {
        await this.disconnect(ws, 1008, "Invalid heartbeat");
        return;
      }
      let ping = false;
      try {
        ping = JSON.parse(message).type === "ping";
      } catch {
        /* Invalid frame. */
      }
      if (!ping || Date.now() - session.seenAt >= heartbeatMs) {
        await this.disconnect(ws, 1008, "Reconnect to preparation");
        return;
      }
      session.seenAt = Date.now();
      ws.serializeAttachment({ ...ws.deserializeAttachment(), ...session });
      await this.reconcile();
      if (this.sessions.has(ws)) ws.send(JSON.stringify({ type: "pong" }));
    });
  }

  async webSocketClose(ws: WebSocket) {
    return this.exclusive(() => this.disconnect(ws, 1000, "Connection closed"));
  }

  async webSocketError(ws: WebSocket) {
    return this.exclusive(() =>
      this.disconnect(ws, 1011, "Connection interrupted"),
    );
  }

  async alarm() {
    return this.exclusive(() => this.reconcile());
  }

  private async disconnect(ws: WebSocket, code: number, reason: string) {
    this.sessions.delete(ws);
    this.budget.delete(ws);
    try {
      ws.close(code, reason);
    } catch {
      /* Already closed. */
    }
    await this.reconcile();
  }

  private async reconcile() {
    if (!this.preparationId) return;
    for (const [ws, session] of this.sessions) {
      if (Date.now() - session.seenAt >= heartbeatMs) {
        this.sessions.delete(ws);
        this.budget.delete(ws);
        try {
          ws.close(1001, "Heartbeat expired");
        } catch {
          /* Already closed. */
        }
      }
    }
    // Persist the retry before DB I/O. A failed disconnect must not leave durable
    // readiness indefinitely; the DB lease also expires independently of alarms.
    await this.ctx.storage.setAlarm(Date.now() + 10_000);
    const admitted = await reconcilePreparationPresence(
      this.preparationId,
      [...this.sessions.values()].map((session) => ({
        userId: session.id,
        connectionId: session.connectionId,
      })),
      this.db,
    );
    const currentConnections = new Set(
      admitted.map((connection) => connection.connectionId),
    );
    for (const [ws, session] of this.sessions) {
      if (!currentConnections.has(session.connectionId)) {
        this.sessions.delete(ws);
        this.budget.delete(ws);
        try {
          ws.close(1008, "Preparation membership ended");
        } catch {
          /* Already closed. */
        }
      }
    }
    if (!this.sessions.size) await this.ctx.storage.deleteAlarm();
  }

  private exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.operation.then(operation);
    this.operation = next.catch(() => undefined);
    return next;
  }
}
