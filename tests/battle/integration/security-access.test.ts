import { afterEach, beforeEach, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import {
  TB_character,
  TB_passivSkillStats,
  TB_user,
} from "../../../apps/server/src/db/schema";
import type { Context } from "../../../apps/server/src/lib/context";
import { appRouter } from "../../../apps/server/src/routers/index";
import { database, type TestDatabase } from "../support/database";

let data: TestDatabase;
beforeEach(async () => {
  data = await database();
  await data.db
    .insert(TB_user)
    .values({ id: "outsider", username: "outsider" });
  await data.db
    .update(TB_character)
    .set({ statPointsAvailable: 2 })
    .where(eq(TB_character.id, "audit-hero"));
});
afterEach(async () => {
  await data.close();
});
const caller = (id: string | null) =>
  appRouter.createCaller({
    session: id ? { id } : null,
    db: data.db,
  } as unknown as Context);

test("stat allocation rejects outsiders and anonymous users without modifying the owner", async () => {
  const before = await data.db.select().from(TB_character);
  for (const id of ["outsider", null]) {
    await expect(
      caller(id).character.applyStatIncrease({
        characterId: "audit-hero",
        stats: ["strength"],
      }),
    ).rejects.toThrow();
  }
  expect(await data.db.select().from(TB_character)).toEqual(before);
  await caller("audit-owner").character.applyStatIncrease({
    characterId: "audit-hero",
    stats: ["strength", "vitality"],
  });
  const [hero] = await data.db.select().from(TB_character);
  expect(hero!.strength).toBe(19);
  expect(hero!.vitality).toBe(11);
  expect(hero!.statPointsAvailable).toBe(0);
  await expect(
    caller("audit-owner").character.applyStatIncrease({
      characterId: "audit-hero",
      stats: ["strength"],
    }),
  ).rejects.toThrow("Not enough");
  expect(await data.db.select().from(TB_character)).toEqual([hero!]);
});

test("passive assignment requires ownership of both the passive and the target character", async () => {
  await data.db.insert(TB_passivSkillStats).values([
    { id: "foreign-passive", type: "armor-up", userId: "outsider" },
    { id: "own-passive", type: "armor-up", userId: "audit-owner" },
  ]);
  await expect(
    caller("outsider").character.equipPassiveSkill({
      characterId: "audit-hero",
      passiveSkillId: "foreign-passive",
    }),
  ).rejects.toThrow("Not your character");
  await expect(
    caller("audit-owner").character.equipPassiveSkill({
      characterId: "audit-hero",
      passiveSkillId: "foreign-passive",
    }),
  ).rejects.toThrow("Not your passive");
  expect(
    (await data.db.select().from(TB_passivSkillStats)).every(
      (row) => row.equippedBy === null,
    ),
  ).toBe(true);
  await caller("audit-owner").character.equipPassiveSkill({
    characterId: "audit-hero",
    passiveSkillId: "own-passive",
  });
  expect(
    (
      await data.db
        .select()
        .from(TB_passivSkillStats)
        .where(eq(TB_passivSkillStats.id, "own-passive"))
    )[0]!.equippedBy,
  ).toBe("audit-hero");
});
