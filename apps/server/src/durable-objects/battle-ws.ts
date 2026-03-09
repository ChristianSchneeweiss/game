import type { ClerkClient } from "@clerk/backend";
import type { BaseEntity, Character } from "@loot-game/game/base-entity";
import type { BattleRound } from "@loot-game/game/battle-types";
import { BM, type EffectTracking } from "@loot-game/game/bm";
import { BaseEnemy } from "@loot-game/game/enemies/base/base.enemy";
import type {
  Affinities,
  EntityAttributes,
  SpecialAttributes,
} from "@loot-game/game/entity-types";
import type { TimelineEventFull } from "@loot-game/game/timeline-events";
import type { SpellDescription } from "@loot-game/game/types";
import { DurableObject } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { drizzle as neonDrizzle } from "drizzle-orm/neon-http";
import { drizzle as postgresDrizzle } from "drizzle-orm/postgres-js";
import { produce } from "immer";
import SuperJSON from "superjson";
import z from "zod";
import { createClerk } from "../clerk";
import { TB_activeBattle, type Database } from "../db/schema";
import { bmStorage } from "../game-usecases/bm-storage";
import { SyncFactory } from "../game-usecases/sync-factory";

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

const getCharacterAttributesSchema = z.object({
  type: z.literal("getCharacterAttributes"),
  data: z.object({
    characterId: z.string(),
  }),
});

const getSpellDescriptionSchema = z.object({
  type: z.literal("getSpellDescription"),
  data: z.object({
    spellId: z.string(),
  }),
});

const messageSchema = z.union([
  castSpellSchema,
  getTargetsSchema,
  getCharacterAttributesSchema,
  getSpellDescriptionSchema,
]);

export type BattleMessage = z.infer<typeof messageSchema>;

export type BattleState = {
  events: TimelineEventFull[];
  round: BattleRound;
  effectTracking: EffectTracking;
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
    }
  | {
      type: "characterAttributes";
      data: {
        baseAttributes: EntityAttributes;
        specialAttributes: SpecialAttributes;
        affinities: Affinities;
        entityId: string;
      };
    }
  | {
      type: "spellDescription";
      data: {
        description: SpellDescription;
        spellId: string;
        entityId: string;
      };
    };

const sessionSchema = z.object({
  id: z.string(),
});

export class BattleWebsocket extends DurableObject {
  sessions: Map<WebSocket, z.infer<typeof sessionSchema>>;
  clerk: ClerkClient = undefined!;
  bm: BM = undefined!;
  env: Env;
  battleId: string = undefined!;
  messages: string[] = [];
  db: Database;

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

    this.db = this.getDb();

    this.ctx.blockConcurrencyWhile(async () => {
      const clerkSecretKey = await this.ctx.storage.get("clerkSecretKey");
      const battleId = await this.ctx.storage.get("battleId");
      if (!clerkSecretKey || !battleId) return;
      this.battleId = battleId as string;
      this.clerk = createClerk(clerkSecretKey as string);
      await this.setupBm();
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

    const syncFactory = new SyncFactory(this.db);
    const { characters, enemies } = await syncFactory.get(this.battleId);

    this.bm = new BM(characters, this.battleId);
    for (const enemy of enemies) {
      this.bm.join(enemy);
    }
    this.bm.start();
    while (await this.processBotTurn()) {}
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
    server.serializeAttachment({ id: user.id });

    this.ctx.acceptWebSocket(server);

    // we want to send the start entitites as the client is also doing all the hp, mp, ... processing
    const startEntities = produce(this.bm.startEntityData, (draft) => {
      draft.forEach((ent) => {
        ent.battleManager = undefined!;
        ent.spells.forEach((spells) => (spells.battleManager = undefined!));
      });
    });

    server.send(
      SuperJSON.stringify({
        type: "entities",
        data: { entities: startEntities as BaseEntity[] },
      } satisfies ResponseMessage),
    );

    if (this.bm.isGameOver()) {
      const winner = this.bm.getWinningTeam();
      server.send(SuperJSON.stringify({ type: "finished", data: { winner } }));
    }

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
    const [activeBattle] = await this.db
      .select()
      .from(TB_activeBattle)
      .where(eq(TB_activeBattle.battleId, this.battleId));
    if (!activeBattle) {
      await this.db.insert(TB_activeBattle).values({
        battleId: this.battleId,
      });
    } else {
      await this.db
        .update(TB_activeBattle)
        .set({ lastAction: new Date() })
        .where(eq(TB_activeBattle.battleId, this.battleId));
    }
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
        if (ws) {
          const user = this.sessions.get(ws);
          if (!user) {
            throw new Error("User not found");
          }
          const character = this.bm.getEntityById(parsed.data.data.entityId);
          if (!character) {
            throw new Error("Character not found");
          }
          // TODO this gonna break asap
          if ((character as Character).userId !== user.id) {
            throw new Error("Character not owned by user");
          }
        }
        await this.processSpellCast(
          parsed.data.data.entityId,
          parsed.data.data.spellId,
          parsed.data.data.targetIds,
        );

        this.bm.start(); // kinda weird
        await this.sendState();

        if (this.bm.isGameOver()) {
          const winner = this.bm.getWinningTeam();
          const ws = this.ctx.getWebSockets();
          ws.forEach((w) => {
            w.send(SuperJSON.stringify({ type: "finished", data: { winner } }));
          });

          await bmStorage.save(this.bm, this.db);
          await this.env.BATTLE_DONE_WORKFLOW.create({
            params: { battleId: this.battleId },
          });
        }
        break;
      case "getTargets":
        if (!ws) {
          return;
        }
        await this.processGetTargets(
          parsed.data.data.entityId,
          parsed.data.data.spellId,
          ws,
        );
        break;
      case "getCharacterAttributes":
        if (!ws) {
          return;
        }
        await this.processGetCharacterAttributes(
          parsed.data.data.characterId,
          ws,
        );
        break;
      case "getSpellDescription":
        if (!ws) {
          return;
        }
        await this.processGetSpellDescription(parsed.data.data.spellId, ws);
        break;
      default:
        throw new Error("Invalid message");
    }
  }

