import { PGlite } from "@electric-sql/pglite";
import { generateDrizzleJson, generateMigration } from "drizzle-kit/api";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../../../apps/server/src/db/schema";

// Generate DDL from the application's schema: filters, joins, foreign keys,
// conflicts and rollback execute in PostgreSQL, with no remote connection.
const migration = generateMigration(generateDrizzleJson({}), generateDrizzleJson(schema));

export async function database() {
  const client = new PGlite();
  const db = drizzle(client);
  for (const statement of await migration) await client.exec(statement);
  await db.insert(schema.TB_user).values({ id: "audit-owner", username: "battle-tests" });
  await db.insert(schema.TB_character).values({
    id: "audit-hero", userId: "audit-owner", name: "Test hero", health: 100, mana: 50,
    intelligence: 20, vitality: 10, strength: 18, agility: 100,
  });
  await db.insert(schema.TB_dungeonData).values({
    id: "audit-dungeon", key: "dungeon1", createdBy: "audit-owner",
    characterData: [{ characterId: "audit-hero", health: 37, mana: 9 }],
  });
  await db.insert(schema.TB_dungeonParticipant).values({ dungeonId: "audit-dungeon", characterId: "audit-hero" });
  await db.insert(schema.TB_dungeonEnemy).values({ id: "audit-goblin", dungeonId: "audit-dungeon", type: "goblin", inRound: 0 });
  return {
    db, close: () => client.close(),
    async failWrites(table: "active_battle" | "battle_result" | "loot") {
      await client.exec(`
        CREATE OR REPLACE FUNCTION test_fail_write() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN RAISE EXCEPTION 'injected database write failure'; END; $$;
        CREATE TRIGGER test_write_failure BEFORE INSERT OR UPDATE ON "${table}"
        FOR EACH ROW EXECUTE FUNCTION test_fail_write();
      `);
    },
    async allowWrites(table: "active_battle" | "battle_result" | "loot") {
      await client.exec(`DROP TRIGGER IF EXISTS test_write_failure ON "${table}";`);
    },
  };
}
export type TestDatabase = Awaited<ReturnType<typeof database>>;
