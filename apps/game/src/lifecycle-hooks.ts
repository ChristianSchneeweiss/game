import type { Entity } from "./entity-types";
import type { TimelineEvent } from "./timeline-events";
import type { DamageType, Effect } from "./types";

export interface RoundLifecycleHooks {
  onPreRound?: () => void;
  onPostRound?: () => void;

  // todo move these?
  onApply?: () => void;
  onRemove?: () => void;
}

export interface TurnLifecycleHooks {
  onUpkeep?: () => TimelineEvent[] | null;
  onActionSelection?: () => TimelineEvent[] | null;
  onEndStep?: () => TimelineEvent[] | null;
}

export type BaseEffectHookArgs = {
  source: Entity;
  target: Entity;
};

export type DamageHookArgs = BaseEffectHookArgs & {
  damage: number;
  type: DamageType;
};

export type HealingHookArgs = BaseEffectHookArgs & {
  healing: number;
};

export type EffectHookArgs = BaseEffectHookArgs & {
  effect: Effect;
};

export type InteractionHooks = {
  beforeTakingDamage: (args: DamageHookArgs) => number;
  beforeTakingHealing: (args: HealingHookArgs) => number;
  beforeTakingEffect: (args: EffectHookArgs) => Effect | null;

  beforeDealingDamage: (args: DamageHookArgs) => number;
  beforeDealingHealing: (args: HealingHookArgs) => number;
  beforeDealingEffect: (args: EffectHookArgs) => Effect | null;
};
