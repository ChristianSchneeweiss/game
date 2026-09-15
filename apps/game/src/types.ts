import z from "zod";
import type { BattleManager } from "./battle-types";
import type { AllAttributeKeys, Entity } from "./entity-types";
import { ItemTypeSchema } from "./items/item-types";
import { ItemQuantitySchema } from "./items/quantity";
import type {
  InteractionHooks,
  RoundLifecycleHooks,
  TurnLifecycleHooks,
} from "./lifecycle-hooks";
import { PassiveTypeSchema } from "./passive-skills/base/passive-types";
import { SpellTypeSchema, type SpellType } from "./spells/base/spell-types";
import type { SpellCastEvent } from "./timeline-events";
import type { CastSelection, Targeting } from "./tactical/types";

export type DamageType = "PHYSICAL" | "MAGICAL";
export type DamageCause = "direct" | "periodic" | "reflection";
export type DamageOptions = { cause?: DamageCause; ignoreDefense?: number };
export type EffectOrigin = { kind: "spell" | "effect" | "passive"; id: string };

export type Tier = "E" | "D" | "C" | "B" | "A" | "S";

export type EffectType =
  | "BUFF"
  | "DEBUFF"
  | "DOT"
  | "HOT"
  | "CURSE"
  | "STUN"
  | "CHARGE"
  | "CONTROL"
  | "SHIELD"
  | "PASSIVE";

export type EffectClock = "turn" | "round" | "battle";

export type ModifierOperation = "ADD" | "MULTIPLY";

export type TargetType = {
  enemies: number;
  allies: number;
};

export interface AttributeModifier {
  id: string;
  attribute: AllAttributeKeys;
  value: number;
  operation: ModifierOperation;
}

export interface Effect
  extends RoundLifecycleHooks, TurnLifecycleHooks, InteractionHooks {
  id: string;
  effectType: EffectType;
  duration: number;
  clock: EffectClock;
  preventsAction: boolean;
  sourceId: string;
  targetId: string;
  origin: EffectOrigin;
  battleManager: BattleManager;

  getDescription(): string;
}

export interface SpellDescription {
  text: string;
  targetType: TargetType;
  cooldown: number;
  manaCost: number;
  targeting?: Targeting;
}

export interface Spell
  extends
    Pick<RoundLifecycleHooks, "onPreRound" | "onPostRound">,
    TurnLifecycleHooks {
  config: SpellConfig;
  currentCooldown: number;
  battleManager: BattleManager;

  canCast(caster: Entity): boolean;
  getValidTargets(caster: Entity): Entity[];
  cast(caster: Entity, targets: Entity[]): SpellCastEvent[] | null;
  castSpatial?(
    caster: Entity,
    selection: CastSelection,
  ): SpellCastEvent[] | null;
  description(caster: Entity): SpellDescription;
  /** Read-only AI heuristic; null identifies a spell without direct damage. */
  estimateDamage?(caster: Entity, target: Entity): number | null;

  /** allows to override the target type for a spell. So we can have dynamic target types based on stuff */
  getTargetType(): TargetType;
}

export interface SpellConfig {
  id: string;
  type: SpellType;
  name: string;
  manaCost: number;
  cooldown: number;
  targetType: TargetType;
  tier: Tier;
  targeting?: Targeting;
}

export interface Loot {
  items: LootEntity[];
  gold: number;
}

const SpellLootEntitySchema = z.object({
  type: z.literal("SPELL"),
  dropRate: z.number().finite().min(0).max(1),
  data: z.object({
    spellType: SpellTypeSchema,
  }),
});

const ItemLootEntitySchema = z.object({
  type: z.literal("ITEM"),
  dropRate: z.number().finite().min(0).max(1),
  data: z.object({
    itemType: ItemTypeSchema,
    quantity: ItemQuantitySchema.optional(),
  }),
});

const PassiveLootEntitySchema = z.object({
  type: z.literal("PASSIVE"),
  dropRate: z.number().finite().min(0).max(1),
  data: z.object({
    passiveType: PassiveTypeSchema,
  }),
});

export const LootEntitySchema = z.union([
  SpellLootEntitySchema,
  ItemLootEntitySchema,
  PassiveLootEntitySchema,
]);

export type LootEntity = z.infer<typeof LootEntitySchema>;
