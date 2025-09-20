import { nanoid } from "nanoid";
import { BaseEnemy } from "./base/base.enemy";

export class RottingCorpse extends BaseEnemy {
  constructor(id?: string) {
    const realId = id ?? `rotting-corpse-${nanoid()}`;
    super({
      id: realId,
      type: "rotting-corpse",
      name: "Rotting Corpse",
      team: "TEAM_B",
      maxHealth: 80,
      maxMana: 0,
      baseAttributes: {
        intelligence: 2,
        vitality: 8,
        agility: 6,
        strength: 14,
      },
      xp: 20,
      loot: {
        gold: 20,
      },
      spells: ["festering-blow", "basic-attack"],
    });
  }
}
