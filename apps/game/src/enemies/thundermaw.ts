import { nanoid } from "nanoid";
import { BaseEnemy } from "./base/base.enemy";

export class Thundermaw extends BaseEnemy {
  constructor(id?: string) {
    const realId = id ?? `thundermaw-${nanoid()}`;
    super({
      id: realId,
      type: "thundermaw",
      name: "Thundermaw",
      team: "TEAM_B",
      maxHealth: 280,
      maxMana: 200,
      baseAttributes: {
        intelligence: 40,
        vitality: 22,
        agility: 14,
        strength: 20,
      },
      xp: 100,
      loot: {
        items: [],
        gold: 50,
      },
      spells: ["volt-lash", "lightning-surge", "basic-attack"],
    });
  }
}
