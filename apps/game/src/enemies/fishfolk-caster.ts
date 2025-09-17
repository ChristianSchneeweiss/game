import { nanoid } from "nanoid";
import { BaseEnemy } from "./base/base.enemy";

export class FishfolkCaster extends BaseEnemy {
  constructor(id?: string) {
    const realId = id ?? `fishfolk-caster-${nanoid()}`;
    super({
      id: realId,
      type: "fishfolk-caster",
      name: "Fishfolk Caster",
      team: "TEAM_B",
      maxHealth: 40,
      maxMana: 60,
      baseAttributes: {
        intelligence: 12,
        vitality: 8,
        agility: 10,
        strength: 6,
      },
      xp: 25,
      loot: {
        items: [],
        gold: 25,
      },
      spells: ["aqua-wave", "basic-attack"],
    });
  }
}
