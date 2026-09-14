import type { Character } from "@loot-game/game/base-entity";
import { strengthenEliteEncounter } from "@loot-game/game/dungeons/route";
import { readDungeonRoute } from "@loot-game/game/dungeons/route-state";
import type { DungeonData } from "@loot-game/game/dungeons/types";
import { TRPCError } from "@trpc/server";
import { asc, eq } from "drizzle-orm";
import {
  TB_dungeonBattle,
  TB_dungeonData,
  TB_dungeonEnemy,
  type Database,
} from "../db/schema";
import { getDungeonParty } from "./dungeon-access";
import { EntityFactory } from "./entity-factory";

export function getDungeonBattles(id: string, db: Database) {
  return db
    .select()
    .from(TB_dungeonBattle)
    .where(eq(TB_dungeonBattle.dungeonId, id))
    .orderBy(asc(TB_dungeonBattle.createdAt), asc(TB_dungeonBattle.id));
}

/** Build the read model from one record; commands pass their already locked record. */
export async function readDungeon(
  dungeon: typeof TB_dungeonData.$inferSelect,
  db: Database,
): Promise<DungeonData> {
  const route = readDungeonRoute(dungeon.route);
  const participants = await getDungeonParty(dungeon.id, db);
  const enemyData = await db
    .select()
    .from(TB_dungeonEnemy)
    .where(eq(TB_dungeonEnemy.dungeonId, dungeon.id));
  const enemies = EntityFactory.createEnemyFromDb(enemyData);
  for (const decision of route?.decisions ?? []) {
    if (decision.action === "elite" && enemies[decision.wave])
      strengthenEliteEncounter(enemies[decision.wave]!);
  }
  const playerTeam: Character[] = [];
  // The persisted resource array retains the chosen party order independently
  // of the join plan PostgreSQL chooses for participant lookup.
  const partyOrder = new Map(
    dungeon.characterData.map((hero, index) => [hero.characterId, index]),
  );
  for (const participant of participants.sort(
    (a, b) =>
      (partyOrder.get(a.characterId) ?? -1) -
      (partyOrder.get(b.characterId) ?? -1),
  )) {
    const character = await EntityFactory.createCharacter(
      participant.characterId,
      db,
    );
    const resources = dungeon.characterData.find(
      (hero) => hero.characterId === character.id,
    );
    if (!resources) throw new Error("Character data not found");
    character.health = resources.health;
    character.mana = resources.mana;
    playerTeam.push(character);
  }
  return {
    id: dungeon.id,
    playerTeam,
    round: dungeon.round,
    actualEnemies: enemies,
    key: dungeon.key,
    cleared: dungeon.cleared,
    activeBattle: dungeon.activeBattle,
    abandonedAt: dungeon.abandonedAt,
    route,
  };
}

export async function getDungeon(id: string, db: Database) {
  const [record] = await db
    .select()
    .from(TB_dungeonData)
    .where(eq(TB_dungeonData.id, id));
  if (!record)
    throw new TRPCError({ code: "NOT_FOUND", message: "Dungeon not found" });
  return readDungeon(record, db);
}
