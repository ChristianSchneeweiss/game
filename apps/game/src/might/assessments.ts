import type { EnemyType } from "../enemies/base/enemy-types";
import type { ItemType } from "../items/item-types";
import type { PassiveType } from "../passive-skills/base/passive-types";
import type { SpellType } from "../spells/base/spell-types";
import type { MightAssessment } from "./might";
import { enemyAssessments } from "./enemy-assessments";
import {
  itemAssessments,
  passiveAssessments,
} from "./equipment-and-passive-assessments";
import { spellAssessments } from "./spell-assessments";

/** One provisional assessment per current definition, using developed-build v2 references.
 * See docs/might-assessments.md. Future missing assessments remain Unrated;
 * old runtime tiers never supply missing values.
 */
export const mightAssessments: {
  spells: Partial<Record<SpellType, MightAssessment>>;
  items: Partial<Record<ItemType, MightAssessment>>;
  passives: Partial<Record<PassiveType, MightAssessment>>;
  enemies: Partial<Record<EnemyType, MightAssessment>>;
} = {
  spells: spellAssessments,
  items: itemAssessments,
  passives: passiveAssessments,
  enemies: enemyAssessments,
};
