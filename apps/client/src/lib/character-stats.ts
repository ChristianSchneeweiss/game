import { Character } from "@loot-game/game/base-entity";
import type { SpecialAttributes } from "@loot-game/game/entity-types";

export function getCharacterSpecialAttributes(
  character: Character,
): SpecialAttributes {
  // API responses contain the character's data, but lose its class methods.
  const entity = Object.assign(
    new Character(
      character.id,
      character.userId,
      character.name,
      character.team,
      character.maxHealth,
      character.maxMana,
      character.baseAttributes,
      character.xp,
      character.level,
      character.statPointsAvailable,
    ),
    character,
  );
  const keys = Object.keys(
    entity.baseSpecialAttributes,
  ) as (keyof SpecialAttributes)[];
  const attributes = { ...entity.baseSpecialAttributes };
  for (const key of keys) {
    attributes[key] = entity.getAttribute(key);
  }
  return attributes;
}
