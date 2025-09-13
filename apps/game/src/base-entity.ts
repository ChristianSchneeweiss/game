import { calculator } from "./calculator";
import type { TimelineEvent } from "./timeline-events";
import type {
  AllAttributes,
  AttributeModifier,
  BattleManager,
  DamageType,
  Effect,
  Entity,
  EntityAttributes,
  Spell,
  Team,
} from "./types";

export class BaseEntity implements Entity {
  id: string;
  name: string;
  team: Team;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  baseAttributes: EntityAttributes;
  activeEffects: Effect[];
  attributeModifiers: AttributeModifier[];
  spells: Spell[];
  battleManager?: BattleManager;
  isBot = true;

  constructor(
    id: string,
    name: string,
    team: Team,
    maxHealth: number,
    maxMana: number,
    baseAttributes: EntityAttributes
  ) {
    this.id = id;
    this.name = name;
    this.team = team;
    this.maxHealth = maxHealth;
    this.health = this.maxHealth;
    this.maxMana = maxMana;
    this.mana = this.maxMana;
    this.baseAttributes = baseAttributes;

    this.activeEffects = [];
    this.attributeModifiers = [];
    this.spells = [];
  }

  onUpkeep(): TimelineEvent[] | null {
    // mana and health regeneration
    // TODO make health regen better
    const healthRegen = this.isBot ? 2 : this.getAttribute("vitality") / 2;
    const realHealthRegen = calculator.calculateRealHealing(
      this,
      this,
      healthRegen
    );
    this.applyHealing(realHealthRegen, this);

    const manaRegen = this.getAttribute("intelligence") / 5;
    const realManaRegen = calculator.calculateRealHealing(
      this,
      this,
      manaRegen
    );
    this.mana = Math.min(this.maxMana, this.mana + realManaRegen);

    return [
      {
        eventType: "HEALTH_REGEN",
        data: {
          entityId: this.id,
          amount: realHealthRegen,
        },
      },
      {
        eventType: "MANA_REGEN",
        data: {
          entityId: this.id,
          amount: realManaRegen,
        },
      },
    ];
  }

  onPostRound(): void {
    const effects = Array.from(this.activeEffects.values());
    if (effects.length > 0) {
      console.log(
        `${this.name} has ${effects
          .map((e) => e.effectType)
          .join(", ")} effects`
      );
    }
  }

  applyDamage(amount: number, type: DamageType, source: Entity): void {
    this.health = Math.max(0, this.health - amount);
  }

  applyHealing(amount: number, source: Entity): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  applyEffect(effect: Effect): void {
    this.activeEffects.push(effect);
    effect.onApply?.();
  }

  removeEffect(effect: Effect): void {
    const index = this.activeEffects.indexOf(effect);
    if (index !== -1) {
      effect.onRemove?.(); // todo maybe remove from entity
      this.activeEffects.splice(index, 1);
    }
  }

  isDead(): boolean {
    return this.health <= 0;
  }

  getAttribute(attribute: AllAttributes): number {
    let value = this.getBaseValueAttribute(attribute);

    this.attributeModifiers.forEach((mod) => {
      if (mod.attribute === attribute && mod.operation === "ADD") {
        value += mod.value;
      }
    });

    this.attributeModifiers.forEach((mod) => {
      if (mod.attribute === attribute && mod.operation === "MULTIPLY") {
        value *= mod.value;
      }
    });

    return value;
  }

  protected getBaseValueAttribute(attribute: AllAttributes): number {
    switch (attribute) {
      // *** base attributes ***
      case "strength":
        return this.baseAttributes.strength;
      case "intelligence":
        return this.baseAttributes.intelligence;
      case "vitality":
        return this.baseAttributes.vitality;
      case "agility":
        return this.baseAttributes.agility;

      // *** calculated attributes ***
      case "Lifesteal":
        return 0.1;
      case "Omnivamp":
        return 0.1;
      case "Armor":
        return 10;
      case "Magic Resistance":
        return 10;
      case "Affinities???":
        return 10;
      case "Armor Penetration":
        return 5;
      case "Magic Penetration":
        return 5;
      case "Health Regen":
        return this.isBot ? 2 : this.getAttribute("vitality") / 2;
      case "Mana Regen":
        return this.getAttribute("intelligence") / 5;
      case "Blessed":
        return 0;
      case "Crit Chance":
        return 0.1;
      default:
        return 0;
    }
  }
}

export class Character extends BaseEntity {
  constructor(
    id: string,
    name: string,
    team: Team,
    maxHealth: number,
    maxMana: number,
    baseAttributes: EntityAttributes,
    public xp: number,
    public level: number,
    public statPointsAvailable: number
  ) {
    super(id, name, team, maxHealth, maxMana, baseAttributes);
    this.isBot = false;
  }
}
