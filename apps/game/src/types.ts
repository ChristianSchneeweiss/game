import z from "zod";
import type { AllAttributeKeys, Entity } from "./entity-types";
import type {
  InteractionHooks,
  RoundLifecycleHooks,
  TurnLifecycleHooks,
} from "./lifecycle-hooks";
import type { BattleManager } from "./battle-types";
import { SpellTypeSchema, type SpellType } from "./spells/base/spell-types";
import type { SpellCastEvent } from "./timeline-events";

export type DamageType = "PHYSICAL" | "MAGICAL";

export type EffectType =
  | "BUFF"
  | "DEBUFF"
  | "DOT"
  | "HOT"
  | "CURSE"
  | "STUN"
  | "CONTROL"
  | "SHIELD"
  | "PASSIVE";

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
  extends RoundLifecycleHooks,
    TurnLifecycleHooks,
    InteractionHooks {
  id: string;
  effectType: EffectType;
  duration: number;
  sourceId: string;
  targetId: string;
  spellSourceId: string;
  battleManager: BattleManager;

  getDescription(): string;
}

export interface SpellDescription {
  text: string;
  targetType: TargetType;
  cooldown: number;
  manaCost: number;
}

export interface Spell
  extends Pick<RoundLifecycleHooks, "onPreRound" | "onPostRound">,
    TurnLifecycleHooks {
  config: SpellConfig;
  currentCooldown: number;
  battleManager: BattleManager;

  canCast(caster: Entity): boolean;
  getValidTargets(caster: Entity): Entity[];
  cast(caster: Entity, targets: Entity[]): SpellCastEvent | null;
  description(caster: Entity): SpellDescription;

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
}

export interface Loot {
  items: LootEntity[];
  gold: number;
}

export const LootEntitySchema = z.object({
  type: z.enum(["SPELL"]),
  dropRate: z.number(),
  data: z.object({
    spellType: SpellTypeSchema,
  }),
});

export type LootEntity = z.infer<typeof LootEntitySchema>;
