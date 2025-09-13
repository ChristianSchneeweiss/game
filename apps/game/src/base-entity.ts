import superjson from "superjson";
import { calculator } from "./calculator";
import type { TimelineEvent } from "./timeline-events";
import type {
  AllAttributeKeys,
  AttributeModifier,
  BattleManager,
  DamageType,
  Effect,
  Entity,
  EntityAttributes,
  SpecialAttributes,
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
  baseSpecialAttributes: SpecialAttributes;
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
    this.baseSpecialAttributes = {
      lifesteal: 0,
      omnivamp: 0,
      armor: 0,
      magicResistance: 0,
      affinities: 0,
      armorPenetration: 0,
      magicPenetration: 0,
      healthRegen: 0,
      manaRegen: 0,
      blessed: 0,
      critChance: 0,
    };
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

  getAttribute(attribute: AllAttributeKeys): number {
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

  protected getBaseValueAttribute(attribute: AllAttributeKeys): number {
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
      case "lifesteal":
        return this.baseSpecialAttributes.lifesteal;
      case "omnivamp":
        return this.baseSpecialAttributes.omnivamp;
      case "armor":
        return this.baseSpecialAttributes.armor;
      case "magicResistance":
        return this.baseSpecialAttributes.magicResistance;
      case "affinities":
        return this.baseSpecialAttributes.affinities;
      case "armorPenetration":
        return this.baseSpecialAttributes.armorPenetration;
      case "magicPenetration":
        return this.baseSpecialAttributes.magicPenetration;
      case "healthRegen":
        return (
          this.baseSpecialAttributes.healthRegen +
          (this.isBot ? 2 : this.getAttribute("vitality") / 2)
        );
      case "manaRegen":
        return (
          this.baseSpecialAttributes.manaRegen +
          this.getAttribute("intelligence") / 5
        );
      case "blessed":
        return this.baseSpecialAttributes.blessed;
      case "critChance":
        return this.baseSpecialAttributes.critChance;
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
