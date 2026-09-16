import { getItemDefinition } from "../items/catalog";
import type { ItemType } from "../items/item-types";
import { mightAssessments } from "../might/assessments";
import { assessMight, type MightAssessment } from "../might/might";
import type { PassiveType } from "../passive-skills/base/passive-types";
import type { SpellType } from "../spells/base/spell-types";
import type { LootEntity, Tier } from "../types";

export const defaultDropRate = (tier: Tier) => {
  switch (tier) {
    case "E":
      return 0.1;
    case "D":
      return 0.07;
    case "C":
      return 0.04;
    case "B":
      return 0.02;
    case "A":
      return 0.01;
    case "S":
      return 0.003;
  }
};

/** Acquisition uses the same assessment as the Library, never a legacy label. */
function assessedDropRate(
  content: string,
  assessment: MightAssessment | undefined,
) {
  const { tier } = assessMight(content, assessment);
  // Unrated content remains visible in the Library but cannot drop by default.
  return tier === null ? 0 : defaultDropRate(tier);
}

export const defaultSpellDropRate = (spells: SpellType[]): LootEntity[] => {
  return spells.map((type) => ({
    type: "SPELL",
    data: { spellType: type },
    dropRate: assessedDropRate(`spells:${type}`, mightAssessments.spells[type]),
  }));
};

export const defaultPassiveDropRate = (
  passives: PassiveType[],
): LootEntity[] => {
  return passives.map((type) => ({
    type: "PASSIVE",
    data: { passiveType: type },
    dropRate: assessedDropRate(`passives:${type}`, mightAssessments.passives[type]),
  }));
};

export const defaultItemDropRate = (items: ItemType[]): LootEntity[] => {
  return items.map((itemType) => {
    const definition = getItemDefinition(itemType);
    return {
      type: "ITEM",
      data: { itemType },
      dropRate:
        definition.kind === "equipment"
          ? assessedDropRate(
              `items:${itemType}`,
              mightAssessments.items[definition.type],
            )
          : defaultDropRate(definition.tier),
    };
  });
};
