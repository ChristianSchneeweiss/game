import { BM } from "@loot-game/game/battle";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DurableObject } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { TB_user } from "./db/schema";
import { EntityFactory } from "./game-usecases/entity-factory";
import { createSB } from "./supabase";

export class BattleWebsocket extends DurableObject {
  sessions: Map<WebSocket, { [key: string]: string }>;
  db: PostgresJsDatabase<any> = undefined!;
  sb: SupabaseClient = undefined!;
  bm: BM = undefined!;

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

    this.ctx.blockConcurrencyWhile(async () => {
      const connectionString = await this.ctx.storage.get("connectionString");
      const supabaseUrl = await this.ctx.storage.get("supabaseUrl");
      const supabaseKey = await this.ctx.storage.get("supabaseKey");
      const battleId = await this.ctx.storage.get("battleId");
      if (!connectionString || !supabaseUrl || !supabaseKey || !battleId)
        return;
      this.db = drizzle(connectionString as string);
      this.sb = createSB(supabaseUrl as string, supabaseKey as string);
      this.setupBm(); // not sure why this doesnt work here with await
    });
  }

  private async setupBm() {
    const characters = await EntityFactory.createCharactersFromUser(
      "0e451e99-8bdc-421d-917d-cc92877a015b",
      this.db
    );
    this.bm = new BM(characters);
    const enemy = EntityFactory.createEnemyFromKey("goblin", this.db);
    this.bm.join(enemy);
  }

  async setup(
    connectionString: string,
    supabaseUrl: string,
    supabaseKey: string,
    battleId: string
  ) {
    this.ctx.storage.put({
      connectionString,
      supabaseUrl,
      supabaseKey,
      battleId,
    });
    this.db = drizzle(connectionString);
    this.sb = createSB(supabaseUrl, supabaseKey);

    await this.setupBm();
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

    const events = this.bm.events;
    ws.send(JSON.stringify(events));
    this.bm.onPreRound();
    ws.send(JSON.stringify(this.bm.getCurrentRound()));
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
