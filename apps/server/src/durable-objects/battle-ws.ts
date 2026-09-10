import type { ClerkClient } from "@clerk/backend";
import type { BaseEntity } from "@loot-game/game/base-entity";
import type { BM } from "@loot-game/game/bm";
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
import type { Database } from "../db/schema";
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
  availableSpells,
  describeBattleSpell,
} from "../battle/commands";
import {
  captureStartingBuilds,
  type StartingBuilds,
} from "../battle/starting-builds";
import { reconstructBattle } from "../battle/reconstruct-battle";
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
      await this.resumeDelivery();
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
    this.startingBuilds = builds;
    this.messages = z
      .array(z.string())
      .parse((await this.ctx.storage.get("messages")) ?? []);
    this.bm = reconstructBattle(this.battleId, builds, this.messages);
    this.delivery = (await this.ctx.storage.get<BattleDelivery>(
      "delivery",
    )) ?? {
      activity: this.messages.length > 0,
      completion: this.bm.isGameOver() ? "result" : "none",
      failures: 0,
    };
    if (needsDelivery(this.delivery))
      await saveDelivery(this.ctx.storage, this.delivery);
  }

  async setup(clerkSecretKey: string, battleId: string) {
    return this.exclusive(async () => {
      if (this.battleId && this.battleId !== battleId)
        throw new Error("Battle identity cannot change");
      await this.ctx.storage.put({ clerkSecretKey, battleId });
      this.clerk = createClerk(clerkSecretKey);
      this.battleId = battleId;
      await this.setupBm();
      await this.resumeDelivery();
    });
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
    if (typeof message !== "string") return;
    return this.exclusive(() => this.receiveMessage(ws, message));
  }

  private async receiveMessage(ws: WebSocket, message: string) {
    let requestId: string | undefined;
    try {
      const parsed = messageSchema.parse(SuperJSON.parse(message));
      requestId =
        "requestId" in parsed.data ? parsed.data.requestId : undefined;
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
      this.send(ws, {
        type: "rejected",
        data: {
          requestId,
          message: error instanceof Error ? error.message : "Command rejected.",
        },
      });
      await this.sendState();
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

  private async resumeDelivery() {
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
    } catch (error) {
      console.error("Battle persistence will retry", this.battleId, error);
      const retry = { ...this.delivery, failures: this.delivery.failures + 1 };
      await saveDelivery(this.ctx.storage, retry);
      this.delivery = retry;
      return;
    }
    if (this.delivery.completion === "delivered") {
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
      this.send(ws, state);
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
