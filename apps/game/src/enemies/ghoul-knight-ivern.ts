import { nanoid } from "nanoid";
import { BaseEnemy } from "./base/base.enemy";
import { defaultSpellDropRate } from "../utils/loot";

export class GhoulKnightIvern extends BaseEnemy {
  constructor(id?: string) {
    const realId = id ?? `ghoul-knight-ivern-${nanoid()}`;
    super({
      id: realId,
      type: "ghoul-knight-ivern",
      name: "Ghoul Knight Ivern",
      team: "TEAM_B",
      maxHealth: 150,
      maxMana: 20,
      baseAttributes: {
        intelligence: 4,
        vitality: 15,
        agility: 10,
        strength: 16,
      },
      xp: 50,
      loot: {
        gold: 40,
        items: [
          ...defaultSpellDropRate(["vital-strike", "festering-blow"]),
          {
            type: "ITEM",
            data: { itemType: "gravewarden-plate" },
            dropRate: 1,
          },
          {
            type: "PASSIVE",
            data: { passiveType: "last-bastion" },
            dropRate: 0.25,
          },
        ],
      },
      spells: ["vital-strike", "festering-blow", "basic-attack"],
    });
  }
}
