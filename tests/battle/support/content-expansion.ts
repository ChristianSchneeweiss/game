import { Character } from "../../../apps/game/src/base-entity";
import { BM } from "../../../apps/game/src/bm";
import { itemFactory } from "../../../apps/game/src/items/equipment/item-factory";
import type { ItemType } from "../../../apps/game/src/items/item-types";
import { passiveSkillFactory } from "../../../apps/game/src/passive-skills/base/passive-skill.factory";
import type { PassiveType } from "../../../apps/game/src/passive-skills/base/passive-types";
import { createSpellFromType } from "../../../apps/game/src/spells/base/spell-from-type";

export const newItems = [
  "ashen-falchion",
  "tideglass-staff",
  "stormfang-blade",
  "hollow-scepter",
  "emberguard-mail",
  "tidewoven-robes",
  "stormrunner-leathers",
  "gravewarden-plate",
] as const satisfies readonly ItemType[];
export const newPassives = [
  "predators-focus",
  "fleet-footed",
  "arcane-barrier",
  "last-bastion",
  "merciful-light",
  "executioner",
] as const satisfies readonly PassiveType[];

export function contentHero(
  passives: PassiveType[] = [],
  items: ItemType[] = [],
) {
  const hero = new Character(
    "hero",
    "owner",
    "Hero",
    "TEAM_A",
    1000,
    1000,
    { strength: 20, intelligence: 20, vitality: 20, agility: 30 },
    0,
    1,
    0,
  );
  hero.spells = [createSpellFromType("hero-attack", "basic-attack")];
  hero.passiveSkills = passives.map((type) =>
    passiveSkillFactory(type, `hero-${type}`, hero),
  );
  for (const type of items) {
    const item = itemFactory(type, `hero-${type}`, hero);
    hero.equipped[item.equipmentSlot] = item;
  }
  return hero;
}

export function contentBattle(
  passives: PassiveType[] = [],
  items: ItemType[] = [],
) {
  const hero = contentHero(passives, items);
  const enemy = new Character(
    "enemy",
    "enemy-owner",
    "Enemy",
    "TEAM_B",
    1000,
    1000,
    { strength: 20, intelligence: 20, vitality: 20, agility: 10 },
    0,
    1,
    0,
  );
  enemy.spells = [createSpellFromType("enemy-attack", "basic-attack")];
  const bm = new BM([hero, enemy], "content-expansion", {
    rulesVersion: 2,
    battlefield: {
      width: 8,
      height: 5,
      blocked: [],
      layoutVersion: "content-test",
    },
    positions: { hero: { x: 1, y: 1 }, enemy: { x: 4, y: 1 } },
  });
  bm.start();
  bm.preTurn();
  return { hero, enemy, bm, spell: hero.spells[0]! };
}
