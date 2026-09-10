import type { BattleManager } from "../../battle-types";
import type { Entity } from "../../entity-types";
import type {
  DamageHookArgs,
  HealingHookArgs,
  EffectHookArgs,
} from "../../lifecycle-hooks";
import type { TimelineEvent } from "../../timeline-events";
import type { Effect, EffectOrigin, Tier } from "../../types";
import type { PassiveSkill, PassiveType } from "./passive-types";

export abstract class BasePassive implements PassiveSkill {
  id: string;
  effectType = "PASSIVE" as const;
  duration = 10_000; // high number. infinity breaks stuff
  clock = "battle" as const;
  preventsAction = false;
  sourceId: string;
  targetId: string;
  origin: EffectOrigin;
  battleManager: BattleManager;
  passiveType: PassiveType;
  tier: Tier;

  constructor({
    holder,
    id,
    passiveType,
    tier,
  }: {
    id: string;
    holder: Entity;
    passiveType: PassiveType;
    tier: Tier;
  }) {
    this.id = id;
    this.sourceId = holder.id;
    this.targetId = holder.id;
    this.origin = { kind: "passive", id };
    this.battleManager = undefined!;
    this.passiveType = passiveType;
    this.tier = tier;
  }

  getDescription(): string {
    return "";
  }

  onApply(): void {
    // do nothing
  }

  onPreRound(): void {
    // do nothing
  }

  onPostRound(): void {
    // do nothing
  }

  onRemove(): void {
    // do nothing
  }

  onActionSelection(): TimelineEvent[] | null {
    return null;
  }

  onUpkeep(): TimelineEvent[] | null {
    return null;
  }

  onEndStep(): TimelineEvent[] | null {
    return null;
  }

  beforeTakingDamage(args: DamageHookArgs): number {
    return args.damage;
  }

  beforeTakingHealing(args: HealingHookArgs): number {
    return args.healing;
  }

  beforeTakingEffect(args: EffectHookArgs): Effect | null {
    return args.effect;
  }

  beforeDealingDamage(args: DamageHookArgs): number {
    return args.damage;
  }

  beforeDealingHealing(args: HealingHookArgs): number {
    return args.healing;
  }

  beforeDealingEffect(args: EffectHookArgs): Effect | null {
    return args.effect;
  }

  protected getHolder(): Entity {
    const holder = this.battleManager.getEntityById(this.sourceId);
    if (!holder) throw new Error(`Holder not found ${this.sourceId}`);
    return holder;
  }
}
