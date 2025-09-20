import { nanoid } from "nanoid";
import { BaseEnemy } from "./base/base.enemy";

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
      },
      spells: ["vital-strike", "festering-blow", "basic-attack"],
    });
  }
}
