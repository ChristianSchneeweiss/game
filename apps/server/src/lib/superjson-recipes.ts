import { BaseEntity, Character } from "@loot-game/game/base-entity";
import { BaseEnemy } from "@loot-game/game/enemies/base/base.enemy";
import { Equipment } from "@loot-game/game/items/equipment/equipment";
import type { PassiveSkill } from "@loot-game/game/passive-skills/base/passive-types";
import type { Effect, Spell } from "@loot-game/game/types";
import superjson from "superjson";

export const registerRecipes = () => {
  superjson.registerCustom<Spell, any>(
    {
      isApplicable: (data): data is Spell =>
        typeof data === "object" &&
        data !== null &&
        "config" in data &&
        "currentCooldown" in data,
      serialize: (spell) => ({ ...spell, battleManager: undefined }),
      deserialize: (data) => data,
    },
    "Spell",
  );
  // looks weird but kinda works ???
  superjson.registerCustom<Effect, any>(
    {
      isApplicable: (data): data is Effect => {
        return (
          typeof data === "object" && data !== null && "effectType" in data
        );
      },
      serialize: (effect) => {
        return { ...effect, battleManager: undefined };
      },
      deserialize: (data) => {
        return data;
      },
    },
    "Effect",
  );

  superjson.registerCustom<PassiveSkill, any>(
    {
      isApplicable: (data): data is PassiveSkill => {
        return (
          typeof data === "object" && data !== null && "passiveType" in data
        );
      },
      serialize: (passiveSkill) => {
        return { ...passiveSkill, battleManager: undefined };
      },
      deserialize: (data) => {
        return data;
      },
    },
    "PassiveSkill",
  );

  superjson.registerCustom<BaseEnemy, any>(
    {
      isApplicable: (data): data is BaseEnemy => {
        return data instanceof BaseEnemy;
      },
      serialize: (enemy) => stripEntityManager(enemy),
      deserialize: (data) => {
        return data;
      },
    },
    "BaseEnemy",
  );

  superjson.registerCustom<Equipment, any>(
    {
      isApplicable: (data): data is Equipment => {
        return data instanceof Equipment;
      },
      serialize: (equipment) => {
        return { ...equipment, battleManager: undefined };
      },
      deserialize: (data) => {
        return data;
      },
    },
    "Equipment",
  );

  superjson.registerCustom<BaseEntity, any>(
    {
      isApplicable: (data): data is BaseEntity => {
        return data instanceof BaseEntity;
      },
      serialize: (entities) => stripEntityManager(entities),
      deserialize: (data) => {
        return data;
      },
    },
    "BaseEntity[]",
  );
  superjson.registerCustom<PassiveSkill, any>(
    {
      isApplicable: (data): data is PassiveSkill => {
        return (
          typeof data === "object" && data !== null && "passiveType" in data
        );
      },
      serialize: (passiveSkill) => {
        return { ...passiveSkill, battleManager: undefined };
      },
      deserialize: (data) => {
        return data;
      },
    },
    "PassiveSkill",
  );
  superjson.registerClass(Character, {
    identifier: "Character",
    allowProps: [
      "id",
      "userId",
      "name",
      "team",
      "health",
      "maxHealth",
      "mana",
      "maxMana",
      "baseAttributes",
      "baseSpecialAttributes",
      "baseAffinities",
      "activeEffects",
      "attributeModifiers",
      "spells",
      "passiveSkills",
      "equipped",
      "isBot",
      "xp",
      "level",
      "statPointsAvailable",
    ],
  });
};

// Serialization must not detach live effects/equipment from the combat manager.
function stripEntityManager(entity: BaseEntity) {
  return {
    ...entity,
    battleManager: undefined,
    spells: entity.spells.map((spell) => ({
      ...spell,
      battleManager: undefined,
    })),
    activeEffects: entity.activeEffects.map((effect) => ({
      ...effect,
      battleManager: undefined,
    })),
    passiveSkills: entity.passiveSkills.map((passive) => ({
      ...passive,
      battleManager: undefined,
    })),
    equipped: Object.fromEntries(
      Object.entries(entity.equipped).map(([slot, equipment]) => [
        slot,
        { ...equipment, battleManager: undefined },
      ]),
    ),
  };
}
