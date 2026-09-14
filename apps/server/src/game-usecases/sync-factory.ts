import { Character } from "@loot-game/game/base-entity";
import type { BattleManager } from "@loot-game/game/battle-types";
import { BaseEnemy } from "@loot-game/game/enemies/base/base.enemy";
import type { GridSetup } from "@loot-game/game/tactical/types";
import { eq } from "drizzle-orm";
import {
  captureStartingBuilds,
  restoreStartingBuilds,
} from "../battle/starting-builds";
import {
  deserializeStartingBuilds,
  deserializeStartingGrid,
  serializeStartingBuilds,
} from "../battle/starting-build-codec";
import {
  TB_battleParticipants,
  TB_battleStart,
  type Database,
} from "../db/schema";
import { EntityFactory } from "./entity-factory";

export class SyncFactory {
  constructor(private readonly db: Database) {}

  async addBattleManager(bm: BattleManager) {
    const characters = bm.entities.filter((e) => e instanceof Character);
    const enemies = bm.entities.filter((e) => e instanceof BaseEnemy);
    const grid = bm.grid
      ? {
          rulesVersion: bm.grid.rulesVersion,
          battlefield: bm.grid.battlefield,
          positions: bm.grid.positions,
        }
      : undefined;
    await this.add(bm.battleId, characters, enemies, grid);
  }

  async add(
    battleId: string,
    characters: Character[],
    enemies: BaseEnemy[],
    grid?: GridSetup,
  ) {
    await this.db.transaction(async (tx) => {
      await tx.insert(TB_battleStart).values({
        battleId,
        builds: serializeStartingBuilds(
          captureStartingBuilds([...characters, ...enemies], Boolean(grid)),
          grid,
        ),
      });
      for (const character of characters) {
        await tx.insert(TB_battleParticipants).values({
          battleId: battleId,
          entityId: character.id,
          isBot: false,
          team: character.team,
        });
      }
      for (const enemy of enemies) {
        await tx.insert(TB_battleParticipants).values({
          battleId: battleId,
          entityId: enemy.id,
          isBot: true,
          team: enemy.team,
          enemyType: enemy.type,
        });
      }
    });
  }

  async get(battleId: string) {
    const [snapshot] = await this.db
      .select()
      .from(TB_battleStart)
      .where(eq(TB_battleStart.battleId, battleId));
    if (snapshot) {
      const entities = restoreStartingBuilds(
        deserializeStartingBuilds(snapshot.builds),
      );
      return {
        characters: entities.filter((entity) => entity instanceof Character),
        enemies: entities.filter((entity) => entity instanceof BaseEnemy),
        grid: deserializeStartingGrid(snapshot.builds),
      };
    }
    // Legacy battles created before snapshots were stored retain their existing
    // roster lookup. New battles always take the immutable path above.
    const participants = await this.db
      .select()
      .from(TB_battleParticipants)
      .where(eq(TB_battleParticipants.battleId, battleId));

    const characterIds = participants
      .filter((p) => !p.isBot)
      .map((p) => p.entityId);

    const characters = await Promise.all(
      characterIds.map((p) => EntityFactory.createCharacter(p, this.db)),
    );
    const enemies = await Promise.all(
      participants
        .filter((p) => p.isBot)
        .filter((p) => p.enemyType)
        .map((p) =>
          EntityFactory.createEnemyFromType(p.enemyType!, p.entityId),
        ),
    );

    return {
      characters,
      enemies,
      grid: undefined,
    };
  }

  async cleanup(battleId: string) {
    await this.db
      .delete(TB_battleParticipants)
      .where(eq(TB_battleParticipants.battleId, battleId));
  }
}