  private async processSpellCast(
    entityId: string,
    spellId: string,
    targetIds: string[],
  ) {
    this.bm.safeCastSpell(entityId, spellId, targetIds);
    this.bm.postTurn();
    // process pre turn of next entity
    this.bm.preTurn();
    while (await this.processBotTurn()) {}
  }

  private async processBotTurn() {
    const nextEntity = this.bm.getEntityById(
      this.bm.getCurrentRound().orderQueue[0],
    );
    if (!nextEntity) {
      return false;
    }

    if (!nextEntity.isBot) {
      return false;
    }

    // if the next entity is a bot, cast the spell
    if (nextEntity instanceof BaseEnemy) {
      const action = nextEntity.getAction();
      this.bm.safeCastSpell(
        nextEntity.id,
        action.spell.config.id,
        action.targets.map((t) => t.id),
      );
      this.bm.postTurn();

      if (this.bm.isGameOver()) {
        console.log("Game over");
        const winner = this.bm.getWinningTeam();
        const ws = this.ctx.getWebSockets();
        ws.forEach((w) => {
          w.send(SuperJSON.stringify({ type: "finished", data: { winner } }));
        });

        await bmStorage.save(this.bm, this.db);
        await this.env.BATTLE_DONE_WORKFLOW.create({
          params: { battleId: this.battleId },
        });

        return false;
      }

      this.bm.preTurn();

      return true;
    }
    return false;
  }

  private async processGetTargets(
    entityId: string,
    spellId: string,
    ws: WebSocket,
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

    const targetType = spell.getTargetType();

    let enemies = targetType.enemies;
    let allies = targetType.allies;
    if (targetType.enemies === Infinity) {
      enemies = this.bm
        .getAliveEntities()
        .filter((e) => e.team === "TEAM_B").length;
    }
    if (targetType.allies === Infinity) {
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
      } satisfies ResponseMessage),
    );
  }

  private async processGetCharacterAttributes(
    characterId: string,
    ws: WebSocket,
  ) {
    const character = this.bm.getEntityById(characterId);
    if (!character) {
      throw new Error("Character not found");
    }
    const baseAttributes = {
      strength: character.getAttribute("strength"),
      intelligence: character.getAttribute("intelligence"),
      vitality: character.getAttribute("vitality"),
      agility: character.getAttribute("agility"),
    } satisfies EntityAttributes;
    const specialAttributes = {
      lifesteal: character.getAttribute("lifesteal"),
      omnivamp: character.getAttribute("omnivamp"),
      armor: character.getAttribute("armor"),
      magicResistance: character.getAttribute("magicResistance"),
      armorPenetration: character.getAttribute("armorPenetration"),
      magicPenetration: character.getAttribute("magicPenetration"),
      healthRegen: character.getAttribute("healthRegen"),
      manaRegen: character.getAttribute("manaRegen"),
      blessed: character.getAttribute("blessed"),
      critChance: character.getAttribute("critChance"),
      critDamage: character.getAttribute("critDamage"),
    } satisfies SpecialAttributes;
    const affinities = {
      fire: character.getAttribute("fire"),
      lightning: character.getAttribute("lightning"),
      earth: character.getAttribute("earth"),
      water: character.getAttribute("water"),
      dark: character.getAttribute("dark"),
    } satisfies Affinities;
    ws.send(
      SuperJSON.stringify({
        type: "characterAttributes",
        data: {
          baseAttributes,
          specialAttributes,
          affinities,
          entityId: characterId,
        },
      } satisfies ResponseMessage),
    );
  }

  private async processGetSpellDescription(spellId: string, ws: WebSocket) {
    const caster = this.bm.entities.find((e) =>
      e.spells.some((s) => s.config.id === spellId),
    );
    if (!caster) {
      throw new Error("Caster not found");
    }
    const spell = caster?.spells.find((s) => s.config.id === spellId);
    if (!spell) {
      throw new Error("Spell not found");
    }
    const description = spell.description(caster);
    ws.send(
      SuperJSON.stringify({
        type: "spellDescription",
        data: { description, spellId, entityId: caster.id },
      } satisfies ResponseMessage),
    );
  }

  private async sendState() {
    const events = this.bm.events;
    const state: ResponseMessage = {
      type: "state",
      data: {
        events,
        round: this.bm.getCurrentRound(),
        effectTracking: this.bm.effectTracking,
      },
    } satisfies ResponseMessage;
    this.ctx.getWebSockets().forEach((ws) => {
      ws.send(SuperJSON.stringify(state));
    });
  }

  private getDb() {
    return process.env.NODE_ENV === "production"
      ? neonDrizzle(this.env.DATABASE_URL)
      : postgresDrizzle(this.env.DATABASE_URL);
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
  }
}
