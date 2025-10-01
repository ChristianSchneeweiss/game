import { nanoid } from "nanoid";
import type { BattleManager } from "../battle-types";
import type { AllAttributeKeys, Entity, Equipped, Team } from "../entity-types";
import type { PassiveSkill } from "../passive-skills/base/passive-types";
import type { TimelineEvent } from "../timeline-events";
import type { AttributeModifier, DamageType, Effect, Spell } from "../types";

export class FakeEntity implements Entity {
  id = nanoid(20);
  name = "Fake Entity";
  team = "TEAM_B" as Team;
  health = 100;
  maxHealth = 100;
  mana: number = 100;
  maxMana = 100;
  baseAttributes = {
    strength: 0,
    vitality: 0,
    agility: 0,
    intelligence: 0,
  };
  baseSpecialAttributes = {
    armor: 0,
    blessed: 0,
    lifesteal: 0,
    omnivamp: 0,
    magicResistance: 0,
    armorPenetration: 0,
    magicPenetration: 0,
    healthRegen: 0,
    manaRegen: 0,
    critChance: 0,
    critDamage: 0,
  };
  baseAffinities = {
    fire: 0,
    lightning: 0,
    earth: 0,
    water: 0,
    dark: 0,
  };
  activeEffects: Effect[] = [];
  attributeModifiers: AttributeModifier[] = [];
  spells: Spell[] = [];
  equipped: Equipped = {};
  passiveSkills: PassiveSkill[] = [];
  battleManager: BattleManager = undefined!;
  isBot: boolean = true;

  applyDamage(amount: number, type: DamageType, source: Entity): void {
    throw new Error("Method not implemented.");
  }
  applyHealing(amount: number, source: Entity): void {
    throw new Error("Method not implemented.");
  }
  applyEffect(effect: Effect): void {
    throw new Error("Method not implemented.");
  }
  removeEffect(effect: Effect): void {
    throw new Error("Method not implemented.");
  }
  isDead(): boolean {
    throw new Error("Method not implemented.");
  }
  getAttribute(attribute: AllAttributeKeys): number {
    throw new Error("Method not implemented.");
  }
  onPreRound?: (() => void) | undefined;
  onPostRound?: (() => void) | undefined;
  onUpkeep?: (() => TimelineEvent[] | null) | undefined;
  onActionSelection?: (() => TimelineEvent[] | null) | undefined;
  onEndStep?: (() => TimelineEvent[] | null) | undefined;
}
