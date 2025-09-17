import type { ClerkClient } from "@clerk/backend";
import { DurableObject } from "cloudflare:workers";
import z from "zod";
import { createClerk } from "../clerk";

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
  messages: { user: string; message: string }[] = [];

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.env = env;
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
      const clerkSecretKey = await this.ctx.storage.get("clerkSecretKey");
      const battleId = await this.ctx.storage.get("battleId");
      if (!clerkSecretKey || !battleId) return;
      this.battleId = battleId as string;
      this.clerk = createClerk(clerkSecretKey as string);
      const messages = await this.ctx.storage.get("messages");
      if (messages) {
        const messagesArray = z
          .array(z.object({ user: z.string(), message: z.string() }))
          .parse(messages);
        this.messages = messagesArray;
      }
    });
  }

  async setup(clerkSecretKey: string, battleId: string) {
    this.ctx.storage.put({
      clerkSecretKey,
      battleId,
    });
    this.clerk = createClerk(clerkSecretKey);
    this.battleId = battleId;
  }

  async fetch(request: Request): Promise<Response> {
    const webSocketPair = new WebSocketPair();
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    const username = url.searchParams.get("username");
    const [client, server] = Object.values(webSocketPair);
    if (!userId) {
      throw new Error("No userId");
    }
    if (!username) {
      throw new Error("No username");
    }
    const user = await this.clerk.users.getUser(userId);
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
    const m = { user: user.username, message: message as string };
    this.messages.push(m);
    await this.ctx.storage.put({
      messages: this.messages,
    });

    this.ctx.getWebSockets().forEach((ws) => {
      ws.send(
        JSON.stringify({
          type: "message",
          data: m,
        } satisfies ResponseMessage)
      );
    });
  }

  async webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
    wasClean: boolean
  ) {
    if (code !== 1005) {
      ws.close(code, "Durable Object is closing WebSocket");
    }
    this.sessions.delete(ws);
  }
}
