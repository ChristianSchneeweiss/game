import type { BaseEntity } from "@loot-game/game/base-entity";
import { BM } from "@loot-game/game/battle";
import type { TimelineEventFull } from "@loot-game/game/timeline-events";
import type { BattleRound } from "@loot-game/game/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DurableObject } from "cloudflare:workers";
import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { produce } from "immer";
import { nanoid } from "nanoid";
import SuperJSON from "superjson";
import z from "zod";
import { EntityFactory } from "./game-usecases/entity-factory";
import { createSB } from "./supabase";

const castSpellSchema = z.object({
  type: z.literal("castSpell"),
  data: z.object({
    entityId: z.string(),
    spellId: z.string(),
    targetIds: z.array(z.string()),
  }),
});

const getTargetsSchema = z.object({
  type: z.literal("getTargets"),
  data: z.object({
    entityId: z.string(),
    spellId: z.string(),
  }),
});

export const messageSchema = z.union([castSpellSchema, getTargetsSchema]);

export type BattleState = {
  events: TimelineEventFull[];
  round: BattleRound;
  currentInRound: number;
};

export type ResponseMessage =
  | {
      type: "state";
      data: BattleState;
    }
  | {
      type: "entities";
      data: {
        entities: BaseEntity[];
      };
    }
  | {
      type: "targets";
      data: {
        targets: string[];
      };
    }
  | {
      type: "finished";
      data: {
        winner: "TEAM_A" | "TEAM_B";
      };
    };

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
    const battleId = await this.ctx.storage.get("battleId");
    if (!battleId) {
      throw new Error("No battleId");
    }
    this.bm = new BM(characters, battleId as string);
    for (let i = 0; i < 3; i++) {
      const enemy = EntityFactory.createEnemyFromKey(
        `goblin_${nanoid()}`,
        this.db
      );
      this.bm.join(enemy);
    }
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

    if (!this.bm) {
      await this.setupBm();
    }
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

    const entities = produce(this.bm.entities, (draft) => {
      draft.forEach((ent) => {
        ent.battleManager = undefined;
        ent.spells.forEach((spells) => (spells.battleManager = undefined));
      });
    });

    server.send(
      SuperJSON.stringify({
        type: "entities",
        data: { entities: entities as BaseEntity[] },
      } satisfies ResponseMessage)
    );

    this.bm.start();
    await this.sendState(server);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string) {
    const parsed = messageSchema.safeParse(SuperJSON.parse(message as string));
    if (!parsed.success) {
      throw new Error("Invalid message");
    }
    // super weird this has to be done. somehow they lose the battle manager reference
    this.bm.entities.forEach((c) => {
      c.battleManager = this.bm;
      c.spells.forEach((s) => {
        s.battleManager = this.bm;
      });
    });
    switch (parsed.data.type) {
      case "castSpell":
        this.processSpellCast(
          parsed.data.data.entityId,
          parsed.data.data.spellId,
          parsed.data.data.targetIds
        );
        break;
      case "getTargets":
        this.processGetTargets(
          parsed.data.data.entityId,
          parsed.data.data.spellId,
          ws
        );
        break;
      default:
        throw new Error("Invalid message");
    }

    this.bm.start(); // kinda weird
    await this.sendState(ws);

    if (this.bm.isGameOver()) {
      const winner = this.bm.getWinningTeam();
      const ws = this.ctx.getWebSockets();
      ws.forEach((w) => {
        w.send(SuperJSON.stringify({ type: "finished", data: { winner } }));
      });

      // maybe also store the winner in the db

      this.ctx.getWebSockets().forEach((w) => {
        w.close(1000, "Game over");
      });
    }
  }

  private async processSpellCast(
    entityId: string,
    spellId: string,
    targetIds: string[]
  ) {
    this.bm.castNextSpell(entityId, spellId, targetIds);
    this.bm.postTurn();
    // process pre turn of next entity
    this.bm.preTurn();
    while (true) {
      const nextEntity = this.bm.getEntityById(
        this.bm.getCurrentRound().order[this.bm.currentInRound]
      );
      if (!nextEntity) {
        throw new Error("No next entity found");
      }
      console.log("nextEntity", nextEntity.name);
      // if the next entity is a bot, cast the spell
      if (nextEntity.isBot) {
        const action = nextEntity.getAction();
        this.bm.castNextSpell(nextEntity.id, action.spell.config.id, [
          action.targets.map((t) => t.id)[0],
        ]);
        this.bm.postTurn();
        this.bm.preTurn();
      } else {
        break;
      }
    }
  }

  private async processGetTargets(
    entityId: string,
    spellId: string,
    ws: WebSocket
  ) {
    const entity = this.bm.getEntityById(entityId);
    if (!entity) {
      throw new Error("Entity not found");
    }
    const spell = entity.spells.find((s) => s.config.id === spellId);
    if (!spell) {
      throw new Error("Spell not found");
    }
    const targets = spell.getValidTargets(entity);

    ws.send(
      SuperJSON.stringify({
        type: "targets",
        data: { targets: targets?.map((t) => t.id) ?? [] },
      } satisfies ResponseMessage)
    );
  }

  private async sendState(ws: WebSocket) {
    const events = this.bm.events;
    console.log(events);
    const state: ResponseMessage = {
      type: "state",
      data: {
        events,
        round: this.bm.getCurrentRound(),
        currentInRound: this.bm.currentInRound,
      },
    } satisfies ResponseMessage;
    ws.send(SuperJSON.stringify(state));
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
