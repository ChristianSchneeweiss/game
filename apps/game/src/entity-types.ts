import type { BattleManager } from "./battle-types";
import type { BattleConsumable } from "./items/consumables";
import type { Equipment } from "./items/equipment/equipment";
import type {
  RoundLifecycleHooks,
  TurnLifecycleHooks,
} from "./lifecycle-hooks";
import type { AttributeModifier, DamageType, Effect, Spell } from "./types";
import type { WeaponAttackProfile } from "./tactical/types";

export type Team = "TEAM_A" | "TEAM_B";

export interface EntityAttributes {
  strength: number;
  intelligence: number;
  vitality: number;
  agility: number;
  /** Old character builds omit Movement and receive the base allowance of 3. */
  movement?: number;
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

export type Equipped = Partial<{
  WEAPON: Equipment;
  ARMOR: Equipment;
  RING: Equipment;
  AMULET: Equipment;
  BOOTS: Equipment;
  GLOVES: Equipment;
  HELMET: Equipment;
  CLOAK: Equipment;
  BELT: Equipment;
}>;

export interface Entity
  extends
    Pick<RoundLifecycleHooks, "onPreRound" | "onPostRound">,
    TurnLifecycleHooks {
  consumables?: BattleConsumable[];
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
  equipped: Equipped;
  passiveSkills: Effect[];
  battleManager: BattleManager;
  isBot: boolean;
  weaponAttackProfile?: WeaponAttackProfile;

  // todo: do i need them?
  applyDamage(amount: number, type: DamageType, source: Entity): void;
  applyHealing(amount: number, source: Entity): void;
  applyEffect(effect: Effect): void;
  removeEffect(effect: Effect): void;

  isDead(): boolean;
  getAttribute(attribute: AllAttributeKeys): number;
}
