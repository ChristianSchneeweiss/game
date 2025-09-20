import { createSpellFromType } from "../spells/base/spell-from-type";
import type { SpellType } from "../spells/base/spell-types";
import type { LootEntity, Tier } from "../types";

export const defaultDropRate = (tier: Tier) => {
  switch (tier) {
    case "E":
      return 0.2;
    case "D":
      return 0.1;
    case "C":
      return 0.06;
    case "B":
      return 0.03;
    case "A":
      return 0.01;
    case "S":
      return 0.003;
  }
};

export const defaultSpellDropRate = (spells: SpellType[]): LootEntity[] => {
  return spells.map((type) => {
    const spell = createSpellFromType("default", type);
    return {
      type: "SPELL",
      data: {
        spellType: type,
      },
      dropRate: defaultDropRate(spell.config.tier),
    };
  });
};
