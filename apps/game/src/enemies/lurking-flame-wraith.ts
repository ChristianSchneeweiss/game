import { nanoid } from "nanoid";
import { BaseEnemy } from "./base/base.enemy";
import {
  defaultItemDropRate,
  defaultPassiveDropRate,
  defaultSpellDropRate,
} from "../utils/loot";

export class LurkingFlameWraith extends BaseEnemy {
  constructor(id?: string) {
    const realId = id ?? `lurking-flame-wraith-${nanoid()}`;
    super({
      id: realId,
      type: "lurking-flame-wraith",
      name: "Lurking Flame Wraith",
      team: "TEAM_B",
      maxHealth: 60,
      maxMana: 70,
      baseAttributes: {
        intelligence: 14,
        vitality: 6,
        agility: 11,
        strength: 4,
      },
      xp: 30,
      loot: {
        items: [
          ...defaultItemDropRate(["emberguard-mail"]),
          ...defaultPassiveDropRate(["arcane-barrier"]),
          ...defaultSpellDropRate(["cinderbrand", "splinter-shot"]),
        ],
        gold: 35,
      },
      spells: ["cinderbrand", "splinter-shot", "basic-attack"],
    });
  }
}
