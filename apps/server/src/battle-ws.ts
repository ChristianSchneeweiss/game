import type { ClerkClient } from "@clerk/backend";
import type { BaseEntity } from "@loot-game/game/base-entity";
import { BM } from "@loot-game/game/battle";
import type { TimelineEventFull } from "@loot-game/game/timeline-events";
import type { BattleRound } from "@loot-game/game/types";
import { DurableObject } from "cloudflare:workers";
import { produce } from "immer";
import SuperJSON from "superjson";
import z from "zod";
import { createClerk } from "./clerk";
import { bmStorage } from "./game-usecases/bm-storage";
import { SyncFactory } from "./game-usecases/sync-factory";

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
        enemies: number;
        allies: number;
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
  clerk: ClerkClient = undefined!;
  bm: BM = undefined!;
  env: Env;
  battleId: string = undefined!;
  messages: string[] = [];

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.env = env;
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
      const clerkSecretKey = await this.ctx.storage.get("clerkSecretKey");
      const battleId = await this.ctx.storage.get("battleId");
      if (!clerkSecretKey || !battleId) return;
      this.battleId = battleId as string;
      this.clerk = createClerk(clerkSecretKey as string);
      await this.setupBm(); // not sure why this doesnt work here with await
      this.bm.start();
      const messages = await this.ctx.storage.get("messages");
      if (messages) {
        const messagesArray = z.array(z.string()).parse(messages);
        this.messages = messagesArray;
        for (const message of messagesArray) {
          await this.handleMessage(message);
        }
      }
    });
  }

  private async setupBm() {
    if (this.bm) return;
    const userId = "user_31jfw5cC2LnsggJb9u98h1KtqFr";
    const syncFactory = new SyncFactory(this.env);
    const { characters, enemies } = await syncFactory.getAll(this.battleId);

    this.bm = new BM(characters, this.battleId);
    for (const enemy of enemies) {
      this.bm.join(enemy);
    }
  }

  async setup(clerkSecretKey: string, battleId: string) {
    this.ctx.storage.put({
      clerkSecretKey,
      battleId,
    });
    this.clerk = createClerk(clerkSecretKey);
    this.battleId = battleId;

    if (!this.bm) {
      await this.setupBm();
    }
  }

  async fetch(request: Request): Promise<Response> {
    const webSocketPair = new WebSocketPair();
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    const [client, server] = Object.values(webSocketPair);
    if (!userId) {
      throw new Error("No userId");
    }
    const user = await this.clerk.users.getUser(userId);
    this.sessions.set(server, { id: user.id });

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
    await this.sendState();

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string) {
    this.messages.push(message as string);
    await this.ctx.storage.put({
      messages: this.messages,
    });
    await this.handleMessage(message as string, ws);
  }

  private async handleMessage(message: string, ws?: WebSocket) {
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
        if (!ws) {
          return;
        }
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
    await this.sendState();

    if (this.bm.isGameOver()) {
      const winner = this.bm.getWinningTeam();
      const ws = this.ctx.getWebSockets();
      ws.forEach((w) => {
        w.send(SuperJSON.stringify({ type: "finished", data: { winner } }));
      });

      await bmStorage.save(this.bm, this.env.GAME);
      await this.env.BATTLE_DONE_WORKFLOW.create({
        params: { battleId: this.battleId },
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

    let enemies = spell.config.targetType.enemies;
    let allies = spell.config.targetType.allies;
    if (spell.config.targetType.enemies === Infinity) {
      enemies = this.bm
        .getAliveEntities()
        .filter((e) => e.team === "TEAM_B").length;
    }
    if (spell.config.targetType.allies === Infinity) {
      allies = this.bm
        .getAliveEntities()
        .filter((e) => e.team === "TEAM_A").length;
    }

    ws.send(
      SuperJSON.stringify({
        type: "targets",
        data: {
          targets: targets?.map((t) => t.id) ?? [],
          enemies,
          allies,
        },
      } satisfies ResponseMessage)
    );
  }

  private async sendState() {
    const events = this.bm.events;
    const state: ResponseMessage = {
      type: "state",
      data: {
        events,
        round: this.bm.getCurrentRound(),
        currentInRound: this.bm.currentInRound,
      },
    } satisfies ResponseMessage;
    this.ctx.getWebSockets().forEach((ws) => {
      ws.send(SuperJSON.stringify(state));
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
