import z from "zod";
import type { BaseEnemy } from "../enemies/base/base.enemy";
import type { ItemType } from "../items/item-types";
import type { LootEntity } from "../types";
import type { RouteOffer } from "./route-catalog";

export const routeActionSchema = z.enum([
  "continue",
  "elite",
  "restore-health",
  "restore-mana",
  "take-treasure",
  "gamble-treasure",
  "open-vault",
]);
export type RouteAction = z.infer<typeof routeActionSchema>;
export type RouteResourceChange = {
  characterId: string;
  health: number;
  mana: number;
};
export type RouteDecision = {
  /** Zero-based index of the encounter reached by this path. */
  wave: number;
  offerId: string;
  action: RouteAction;
  outcome: "passed" | "elite" | "restored" | "treasure" | "trap";
  rewards: ItemType[];
  resources: RouteResourceChange[];
  /** Freeze the promised elite bonus odds when choosing; older choices guaranteed the bonus. */
  eliteRewardChance?: number;
};
export type DungeonRoute = {
  version: 1;
  forks: { wave: number; offers: RouteOffer[] }[];
  decisions: RouteDecision[];
};

/** Immutable rules promised to persisted route version 1. Add a new version to change them. */
export const routeRules = Object.freeze({
  healthRecovery: 0.3,
  manaRecovery: 0.4,
  gambleChance: 0.5,
  trapHealthCost: 0.15,
  eliteHealth: 1.4,
  eliteAttributes: 1.25,
  eliteRewardChance: 0.5,
} as const);

export const routeRecovery = (
  current: number,
  maximum: number,
  fraction: number,
) => Math.max(0, Math.min(maximum - current, Math.ceil(maximum * fraction)));

export function routeRewards(wave: number) {
  return {
    safeReward: (wave % 2 === 0 ? "int-armor" : "iron-sword") as ItemType,
    rareReward: (wave % 2 === 0
      ? "oakwarden-staff"
      : "iron-cuirass") as ItemType,
  };
}

export function routeNeedsChoice(
  route: DungeonRoute | null | undefined,
  wave: number,
  total: number,
) {
  return Boolean(
    route &&
    wave > 0 &&
    wave < total &&
    !route.decisions.some((decision) => decision.wave === wave),
  );
}

export const routeRewardKey = (dungeonId: string, wave: number) =>
  `route:${dungeonId}:${wave}`;
export const routeEquipmentDrop = (itemType: ItemType): LootEntity => ({
  type: "ITEM",
  data: { itemType },
  dropRate: 1,
});

/** Apply once to newly reconstructed enemies, before freezing the battle build. */
export function strengthenEliteEncounter(enemies: BaseEnemy[]) {
  for (const enemy of enemies) {
    enemy.name = `Elite ${enemy.name}`;
    enemy.maxHealth = Math.ceil(enemy.maxHealth * routeRules.eliteHealth);
    enemy.health = enemy.maxHealth;
    for (const attribute of ["strength", "intelligence", "vitality"] as const)
      enemy.baseAttributes[attribute] = Math.ceil(
        enemy.baseAttributes[attribute] * routeRules.eliteAttributes,
      );
  }
}
