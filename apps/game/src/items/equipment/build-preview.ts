import { Character } from "../../base-entity";
import type { Equipped } from "../../entity-types";

/** A fresh build's base + equipment attributes, without running battle hooks or mutating its roster entity. */
export function equipmentBuildPreview(
  character: Character,
  equipped: Equipped = character.equipped,
) {
  const preview = Object.assign(
    new Character(
      character.id,
      character.userId,
      character.name,
      character.team,
      character.maxHealth,
      character.maxMana,
      { ...character.baseAttributes },
      character.xp,
      character.level,
      character.statPointsAvailable,
    ),
    character,
    {
      equipped: { ...equipped },
      attributeModifiers: Object.values(equipped).flatMap(
        (item) => item.modifiers,
      ),
    },
  );
  return preview;
}
