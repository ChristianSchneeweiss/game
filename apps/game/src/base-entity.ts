import { calculator } from "./calculator";
import type { EnemyType } from "./enemies";
import type { TimelineEvent } from "./timeline-events";
import type {
  BattleManager,
  DamageType,
  Effect,
  Entity,
  EntityAttributes,
  Loot,
  Spell,
  StatModifier,
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
  statModifiers: StatModifier[];
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
    this.statModifiers = [];
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

  getAttribute(attribute: keyof EntityAttributes): number {
    let value = this.baseAttributes[attribute];

    this.statModifiers.forEach((mod) => {
      if (mod.attribute === attribute && mod.operation === "ADD") {
        value += mod.value;
      }
    });

    this.statModifiers.forEach((mod) => {
      if (mod.attribute === attribute && mod.operation === "MULTIPLY") {
        value *= mod.value;
      }
    });

    return value;
  }

  getAction(): { spell: Spell; targets: Entity[] } {
    if (!this.battleManager) throw new Error("Battle manager not set");
    const spell = this.spells.find((s) => s.canCast(this));
    if (!spell) {
      throw new Error(`No spell found for ${this.name}`);
    }

    const targets = spell.getValidTargets(this);
    if (!targets) {
      throw new Error(
        `No valid targets found for ${this.name} to cast spell ${spell.config.id}`
      );
    }

    return { spell, targets };
  }
}

type EnemyParams = {
  id: string;
  type: EnemyType;
  name: string;
  team: Team;
  maxHealth: number;
  maxMana: number;
  baseAttributes: EntityAttributes;
  xp: number;
  loot: Loot;
};

export class Enemy extends BaseEntity {
  public type: EnemyType;
  public xp: number;
  public loot: Loot;

  constructor({
    id,
    type,
    name,
    team,
    maxHealth,
    maxMana,
    baseAttributes,
    xp,
    loot,
  }: EnemyParams) {
    super(id, name, team, maxHealth, maxMana, baseAttributes);
    this.type = type;
    this.xp = xp;
    this.loot = loot;
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
