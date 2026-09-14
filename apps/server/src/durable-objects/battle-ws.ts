import type { ClerkClient } from "@clerk/backend";
import type { BaseEntity } from "@loot-game/game/base-entity";
import type { BM } from "@loot-game/game/bm";
import type {
  Affinities,
  EntityAttributes,
  SpecialAttributes,
} from "@loot-game/game/entity-types";
import { DurableObject } from "cloudflare:workers";
import { drizzle as postgresDrizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import cloneDeep from "lodash/cloneDeep";
import SuperJSON from "superjson";
import z from "zod";
import { createClerk } from "../clerk";
import { diagnostic } from "../lib/diagnostics";
import {
  canConnect,
  socketLimits,
  SocketBudget,
  textWithinBytes,
} from "../lib/socket-limits";
import { TB_dungeonBattle, type Database } from "../db/schema";
import { SyncFactory } from "../game-usecases/sync-factory";
import { getDungeonRun } from "../game-usecases/dungeon-run";
import {
  abandonDungeon,
  DungeonEncounterChangedError,
} from "../game-usecases/dungeon-abandon";
import { bmStorage } from "../game-usecases/bm-storage";

import {
  messageSchema,
  type BattleMessage,
  type BattleState,
  type ResponseMessage,
} from "../battle/protocol";
import {
  castBattleSpell,
  getBattleTargets,
  availableSpells,
  describeBattleSpell,
} from "../battle/commands";
import {
  captureStartingBuilds,
  type StartingBuilds,
} from "../battle/starting-builds";
import { reconstructBattle } from "../battle/reconstruct-battle";
import { decodeStartingBuilds } from "../battle/starting-build-codec";
import {
  deliverBattle,
  needsDelivery,
  saveDelivery,
  type BattleDelivery,
} from "../battle/battle-delivery";
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
  private startingBuilds: StartingBuilds = [];
  private delivery: BattleDelivery = {
    activity: false,
    completion: "none",
    failures: 0,
  };
  private operation: Promise<unknown> = Promise.resolve();
  private budget = new SocketBudget();
  private abandonment?: {
    dungeonId: string;
    userId: string;
    completed: boolean;
  };

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

    this.db = this.getDb();

    this.ctx.blockConcurrencyWhile(async () => {
      const battleId = await this.ctx.storage.get("battleId");
      await this.ctx.storage.put("clerkSecretKey", null);
      if (!battleId) return;
      this.battleId = battleId as string;
      await this.setupBm();
      diagnostic({
        event: "battle.recovered",
        battleId: this.battleId,
        revision: this.bm.events.length,
        version: this.env.CF_VERSION_METADATA?.id,
      });
      await this.resumeDelivery();
    });
  }

  private async setupBm() {
    if (this.bm) return;

    const journalVersion = await this.ctx.storage.get("journalVersion");
    if (journalVersion !== undefined && journalVersion !== 1)
      throw new Error("Unsupported battle journal version");

    const savedBuilds = await this.ctx.storage.get<unknown>("startingBuilds");
    let builds: StartingBuilds;
    if (savedBuilds === undefined) {
      const { characters, enemies } = await new SyncFactory(this.db).get(
        this.battleId,
      );
      builds = captureStartingBuilds([...characters, ...enemies]);
      await this.ctx.storage.put("startingBuilds", builds);
    } else builds = decodeStartingBuilds(savedBuilds);
    this.startingBuilds = builds;
    this.messages = z
      .array(z.string())
      .parse((await this.ctx.storage.get("messages")) ?? []);
    this.bm = reconstructBattle(this.battleId, builds, this.messages);
    await this.ctx.storage.put("journalVersion", 1);
    this.delivery = (await this.ctx.storage.get<BattleDelivery>(
      "delivery",
    )) ?? {
      activity: this.messages.length > 0,
      completion: this.bm.isGameOver() ? "result" : "none",
      failures: 0,
    };
    this.abandonment =
      (await this.ctx.storage.get<typeof this.abandonment>("abandonment")) ??
      undefined;
    if (needsDelivery(this.delivery))
      await saveDelivery(this.ctx.storage, this.delivery);
  }

  // Keep old RPC callers working during cutover; never retain their secret.
  async setup(battleIdOrLegacySecret: string, legacyBattleId?: string) {
    const battleId = legacyBattleId ?? battleIdOrLegacySecret;
    return this.exclusive(async () => {
      if (this.battleId && this.battleId !== battleId)
        throw new Error("Battle identity cannot change");
      await this.ctx.storage.put({ clerkSecretKey: null, battleId });
      this.battleId = battleId;
      await this.setupBm();
      await this.resumeDelivery();
    });
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket")
      return new Response("WebSocket upgrade required", { status: 426 });
    const webSocketPair = new WebSocketPair();
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    const [client, server] = Object.values(webSocketPair);
    if (!userId) {
      throw new Error("No userId");
    }
    const user = await this.clerk.users.getUser(userId);
    if (!canConnect(this.sessions, user.id))
      return new Response("Connection limit reached", { status: 429 });
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

    if (this.abandonment) {
      this.send(server, {
        type: "abandoned",
        data: { dungeonId: this.abandonment.dungeonId },
      });
      return new Response(null, { status: 101, webSocket: client });
    }

    if (this.delivery.completion === "delivered") {
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
    if (!this.sessions.has(ws)) return;
    if (!textWithinBytes(message, socketLimits.battleFrameBytes)) {
      ws.close(
        typeof message === "string" ? 1009 : 1003,
        "Invalid battle message",
      );
      return;
    }
    if (!this.budget.take(ws, socketLimits.battleBurst)) {
      ws.close(1008, "Battle rate limit reached");
      return;
    }
    return this.exclusive(() => this.receiveMessage(ws, message));
  }

  private async receiveMessage(ws: WebSocket, message: string) {
    let requestId: string | undefined;
    try {
      const parsed = messageSchema.parse(SuperJSON.parse(message));
      requestId =
        "requestId" in parsed.data ? parsed.data.requestId : undefined;
      if (this.abandonment) throw new Error("This dungeon run was abandoned");
      if (parsed.type !== "castSpell") {
        await this.handleRead(parsed, ws);
        return;
      }
      const owner = this.sessions.get(ws)?.id;
      if (!owner) throw new Error("User not found");
      const candidate = reconstructBattle(
        this.battleId,
        this.startingBuilds,
        this.messages,
      );
      castBattleSpell(candidate, parsed.data, owner);
      const messages = [...this.messages, message];
      const delivery: BattleDelivery = {
        activity: true,
        completion: candidate.isGameOver() ? "result" : "none",
        failures: 0,
      };
      // Storage failure or a resolver exception discards the whole candidate.
      // The accepted journal and its persistence wakeup commit together.
      await saveDelivery(this.ctx.storage, delivery, messages);
      this.bm = candidate;
      this.messages = messages;
      this.delivery = delivery;
    } catch (error) {
      diagnostic({
        event: "battle.command_rejected",
        battleId: this.battleId,
        revision: this.bm.events.length,
      });
      this.send(ws, {
        type: "rejected",
        data: {
          requestId,
          message: error instanceof Error ? error.message : "Command rejected.",
        },
      });
      await this.sendState(ws);
      return;
    }
    // Transport and external delivery failures cannot contradict a committed
    // acknowledgement. Reconnecting clients recover the accepted history.
    this.send(ws, { type: "castAccepted", data: { requestId } });
    await this.sendState();
    await this.resumeDelivery();
  }

  private async handleRead(
    message: Exclude<BattleMessage, { type: "castSpell" }>,
    ws: WebSocket,
  ) {
    switch (message.type) {
      case "getTargets":
        this.send(ws, {
          type: "targets",
          data: getBattleTargets(this.bm, message.data),
        });
        break;
      case "getCharacterAttributes":
        await this.processGetCharacterAttributes(message.data.characterId, ws);
        break;
      case "getSpellDescription":
        await this.processGetSpellDescription(message.data.spellId, ws);
        break;
      default:
        throw new Error("Invalid message");
    }
  }

  private exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.operation.then(operation);
    this.operation = result.catch(() => undefined);
    return result;
  }

  async alarm() {
    return this.exclusive(() => this.resumeDelivery());
  }

  async abandon(dungeonId: string, userId: string) {
    return this.exclusive(async () => {
      await getDungeonRun(dungeonId, userId, this.db);
      const [attempt] = await this.db
        .select()
        .from(TB_dungeonBattle)
        .where(eq(TB_dungeonBattle.battleId, this.battleId));
      if (!attempt || attempt.dungeonId !== dungeonId)
        throw new Error("Battle does not belong to this dungeon");
      if (!this.abandonment) {
        const intent = { dungeonId, userId, completed: false };
        // A persisted intent freezes later casts even if the database is down.
        await this.ctx.storage.setAlarm?.(Date.now() + 1000);
        await this.ctx.storage.put("abandonment", intent);
        this.abandonment = intent;
      }
      return this.finishAbandonment();
    });
  }

  private async finishAbandonment() {
    const intent = this.abandonment!;
    if (!intent.completed && this.bm.isGameOver())
      // A committed final cast earned its outcome even if workflow delivery has
      // not run. The database primitive settles this saved result exactly once.
      await bmStorage.save(this.bm, this.db);
    let result;
    try {
      result = await abandonDungeon(intent.dungeonId, intent.userId, this.db, {
        allowActiveBattle: true,
        expectedBattleId: this.battleId,
      });
    } catch (error) {
      if (!(error instanceof DungeonEncounterChangedError)) throw error;
      // Another encounter began before this DO froze its journal. Its own DO
      // must stop that encounter; this object has no authority over that journal.
      await this.ctx.storage.put("abandonment", null);
      this.abandonment = undefined;
      await saveDelivery(this.ctx.storage, this.delivery);
      return { retry: true as const };
    }
    const delivery: BattleDelivery = {
      activity: false,
      completion: "none",
      failures: 0,
    };
    await this.ctx.storage.put({
      abandonment: { ...intent, completed: true },
      delivery,
    });
    this.abandonment = { ...intent, completed: true };
    this.delivery = delivery;
    await this.ctx.storage.deleteAlarm?.();
    for (const ws of this.ctx.getWebSockets())
      this.send(ws, {
        type: "abandoned",
        data: { dungeonId: intent.dungeonId },
      });
    return result;
  }

  private async resumeDelivery() {
    if (this.abandonment) {
      if (!this.abandonment.completed) {
        try {
          await this.finishAbandonment();
        } catch {
          await this.ctx.storage.setAlarm?.(Date.now() + 5000);
        }
      }
      return;
    }
    if (!needsDelivery(this.delivery)) return;
    try {
      await deliverBattle(
        this.bm,
        this.db,
        this.env.BATTLE_DONE_WORKFLOW,
        this.delivery,
        async (next) => {
          await saveDelivery(this.ctx.storage, next);
          this.delivery = next;
        },
      );
    } catch {
      const retry = { ...this.delivery, failures: this.delivery.failures + 1 };
      diagnostic({
        event: "battle.delivery_retry",
        battleId: this.battleId,
        revision: this.bm.events.length,
        failures: retry.failures,
        version: this.env.CF_VERSION_METADATA?.id,
      });
      await saveDelivery(this.ctx.storage, retry);
      this.delivery = retry;
      return;
    }
    if (this.delivery.completion === "delivered") {
      diagnostic({
        event: "battle.delivery_complete",
        battleId: this.battleId,
        revision: this.bm.events.length,
        version: this.env.CF_VERSION_METADATA?.id,
      });
      this.ctx.getWebSockets().forEach((ws) =>
        this.send(ws, {
          type: "finished",
          data: { winner: this.bm.getWinningTeam()! },
        }),
      );
    }
  }

  private send(ws: WebSocket, response: ResponseMessage) {
    try {
      ws.send(SuperJSON.stringify(response));
    } catch {
      this.sessions.delete(ws);
      this.budget.delete(ws);
    }
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

  private async sendState(recipient?: WebSocket) {
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
    (recipient ? [recipient] : this.ctx.getWebSockets()).forEach((ws) => {
      this.send(ws, state);
    });
  }

  private getDb() {
    return postgresDrizzle(this.env.DATABASE_URL);
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
