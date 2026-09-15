import SuperJSON from "superjson";
import { BM, type EffectTracking } from "@loot-game/game/bm";
import { readCombatAttributes } from "@loot-game/game/combat-attributes";
import type { Entity } from "@loot-game/game/entity-types";
import type { TimelineEventFull } from "@loot-game/game/timeline-events";
import { createEnemyFromType } from "../../../server/src/game-usecases/enemy-factory";
import {
  applyGridCommand,
  advanceBots,
  availableSpells,
  describeBattleSpell,
} from "../../../server/src/battle/commands";
import type {
  BattleMessage,
  ResponseMessage,
} from "../../../server/src/battle/protocol";
import { registerRecipes } from "../../../server/src/lib/superjson-recipes";
import { buildTimeline } from "@/routes/battle/-presentation/timeline";
import recording from "../../../../tests/battle/recordings/forest-showcase.json";
import { commands, makeCharacter, scenario } from "./fixtures";
import { ownerId } from "./auth";
import { createSpellFromType } from "@loot-game/game/spells/base/spell-from-type";

registerRecipes();
const recorded = SuperJSON.parse<{
  participants: Entity[];
  events: TimelineEventFull[];
  effects: EffectTracking;
  winner: "TEAM_A" | "TEAM_B";
}>(JSON.stringify(recording));
const finalStats = buildTimeline(
  recorded.participants,
  recorded.events,
  undefined,
  recorded.effects,
).at(-1)!.stats;
const resultTeam = (team: Entity["team"]) =>
  recorded.participants
    .filter((entity) => entity.team === team)
    .map((entity) => ({
      id: entity.id,
      ...finalStats.get(entity.id)!,
      dead: finalStats.get(entity.id)!.flags.dead,
    }));
export const recordedResult = {
  participants: recorded.participants,
  timelineData: recorded.events,
  effectTracking: recorded.effects,
  startEntityData: [],
  teamA: resultTeam("TEAM_A"),
  teamB: resultTeam("TEAM_B"),
  winner: recorded.winner,
};

// Exercise production connection hooks and combat rules without an account or server.
// Only Vite's explicit development mode loads this boundary.
const hero = makeCharacter("hero", "Mira", "fixture-owner");
if (scenario === "battle-mobile") {
  hero.name = "Deshaun27";
  hero.spells = (
    [
      "arcane-channeling",
      "bladestorm-rhythm",
      "final-verdict",
      "natures-embrace",
      "basic-attack",
    ] as const
  ).map((type) => createSpellFromType(`hero-${type}`, type));
}
hero.baseAttributes.agility = 100;
const partner = makeCharacter("partner", "Rowan's guardian", "fixture-guest");
if (scenario === "battle-mobile") partner.name = "Araceli_Schroeder7";
const enemy = createEnemyFromType(
  scenario === "battle-mobile" ? "moss-covered-golem" : "goblin",
  "enemy",
);
const extraEnemies =
  scenario === "battle-mobile"
    ? [createEnemyFromType("moss-covered-golem", "enemy-2")]
    : [];
const participants = [hero, partner, enemy, ...extraEnemies];
const bm = new BM(participants, "sanctum-preview", {
  rulesVersion: 2,
  battlefield: {
    width: 7,
    height: 7,
    layoutVersion: "preview",
    blocked: [
      { x: 1, y: 3 },
      { x: 5, y: 3 },
    ],
  },
  positions: {
    hero: { x: 2, y: 5 },
    partner: { x: 4, y: 5 },
    enemy: { x: 2, y: 2 },
    ...(scenario === "battle-mobile" && { "enemy-2": { x: 4, y: 2 } }),
  },
});
bm.start();
advanceBots(bm);
const sockets = new Set<PreviewSocket>();
class PreviewSocket extends EventTarget {
  readyState = 0;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  constructor(readonly url: string) {
    super();
    sockets.add(this);
    setTimeout(() => {
      if (this.readyState !== 0) return;
      this.readyState = 1;
      this.onopen?.(new Event("open"));
      if (scenario === "reconnecting") return;
      if (url.includes("/presence"))
        this.deliver(JSON.stringify({ type: "connected" }));
      else if (!url.endsWith("/chat")) {
        this.emit({
          type: "entities",
          data: { entities: participants },
        });
        this.snapshot();
      }
    }, 100);
  }
  deliver(data: string) {
    if (this.readyState === 1)
      this.onmessage?.(new MessageEvent("message", { data }));
  }
  emit(message: ResponseMessage) {
    this.deliver(SuperJSON.stringify(message));
  }
  snapshot() {
    this.emit({
      type: "state",
      data: {
        events: bm.events,
        round: bm.getCurrentRound(),
        effectTracking: bm.effectTracking,
        revision: bm.revision,
        availableSpells: availableSpells(bm),
        grid: bm.grid,
        actors: bm.entities.map((entity) => ({
          id: entity.id,
          team: entity.team,
          health: entity.health,
          movement: entity.getAttribute("movement"),
        })),
      },
    });
  }
  send(raw: string) {
    setTimeout(() => {
      if (this.readyState === 1) this.receive(raw);
    }, 100);
  }
  receive(raw: string) {
    if (this.url.includes("/presence")) return;
    if (this.url.endsWith("/chat")) {
      this.deliver(
        JSON.stringify({
          type: "message",
          data: { user: "Mira", message: raw },
        }),
      );
      return;
    }
    const parsed = JSON.parse(raw);
    const message: BattleMessage =
      "json" in parsed ? SuperJSON.deserialize(parsed) : parsed;
    if (message.type === "getCharacterAttributes") {
      const entity = bm.getEntityById(message.data.characterId)!;
      this.emit({
        type: "characterAttributes",
        data: {
          entityId: entity.id,
          ...readCombatAttributes(entity),
        },
      });
    } else if (message.type === "getSpellDescription") {
      const entity = bm.entities.find((entity) =>
        entity.spells.some((spell) => spell.config.id === message.data.spellId),
      )!;
      const spell = entity.spells.find(
        (spell) => spell.config.id === message.data.spellId,
      )!;
      this.emit({
        type: "spellDescription",
        data: {
          entityId: entity.id,
          spellId: spell.config.id,
          description: describeBattleSpell(bm, entity, spell),
        },
      });
    } else if (
      message.type === "move" ||
      message.type === "endTurn" ||
      message.type === "castSpatial"
    ) {
      commands.push({ path: message.type, input: message.data });
      try {
        applyGridCommand(bm, message, ownerId);
        this.emit({
          type: "castAccepted",
          data: { requestId: message.data.requestId },
        });
        this.snapshot();
      } catch (error) {
        this.emit({
          type: "rejected",
          data: { requestId: message.data.requestId, message: String(error) },
        });
      }
    }
  }
  close() {
    this.readyState = 3;
    sockets.delete(this);
    this.onclose?.(new CloseEvent("close"));
  }
}
export function installTransport() {
  window.WebSocket = new Proxy(window.WebSocket, {
    construct(target, args) {
      return String(args[0]).includes("/api/")
        ? new PreviewSocket(String(args[0]))
        : Reflect.construct(target, args);
    },
    get(target, property) {
      return property === Symbol.hasInstance
        ? (value: unknown) =>
            value instanceof PreviewSocket || value instanceof target
        : Reflect.get(target, property);
    },
  });
  Object.assign(window, {
    sanctumPreview: {
      commands,
      disconnect: () => sockets.forEach((socket) => socket.close()),
    },
  });
}
