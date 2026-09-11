import type { Character } from "@loot-game/game/base-entity";

export const spellSlots = [1, 2, 3, 4] as const;

export function slottedSpells(character: Character) {
  return character.spells.filter(
    (spell) => spell.config.type !== "basic-attack",
  );
}

export function emptySpellSlots(character: Character) {
  return Math.max(0, spellSlots.length - slottedSpells(character).length);
}
