import type { BattleManager } from "../../battle-types";
import type { Entity, Equipped } from "../../entity-types";
import type {
  DamageHookArgs,
  EffectHookArgs,
  HealingHookArgs,
  InteractionHooks,
  RoundLifecycleHooks,
  TurnLifecycleHooks,
} from "../../lifecycle-hooks";
import type { TimelineEvent } from "../../timeline-events";
import type { AttributeModifier, Effect, Tier } from "../../types";
import { BaseItem } from "../base.item";
import type { ItemType } from "../item-types";

export type EquipmentSlot = keyof Equipped;

export interface EquipmentParams {
  id: string;
  name: string;
  description: string;
  equipmentSlot: EquipmentSlot;
  modifiers?: AttributeModifier[];
  holderId: string;
  itemType: ItemType;
  tier: Tier;
}

export class Equipment
  extends BaseItem
  implements InteractionHooks, RoundLifecycleHooks, TurnLifecycleHooks
{
  equipmentSlot: EquipmentSlot;
  modifiers: AttributeModifier[];
  holderId: string;
  battleManager: BattleManager;

  constructor({
    id,
    name,
    description,
    equipmentSlot,
    modifiers,
    holderId,
    itemType,
    tier,
  }: EquipmentParams) {
    super(id, name, description, tier, itemType);
    this.equipmentSlot = equipmentSlot;
    this.modifiers = modifiers ?? [];
    this.holderId = holderId;
    this.battleManager = undefined!;
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

  onPreRound(): void {
    // TODO: implement
  }

  onPostRound(): void {
    // TODO: implement
  }

  onApply(): void {
    this.modifiers.forEach((modifier) => {
      this.getHolder().attributeModifiers.push(modifier);
    });
  }

  onRemove(): void {
    // TODO: implement
  }

  onUpkeep(): TimelineEvent[] | null {
    // TODO: implement
    return null;
  }

  onActionSelection(): TimelineEvent[] | null {
    // TODO: implement
    return null;
  }

  onEndStep(): TimelineEvent[] | null {
    // TODO: implement
    return null;
  }

  protected getHolder(): Entity {
    const holder = this.battleManager.getEntityById(this.holderId);
    if (!holder) throw new Error(`Holder not found ${this.holderId}`);
    return holder;
  }
}
