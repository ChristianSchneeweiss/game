import { afterEach, beforeEach, expect, test } from "bun:test";
import { TB_spellStats } from "../../../apps/server/src/db/schema";
import type { Context } from "../../../apps/server/src/lib/context";
import { appRouter } from "../../../apps/server/src/routers/index";
import { database, type TestDatabase } from "../support/database";

let data: TestDatabase;
beforeEach(async () => {
  data = await database();
});
afterEach(async () => {
  await data.close();
});

const caller = (environment: string | undefined, authenticated = true) =>
  appRouter.createCaller({
    session: authenticated ? { id: "audit-owner" } : null,
    db: data.db,
    cfEnv: { DOPPLER_ENVIRONMENT: environment },
  } as unknown as Context);

for (const environment of ["development", "test"]) {
  test(`${environment} spell grants retain the seven spells for the authenticated owner`, async () => {
    await caller(environment).createSpell();
    const spells = await data.db.select().from(TB_spellStats);
    expect(spells).toHaveLength(7);
    expect(spells.every((spell) => spell.userId === "audit-owner")).toBe(true);
    expect(spells.map((spell) => spell.type).sort()).toEqual([
      "arcane-channeling",
      "bladestorm-rhythm",
      "bulwark-bash",
      "deflecting-stance",
      "earthshatter",
      "final-verdict",
      "fleetfoot-gambit",
    ]);
  });
}

test("spell grants fail closed outside explicit development/test without inventory writes", async () => {
  const before = await data.db.select().from(TB_spellStats);
  for (const environment of ["production", "staging", undefined, "", "dev"]) {
    await expect(caller(environment).createSpell()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  }
  await expect(
    caller("development", false).createSpell(),
  ).rejects.toMatchObject({
    code: "UNAUTHORIZED",
  });
  expect(await data.db.select().from(TB_spellStats)).toEqual(before);
});
