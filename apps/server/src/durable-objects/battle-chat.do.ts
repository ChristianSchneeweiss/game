import type { ClerkClient } from "@clerk/backend";
import { DurableObject } from "cloudflare:workers";
import z from "zod";
import { createClerk } from "../clerk";
import { retainedChatHistory, type ChatMessage } from "../lib/chat-history";
import {
  canConnect,
  socketLimits,
  SocketBudget,
  textWithinBytes,
} from "../lib/socket-limits";

export type ResponseMessage = {
  type: "message";
  data: {
    user: string;
    message: string;
  };
};

const sessionSchema = z.object({
  id: z.string(),
  username: z.string(),
});

export class BattleChat extends DurableObject {
  sessions: Map<WebSocket, z.infer<typeof sessionSchema>>;
  clerk: ClerkClient = undefined!;
  env: Env;
  battleId: string = undefined!;
  messages: ChatMessage[] = [];
  private budget = new SocketBudget();
  private operation: Promise<unknown> = Promise.resolve();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.env = env;
    this.clerk = createClerk(env.CLERK_SECRET_KEY);
    this.sessions = new Map();
    this.ctx.getWebSockets().forEach((ws) => {
      const attachment = ws.deserializeAttachment();
      const session = sessionSchema.safeParse(attachment);
      if (session.success) {
        // If we previously attached state to our WebSocket,
        // let's add it to `sessions` map to restore the state of the connection.
        this.sessions.set(ws, session.data);
      }
    });

    this.ctx.blockConcurrencyWhile(async () => {
      const battleId = await this.ctx.storage.get("battleId");
      // Erase legacy credential copies without depending on them for recovery.
      await this.ctx.storage.put("clerkSecretKey", null);
      if (!battleId) return;
      this.battleId = battleId as string;
      this.messages = retainedChatHistory(
        await this.ctx.storage.get("messages"),
      );
      await this.ctx.storage.put("messages", this.messages);
    });
  }

  // The old two-argument RPC remains valid during deployment; its key is ignored.
  async setup(battleIdOrLegacySecret: string, legacyBattleId?: string) {
    const battleId = legacyBattleId ?? battleIdOrLegacySecret;
    if (this.battleId && this.battleId !== battleId)
      throw new Error("Battle identity cannot change");
    await this.ctx.storage.put({ clerkSecretKey: null, battleId });
    this.battleId = battleId;
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket")
      return new Response("WebSocket upgrade required", { status: 426 });
    const webSocketPair = new WebSocketPair();
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    const username = url.searchParams.get("username");
    const [client, server] = Object.values(webSocketPair);
    if (!userId) {
      throw new Error("No userId");
    }
    if (!username || !textWithinBytes(username, 128)) {
      throw new Error("No username");
    }
    const user = await this.clerk.users.getUser(userId);
    if (!canConnect(this.sessions, user.id))
      return new Response("Connection limit reached", { status: 429 });
    this.sessions.set(server, { id: user.id, username });
    server.serializeAttachment({ id: user.id, username });

    this.ctx.acceptWebSocket(server);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string) {
    const user = this.sessions.get(ws);
    if (!user) {
      throw new Error("User not found");
    }
    if (!textWithinBytes(message, socketLimits.chatMessageBytes)) {
      ws.close(
        typeof message === "string" ? 1009 : 1003,
        "Invalid chat message",
      );
      return;
    }
    if (!message.trim()) return;
    if (!this.budget.take(ws, socketLimits.chatBurst)) {
      ws.close(1008, "Chat rate limit reached");
      return;
    }
    const m = { user: user.username, message };
    const pending = this.operation.then(async () => {
      const messages = retainedChatHistory([...this.messages, m]);
      await this.ctx.storage.put("messages", messages);
      this.messages = messages;
      for (const peer of this.ctx.getWebSockets()) {
        try {
          peer.send(
            JSON.stringify({
              type: "message",
              data: m,
            } satisfies ResponseMessage),
          );
        } catch {
          this.sessions.delete(peer);
          this.budget.delete(peer);
        }
      }
    });
    this.operation = pending.catch(() => undefined);
    return pending;
  }

  async webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
    wasClean: boolean,
  ) {
    if (code !== 1005) {
      ws.close(code, "Durable Object is closing WebSocket");
    }
    this.sessions.delete(ws);
    this.budget.delete(ws);
  }
}
