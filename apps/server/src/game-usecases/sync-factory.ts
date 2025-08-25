import { Character, Enemy } from "@loot-game/game/base-entity";
import { Goblin } from "@loot-game/game/enemies/goblin";
import { AutoAttackSpell } from "@loot-game/game/spells/autoattack";
import { FireballSpell } from "@loot-game/game/spells/fireball";
import { SingleHealSpell } from "@loot-game/game/spells/Single-Heal";
import { z } from "zod";

export const syncCharacterSchema = z.object({
  id: z.string(),
  name: z.string(),
  team: z.literal("TEAM_A"),
  health: z.number(),
  mana: z.number(),
  stats: z.object({
    intelligence: z.number(),
    vitality: z.number(),
    agility: z.number(),
    strength: z.number(),
  }),
  xp: z.number(),
  level: z.number(),
  statPointsAvailable: z.number(),
});

export const syncEnemySchema = z.object({
  id: z.string(),
});

export const syncSpellSchema = z.object({
  id: z.string(),
  type: z.string(),
});

export const configSchema = z.object({
  enemies: z.string().array(),
  characters: z.string().array(),
});

export class SyncFactory {
  constructor(private readonly env: Env) {}

  async addEnemyToSync(enemy: Enemy, battleId: string) {
    const enemyData = syncEnemySchema.parse({
      id: enemy.id,
    });

    await this.env.GAME_DO_SYNC.put(
      this.getEnemyKey(battleId, enemy.id),
      JSON.stringify(enemyData)
    );
  }

  async createEnemyFromSync(enemyId: string, battleId: string): Promise<Enemy> {
    const kvData = await this.env.GAME_DO_SYNC.get(
      this.getEnemyKey(battleId, enemyId)
    );
    if (!kvData) throw new Error("No enemyData");
    const enemyData = syncEnemySchema.parse(JSON.parse(kvData));
    const type = enemyData.id.split("_")[0];
    switch (type) {
      case "goblin":
        return new Goblin(enemyId);
      default:
        throw new Error(`Unknown enemy type: ${enemyData.id}`);
    }
  }

  async addCharacterToSync(character: Character, battleId: string) {
    const characterData = syncCharacterSchema.parse({
      id: character.id,
      name: character.name,
      team: character.team,
      health: character.health,
      mana: character.mana,
      stats: {
        intelligence: character.baseAttributes.intelligence,
        vitality: character.baseAttributes.vitality,
        agility: character.baseAttributes.agility,
        strength: character.baseAttributes.strength,
      },
      xp: character.xp,
      level: character.level,
      statPointsAvailable: character.statPointsAvailable,
    });

    await this.env.GAME_DO_SYNC.put(
      this.getCharacterKey(battleId, character.id),
      JSON.stringify(characterData)
    );

    const spells = character.spells.map((spell) => {
      return syncSpellSchema.parse({
        id: spell.config.id,
        type: spell.config.type,
      });
    });

    await this.env.GAME_DO_SYNC.put(
      this.getCharacterSpellsKey(battleId, character.id),
      JSON.stringify(spells)
    );
  }

  async createCharacterFromSync(
    characterId: string,
    battleId: string
  ): Promise<Character> {
    const kvData = await this.env.GAME_DO_SYNC.get(
      this.getCharacterKey(battleId, characterId)
    );
    if (!kvData) throw new Error("No characterData");
    const characterData = syncCharacterSchema.parse(JSON.parse(kvData));
    const character = new Character(
      characterData.id,
      characterData.name,
      characterData.team,
      characterData.health,
      characterData.mana,
      characterData.stats,
      characterData.xp,
      characterData.level,
      characterData.statPointsAvailable
    );
    console.log("characterData in sync factory", characterData);

    const spells = await this.env.GAME_DO_SYNC.get(
      this.getCharacterSpellsKey(battleId, characterId)
    );
    if (!spells) throw new Error("No spellsData");
    const spellsData = syncSpellSchema.array().parse(JSON.parse(spells));
    console.log("spellsData in sync factory", spellsData);

    character.spells = spellsData.map((spell) => {
      switch (spell.type) {
        case "fireball":
          return new FireballSpell(spell.id);
        case "single-heal":
          return new SingleHealSpell(spell.id);
        case "autoattack":
          return new AutoAttackSpell(character.id);
        default:
          throw new Error(`Unknown spell type: ${spell.type}`);
      }
    });

    return character;
  }

  async addConfigToSync(
    config: z.infer<typeof configSchema>,
    battleId: string
  ) {
    await this.env.GAME_DO_SYNC.put(
      this.getConfigKey(battleId),
      JSON.stringify(config)
    );
  }

  async getConfigFromSync(
    battleId: string
  ): Promise<z.infer<typeof configSchema>> {
    const kvData = await this.env.GAME_DO_SYNC.get(this.getConfigKey(battleId));
    if (!kvData) throw new Error("No configData");
    return configSchema.parse(JSON.parse(kvData));
  }

  async getAll(battleId: string) {
    const config = await this.getConfigFromSync(battleId);
    console.log("config in sync factory", config);
    const characters = await Promise.all(
      config.characters.map((characterId) =>
        this.createCharacterFromSync(characterId, battleId)
      )
    );
    const enemies = await Promise.all(
      config.enemies.map((enemyId) =>
        this.createEnemyFromSync(enemyId, battleId)
      )
    );

    return {
      characters,
      enemies,
      config,
    };
  }

  async cleanup(battleId: string) {
    const config = await this.getConfigFromSync(battleId);

    await this.env.GAME_DO_SYNC.delete(this.getConfigKey(battleId));

    for (const enemyId of config.enemies) {
      await this.env.GAME_DO_SYNC.delete(this.getEnemyKey(battleId, enemyId));
    }
    for (const characterId of config.characters) {
      await this.env.GAME_DO_SYNC.delete(
        this.getCharacterKey(battleId, characterId)
      );
      await this.env.GAME_DO_SYNC.delete(
        this.getCharacterSpellsKey(battleId, characterId)
      );
    }
  }

  private getConfigKey(battleId: string) {
    return `${battleId}:config`;
  }

  private getEnemyKey(battleId: string, enemyId: string) {
    return `${battleId}:enemy:${enemyId}`;
  }

  private getCharacterKey(battleId: string, characterId: string) {
    return `${battleId}:character:${characterId}`;
  }

  private getCharacterSpellsKey(battleId: string, characterId: string) {
    return `${battleId}:spells:${characterId}`;
  }
}
