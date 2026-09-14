import type { EnemyType } from "../enemies/base/enemy-types";
import type { ItemType } from "../items/item-types";
import type { PassiveType } from "../passive-skills/base/passive-types";
import type { SpellType } from "../spells/base/spell-types";
import type { MightAssessment } from "./might";

/** Authored once per definition. Publish only after family reference calibration.
 * Reference IDs link to the conditions/rationale recorded with each assessment.
 * See docs/library.md. Old runtime tiers never supply missing assessments.
 */
export const mightAssessments: {
  spells: Partial<Record<SpellType, MightAssessment>>;
  items: Partial<Record<ItemType, MightAssessment>>;
  passives: Partial<Record<PassiveType, MightAssessment>>;
  enemies: Partial<Record<EnemyType, MightAssessment>>;
} = { spells: {}, items: {}, passives: {}, enemies: {} };
