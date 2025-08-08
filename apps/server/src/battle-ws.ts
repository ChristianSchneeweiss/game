import type { SupabaseClient } from "@supabase/supabase-js";
import { DurableObject } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { TB_user } from "./db/schema";
import { createSB } from "./supabase";

export class BattleWebsocket extends DurableObject {
  sessions: Map<WebSocket, { [key: string]: string }>;
  db: PostgresJsDatabase<any> = undefined!;
  sb: SupabaseClient = undefined!;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sessions = new Map();

    this.ctx.getWebSockets().forEach((ws) => {
      let attachment = ws.deserializeAttachment();
      if (attachment) {
        // If we previously attached state to our WebSocket,
        // let's add it to `sessions` map to restore the state of the connection.
        this.sessions.set(ws, { ...attachment });
      }
    });
  }

  async setup(
    connectionString: string,
    supabaseUrl: string,
    supabaseKey: string
  ) {
    this.db = drizzle(connectionString);
    this.sb = createSB(supabaseUrl, supabaseKey);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const accessToken = url.searchParams.get("access_token");
    if (!accessToken) {
      throw new Error("No access token");
    }

    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);
    const user = await this.sb.auth.getUser(accessToken);
    if (!user.data.user) {
      throw new Error("No user found");
    }

    this.sessions.set(server, { id: user.data.user.id });

    this.ctx.acceptWebSocket(server);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string) {
    const session = this.sessions.get(ws)!;
    const [user] = await this.db
      .select()
      .from(TB_user)
      .where(eq(TB_user.id, session.id));

    ws.send(JSON.stringify(user));
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
