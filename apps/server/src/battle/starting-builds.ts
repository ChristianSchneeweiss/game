import { Character } from "@loot-game/game/base-entity";
import { prepareTacticalEntity } from "@loot-game/game/bm";
import { BaseEnemy } from "@loot-game/game/enemies/base/base.enemy";
import { equipmentFactory } from "@loot-game/game/items/equipment/equipment-factory";
import { passiveSkillFactory } from "@loot-game/game/passive-skills/base/passive-skill.factory";
import { createSpellFromType } from "@loot-game/game/spells/base/spell-from-type";
import cloneDeep from "lodash/cloneDeep";
import { createEnemyFromType } from "../game-usecases/enemy-factory";

/** Capture before joining BM: equipment and passives must be applied exactly once. */
export function captureStartingBuilds(
  entities: (Character | BaseEnemy)[],
  tactical = false,
) {
  if (tactical) entities.forEach(prepareTacticalEntity);
  return cloneDeep(
    entities.map((entity) => ({
      id: entity.id,
      name: entity.name,
      team: entity.team,
      health: entity.health,
      maxHealth: entity.maxHealth,
      mana: entity.mana,
      maxMana: entity.maxMana,
      baseAttributes: entity.baseAttributes,
      baseSpecialAttributes: entity.baseSpecialAttributes,
      baseAffinities: entity.baseAffinities,
      weaponAttackProfile: entity.weaponAttackProfile,
      character:
        entity instanceof Character
          ? {
              userId: entity.userId,
              xp: entity.xp,
              level: entity.level,
              statPointsAvailable: entity.statPointsAvailable,
            }
          : undefined,
      enemy:
        entity instanceof BaseEnemy
          ? { type: entity.type, xp: entity.xp, loot: entity.loot }
          : undefined,
      spells: entity.spells.map((spell) => ({
        config: spell.config,
        currentCooldown: spell.currentCooldown,
      })),
      passives: entity.passiveSkills.map((passive) => ({
        id: passive.id,
        type: passive.passiveType,
      })),
      equipment: Object.values(entity.equipped).map((item) => ({
        id: item.id,
        type: item.itemType,
        modifiers: item.modifiers,
      })),
    })),
  );
}

export type StartingBuilds = ReturnType<typeof captureStartingBuilds>;

/** Restore real rule implementations from the frozen build, without reading mutable roster rows. */
export function restoreStartingBuilds(builds: StartingBuilds) {
  return cloneDeep(builds).map((build) => {
    const character = build.character;
    const entity = character
      ? new Character(
          build.id,
          character.userId,
          build.name,
          build.team,
          build.maxHealth,
          build.maxMana,
          build.baseAttributes,
          character.xp,
          character.level,
          character.statPointsAvailable,
        )
      : createEnemyFromType(build.enemy!.type, build.id);
    Object.assign(entity, {
      name: build.name,
      team: build.team,
      health: build.health,
      maxHealth: build.maxHealth,
      mana: build.mana,
      maxMana: build.maxMana,
      baseAttributes: build.baseAttributes,
      baseSpecialAttributes: build.baseSpecialAttributes,
      baseAffinities: build.baseAffinities,
      weaponAttackProfile: build.weaponAttackProfile,
    });
    if (entity instanceof BaseEnemy && build.enemy) {
      entity.xp = build.enemy.xp;
      entity.loot = build.enemy.loot;
    }
    entity.spells = build.spells.map(({ config, currentCooldown }) => {
      const spell = createSpellFromType(config.id, config.type);
      spell.config = config;
      spell.currentCooldown = currentCooldown;
      return spell;
    });
    entity.passiveSkills = build.passives.map(({ id, type }) =>
      passiveSkillFactory(type, id, entity),
    );
    entity.equipped = {};
    for (const { id, type, modifiers } of build.equipment) {
      const item = equipmentFactory(type, id, entity);
      item.modifiers = modifiers;
      entity.equipped[item.equipmentSlot] = item;
    }
    return entity;
  });
}
