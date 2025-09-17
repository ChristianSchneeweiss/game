import type { BattleManager, DamageType, Effect, Entity } from "../../types";
import type { PassiveSkill, PassiveType } from "./passive-types";

export abstract class BasePassive implements PassiveSkill {
  id: string;
  effectType = "PASSIVE" as const;
  duration = 10_000; // high number. infinity breaks stuff
  sourceId: string;
  targetId: string;
  spellSourceId: string;
  battleManager: BattleManager;
  passiveType: PassiveType;

  constructor({
    holder,
    id,
    passiveType,
  }: {
    id: string;
    holder: Entity;
    passiveType: PassiveType;
  }) {
    this.id = id;
    this.sourceId = holder.id;
    this.targetId = holder.id;
    this.spellSourceId = holder.id;
    this.battleManager = undefined!;
    this.passiveType = passiveType;
  }

  getDescription(): string {
    return "";
  }

  beforeTakingDamage(args: {
    damage: number;
    type: DamageType;
    source: Entity;
    target: Entity;
  }): number {
    return args.damage;
  }

  beforeTakingHealing(args: {
    healing: number;
    source: Entity;
    target: Entity;
  }): number {
    return args.healing;
  }

  beforeTakingEffect(args: {
    effect: Effect;
    source: Entity;
    target: Entity;
  }): Effect | null {
    return args.effect;
  }

  beforeDealingDamage(args: {
    damage: number;
    type: DamageType;
    source: Entity;
    target: Entity;
  }): number {
    return args.damage;
  }

  beforeDealingHealing(args: {
    healing: number;
    source: Entity;
    target: Entity;
  }): number {
    return args.healing;
  }

  beforeDealingEffect(args: {
    effect: Effect;
    source: Entity;
    target: Entity;
  }): Effect | null {
    return args.effect;
  }

  protected getHolder(): Entity {
    const holder = this.battleManager.getEntityById(this.sourceId);
    if (!holder) throw new Error(`Holder not found ${this.sourceId}`);
    return holder;
  }
}
