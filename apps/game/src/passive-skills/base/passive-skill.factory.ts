import type { Entity } from "../../types";
import { ArmorUpPassive } from "../armor-up.passive";
import { MirrorPassive } from "../mirror";
import type { PassiveType } from "./passive-types";

export const passiveSkillFactory = (
  passiveType: PassiveType,
  id: string,
  entity: Entity
) => {
  switch (passiveType) {
    case "armor-up":
      return new ArmorUpPassive({ holder: entity, id });
    case "mirror":
      return new MirrorPassive({ holder: entity, id });
    default:
      throw new Error(`Unknown passive type: ${passiveType}`);
  }
};
