import { nanoid } from "nanoid";
import { itemFactory } from "../items/equipment/item-factory";
import type { ItemType } from "../items/item-types";
import { passiveSkillFactory } from "../passive-skills/base/passive-skill.factory";
import type { PassiveType } from "../passive-skills/base/passive-types";
import { createSpellFromType } from "../spells/base/spell-from-type";
import type { SpellType } from "../spells/base/spell-types";
import type { LootEntity, Tier } from "../types";
import { FakeEntity } from "./fake-entity";

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

export const defaultPassiveDropRate = (
  passives: PassiveType[],
): LootEntity[] => {
  const fake = new FakeEntity();
  return passives.map((passive) => {
    const p = passiveSkillFactory(passive, nanoid(), fake);
    return {
      type: "PASSIVE",
      data: { passiveType: p.passiveType },
      dropRate: defaultDropRate(p.tier),
    };
  });
};

export const defaultEquipmentDropRate = (
  equipments: ItemType[],
): LootEntity[] => {
  const fake = new FakeEntity();
  return equipments.map((equipment) => {
    const e = itemFactory(equipment, nanoid(), fake);
    return {
      type: "ITEM",
      data: { itemType: equipment },
      dropRate: defaultDropRate(e.tier),
    };
  });
};
