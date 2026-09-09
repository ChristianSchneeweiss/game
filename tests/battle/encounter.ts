import { Character } from "../../apps/game/src/base-entity";
import { BM } from "../../apps/game/src/bm";
import { StormHatchling } from "../../apps/game/src/enemies/storm-hatchling";
import { createSpellFromType } from "../../apps/game/src/spells/base/spell-from-type";
import type { Entity } from "../../apps/game/src/entity-types";
import type { SpellType } from "../../apps/game/src/spells/base/spell-types";

export function encounter({ enemies = 4, health = 160 } = {}) {
  const characters = ["Aldric", "Seren"].map((name, index) => {
    const character = new Character(
      `hero-${index}`,
      "fixture-owner",
      name,
      "TEAM_A",
      health,
      150,
      { intelligence: 20, vitality: 16, strength: 18, agility: 25 - index },
      0,
      5,
      0,
    );
    const types: SpellType[] =
      index === 0
        ? [
            "cinder-wisp",
            "stone-bark",
            "festering-blow",
            "single-heal",
            "basic-attack",
          ]
        : [
            "single-heal",
            "natures-embrace",
            "lightning-surge",
            "cinderbrand",
            "basic-attack",
          ];
    character.spells = types.map((type) =>
      createSpellFromType(`${character.id}-${type}`, type),
    );
    return character;
  });
  const foes = Array.from({ length: enemies }, (_, index) => {
    const enemy = new StormHatchling(`hatchling-${index}`);
    enemy.name = `Hatchling ${index + 1}`;
    return enemy;
  });
  const bm = new BM([...characters, ...foes], "prototype-fixture-v1");
  bm.start();
  return bm;
}

/** Serializable initial snapshots, with no class reconstruction or account data. */
export function snapshot(entities: Entity[]) {
  return entities.map((e) => ({
    id: e.id,
    name: e.name,
    team: e.team,
    health: e.health,
    maxHealth: e.maxHealth,
    mana: e.mana,
    maxMana: e.maxMana,
    isBot: e.isBot,
    ...("userId" in e ? { userId: "fixture-owner" } : {}),
    baseAttributes: { ...e.baseAttributes },
    baseSpecialAttributes: { ...e.baseSpecialAttributes },
    baseAffinities: { ...e.baseAffinities },
    attributeModifiers: [],
    equipped: {},
    spells: e.spells.map((s) => ({
      config: { ...s.config },
      currentCooldown: s.currentCooldown,
    })),
    activeEffects: [],
    passiveSkills: [],
  })) as unknown as Entity[];
}
