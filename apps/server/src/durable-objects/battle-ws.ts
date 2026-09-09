import type { ClerkClient } from "@clerk/backend";
import type { BaseEntity, Character } from "@loot-game/game/base-entity";
import { BM } from "@loot-game/game/bm";
import type {
  Affinities,
  EntityAttributes,
  SpecialAttributes,
} from "@loot-game/game/entity-types";
import { DurableObject } from "cloudflare:workers";
import { drizzle as neonDrizzle } from "drizzle-orm/neon-http";
import { drizzle as postgresDrizzle } from "drizzle-orm/postgres-js";
import cloneDeep from "lodash/cloneDeep";
import SuperJSON from "superjson";
import z from "zod";
import { createClerk } from "../clerk";
import { TB_activeBattle, type Database } from "../db/schema";
import { bmStorage } from "../game-usecases/bm-storage";
import { SyncFactory } from "../game-usecases/sync-factory";

import {
  messageSchema,
  type BattleMessage,
  type BattleState,
  type ResponseMessage,
} from "../battle/protocol";
import {
  castBattleSpell,
  getBattleTargets,
  advanceBots,
  availableSpells,
  describeBattleSpell,
} from "../battle/commands";
import {
  captureStartingBuilds,
  restoreStartingBuilds,
  type StartingBuilds,
} from "../battle/starting-builds";
export type {
  BattleMessage,
  BattleState,
  ResponseMessage,
} from "../battle/protocol";

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

    let builds = await this.ctx.storage.get<StartingBuilds>("startingBuilds");
    if (!builds) {
      const { characters, enemies } = await new SyncFactory(this.db).get(
        this.battleId,
      );
      builds = captureStartingBuilds([...characters, ...enemies]);
      await this.ctx.storage.put("startingBuilds", builds);
    }
    this.bm = new BM(restoreStartingBuilds(builds), this.battleId);
    this.bm.start();
    advanceBots(this.bm);
  }

  async setup(clerkSecretKey: string, battleId: string) {
    await this.ctx.storage.put({
      clerkSecretKey,
      battleId,
    });
    this.clerk = createClerk(clerkSecretKey);
    this.battleId = battleId;

    const needsSetup = !this.bm;
    await this.setupBm();
    if (needsSetup && this.bm.isGameOver()) await this.finishBattle();
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
    const startEntities = cloneDeep(this.bm.startEntityData);
    for (const entity of startEntities) {
      entity.battleManager = undefined!;
      entity.spells.forEach((spell) => {
        spell.battleManager = undefined!;
      });
    }

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
    if (typeof message !== "string") return;
    let requestId: string | undefined;
    try {
      const parsed = messageSchema.parse(SuperJSON.parse(message));
      requestId =
        "requestId" in parsed.data ? parsed.data.requestId : undefined;
      const accepted = await this.handleMessage(message, ws);
      // Only accepted commands may be replayed after hibernation. Reads and
      // rejected commands must never become part of the combat command log.
      if (accepted) {
        this.messages.push(message);
        await this.ctx.storage.put({ messages: this.messages });
        ws.send(
          SuperJSON.stringify({
            type: "castAccepted",
            data: { requestId },
          } satisfies ResponseMessage),
        );
        await this.sendState();
        await this.db
          .insert(TB_activeBattle)
          .values({ battleId: this.battleId })
          .onConflictDoUpdate({
            target: TB_activeBattle.battleId,
            set: { lastAction: new Date() },
          });
        if (this.bm.isGameOver()) await this.finishBattle();
      }
    } catch (error) {
      ws.send(
        SuperJSON.stringify({
          type: "rejected",
          data: {
            requestId,
            message:
              error instanceof Error ? error.message : "Command rejected.",
          },
        } satisfies ResponseMessage),
      );
      await this.sendState();
    }
  }

  private async handleMessage(message: string, ws?: WebSocket) {
    const parsed = messageSchema.safeParse(SuperJSON.parse(message as string));
    if (!parsed.success) {
      throw new Error("Invalid message");
    }
    switch (parsed.data.type) {
      case "castSpell": {
        const character = this.bm.getEntityById(parsed.data.data.entityId);
        // Without a socket this is an already authenticated, accepted command
        // being restored from the Durable Object's own command log.
        const owner = ws
          ? this.sessions.get(ws)?.id
          : (character as Character)?.userId;
        if (!owner) throw new Error("User not found");
        castBattleSpell(this.bm, parsed.data.data, owner);
        return true;
      }
      case "getTargets":
        if (!ws) {
          return;
        }
        ws.send(
          SuperJSON.stringify({
            type: "targets",
            data: getBattleTargets(this.bm, parsed.data.data),
          } satisfies ResponseMessage),
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

  private async finishBattle() {
    // Persist the result before allowing clients to enter the existing replay.
    await bmStorage.save(this.bm, this.db);
    await this.env.BATTLE_DONE_WORKFLOW.create({
      id: this.battleId,
      params: { battleId: this.battleId },
    });
    this.ctx.getWebSockets().forEach((ws) =>
      ws.send(
        SuperJSON.stringify({
          type: "finished",
          data: { winner: this.bm.getWinningTeam()! },
        } satisfies ResponseMessage),
      ),
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
    const description = describeBattleSpell(this.bm, caster, spell);
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
        revision: this.bm.events.length,
        availableSpells: availableSpells(this.bm),
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
