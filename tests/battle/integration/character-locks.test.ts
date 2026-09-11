import { afterEach, beforeEach, expect, test } from "bun:test";
import {
  TB_character,
  TB_passivSkillStats,
} from "../../../apps/server/src/db/schema";
import { equipPassiveSkill } from "../../../apps/server/src/game-usecases/character";
import { lockCharacters } from "../../../apps/server/src/game-usecases/character-locks";
import { EntityFactory } from "../../../apps/server/src/game-usecases/entity-factory";
import { SyncFactory } from "../../../apps/server/src/game-usecases/sync-factory";
import { database, type TestDatabase } from "../support/database";

let data: TestDatabase;
beforeEach(async () => {
  data = await database();
  await data.db.insert(TB_character).values(
    ["a", "B"].map((id) => ({
      id,
      name: `Hero ${id}`,
      userId: "audit-owner",
      health: 100,
      mana: 50,
      intelligence: 10,
      vitality: 10,
      strength: 10,
      agility: 10,
    })),
  );
});
afterEach(async () => {
  await data.close();
});

test("mixed-case parties acquire the same database order independent of caller order", async () => {
  const orders = [];
  for (const ids of [
    ["a", "B"],
    ["B", "a"],
    ["a", "B", "a"],
  ]) {
    orders.push(
      await data.db.transaction(async (tx) =>
        (await lockCharacters(ids, tx)).map((hero) => hero.id),
      ),
    );
  }
  // PGlite's database collation orders B before a; JS localeCompare does not.
  // Reversed input and duplicate IDs cannot change the shared lock sequence.
  expect(orders).toEqual([
    ["B", "a"],
    ["B", "a"],
    ["B", "a"],
  ]);
});

test("direct passive transfers preserve the existing permission and frozen-build behavior", async () => {
  await data.db
    .insert(TB_passivSkillStats)
    .values({
      id: "transfer-passive",
      userId: "audit-owner",
      type: "armor-up",
      equippedBy: "a",
    });
  const original = await Promise.all(
    ["a", "B"].map((id) => EntityFactory.createCharacter(id, data.db)),
  );
  const snapshots = new SyncFactory(data.db);
  await snapshots.add("before-passive-transfer", original, []);
  await equipPassiveSkill("B", "transfer-passive", "audit-owner", data.db);
  const current = await Promise.all(
    ["a", "B"].map((id) => EntityFactory.createCharacter(id, data.db)),
  );
  const restored = (await snapshots.get("before-passive-transfer")).characters;
  const assignments = (heroes: typeof current) =>
    heroes.map((hero) => ({
      id: hero.id,
      passiveIds: hero.passiveSkills.map((passive) => passive.id),
    }));
  expect(assignments(restored)).toEqual([
    { id: "a", passiveIds: ["transfer-passive"] },
    { id: "B", passiveIds: [] },
  ]);
  expect(assignments(current)).toEqual([
    { id: "a", passiveIds: [] },
    { id: "B", passiveIds: ["transfer-passive"] },
  ]);
});
