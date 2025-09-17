import { BaseEntity, Character } from "@loot-game/game/base-entity";
import { BaseEnemy } from "@loot-game/game/enemies/base/base.enemy";
import type { PassiveSkill } from "@loot-game/game/passive-skills/base/passive-types";
import type { Effect } from "@loot-game/game/types";
import superjson from "superjson";

export const registerRecipes = () => {
  // looks weird but kinda works ???
  superjson.registerCustom<Effect, any>(
    {
      isApplicable: (data): data is Effect => {
        return (
          typeof data === "object" && data !== null && "effectType" in data
        );
      },
      serialize: (effect) => {
        effect.battleManager = undefined!;
        return effect;
      },
      deserialize: (data) => {
        return data;
      },
    },
    "Effect"
  );

  superjson.registerCustom<PassiveSkill, any>(
    {
      isApplicable: (data): data is PassiveSkill => {
        return (
          typeof data === "object" && data !== null && "passiveType" in data
        );
      },
      serialize: (passiveSkill) => {
        passiveSkill.battleManager = undefined!;
        return passiveSkill;
      },
      deserialize: (data) => {
        return data;
      },
    },
    "PassiveSkill"
  );

  superjson.registerCustom<BaseEnemy, any>(
    {
      isApplicable: (data): data is BaseEnemy => {
        return data instanceof BaseEnemy;
      },
      serialize: (enemy) => {
        enemy.battleManager = undefined!;
        enemy.passiveSkills.forEach((passive) => {
          passive.battleManager = undefined!;
        });
        return enemy;
      },
      deserialize: (data) => {
        return data;
      },
    },
    "BaseEnemy"
  );

  superjson.registerClass(Character, { identifier: "Character" });
  superjson.registerClass(BaseEntity, { identifier: "BaseEntity" });
};
