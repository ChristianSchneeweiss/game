import type {
  RoundLifecycleHooks,
  TurnLifecycleHooks,
} from "./lifecycle-hooks";
import type { BattleManager } from "./battle-types";
import type { AttributeModifier, DamageType, Effect, Spell } from "./types";

export type Team = "TEAM_A" | "TEAM_B";

export interface EntityAttributes {
  strength: number;
  intelligence: number;
  vitality: number;
  agility: number;
}

export interface SpecialAttributes {
  lifesteal: number;
  omnivamp: number;
  armor: number;
  magicResistance: number;
  armorPenetration: number;
  magicPenetration: number;
  healthRegen: number;
  manaRegen: number;
  blessed: number;
  critChance: number;
  critDamage: number;
}

export interface Affinities {
  fire: number;
  lightning: number;
  earth: number;
  water: number;
  dark: number;
}

export type AllAttributeKeys =
  | keyof EntityAttributes
  | keyof SpecialAttributes
  | keyof Affinities;

export interface Entity
  extends Pick<RoundLifecycleHooks, "onPreRound" | "onPostRound">,
    TurnLifecycleHooks {
  id: string;
  name: string;
  team: Team;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  baseAttributes: EntityAttributes;
  baseSpecialAttributes: SpecialAttributes;
  baseAffinities: Affinities;
  activeEffects: Effect[];
  attributeModifiers: AttributeModifier[];
  spells: Spell[];
  passiveSkills: Effect[];
  battleManager: BattleManager;
  isBot: boolean;

  // todo: do i need them?
  applyDamage(amount: number, type: DamageType, source: Entity): void;
  applyHealing(amount: number, source: Entity): void;
  applyEffect(effect: Effect): void;
  removeEffect(effect: Effect): void;

  isDead(): boolean;
  getAttribute(attribute: AllAttributeKeys): number;
}
