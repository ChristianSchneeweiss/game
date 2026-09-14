import { afterEach, beforeEach, expect, test } from "bun:test";
import SuperJSON from "superjson";
import { eq } from "drizzle-orm";
import { createSpellFromType } from "../../../apps/game/src/spells/base/spell-from-type";
import { WEAPON_PROFILES } from "../../../apps/game/src/tactical/catalogue";
import {
  deserializeStartingBuilds,
  deserializeStartingGrid,
  serializeStartingBuilds,
} from "../../../apps/server/src/battle/starting-build-codec";
import type { StartingBuilds } from "../../../apps/server/src/battle/starting-builds";
import {
  TB_battleStart,
  TB_dungeonBattle,
  TB_dungeonData,
} from "../../../apps/server/src/db/schema";
import { beginDungeonAttempt } from "../../../apps/server/src/game-usecases/dungeon-attempt";
import { SyncFactory } from "../../../apps/server/src/game-usecases/sync-factory";
import { database, type TestDatabase } from "../support/database";
import { tacticalDurable, tacticalState } from "../support/tactical-durable";

let data: TestDatabase;
beforeEach(async () => {
  data = await database();
});
afterEach(async () => {
  await data.close();
});

test("recovery after every accepted move, random cast, delayed discharge and extra activation matches uninterrupted play", async () => {
  const f = await tacticalDurable(data.db, (builds) => {
    const hero = builds[0]!;
    hero.mana = hero.maxMana = 500;
    hero.health = hero.maxHealth = 2000;
    hero.spells = (
      ["volt-lash", "arcane-channeling", "fleetfoot-gambit"] as const
    ).map((type) => ({
      config: createSpellFromType(type, type).config,
      currentCooldown: 0,
    }));
  });
  const check = async () =>
    expect(tacticalState((await f.rehydrate()).bm)).toEqual(
      tacticalState(f.socket.bm),
    );
  const pass = async () => {
    const owner =
      f.socket.bm.grid!.activation!.entityId === "audit-hero" ? 0 : 1;
    await f.send(f.command({ type: "endTurn" }), owner);
    await check();
  };
  await f.send(f.command({ type: "move", destination: { x: 1, y: 0 } }));
  await check();
  await f.send(
    f.command({
      type: "castSpatial",
      spellId: "volt-lash",
      selection: { aim: "global" },
    }),
  );
  await check();
  expect(
    f.socket.bm.events.some(
      ({ event }) =>
        event.eventType === "SPELL_CAST" &&
        event.data.spellId === "volt-lash" &&
        event.data.strikeOrder?.length === 4,
    ),
  ).toBe(true);
  await pass();
  await f.send(
    f.command({
      type: "castSpatial",
      spellId: "arcane-channeling",
      selection: { aim: "global" },
    }),
  );
  await check();
  for (
    let step = 0;
    step < 5 && f.socket.bm.grid!.activation!.entityId !== "audit-hero";
    step++
  )
    await pass();
  expect(f.socket.bm.grid!.activation!.entityId).toBe("audit-hero");
  expect(
    f.socket.bm.events.some(
      ({ event }) =>
        event.eventType === "SPELL_CAST" &&
        event.data.spellId === "arcane-channeling" &&
        event.data.origin === "delayed",
    ),
  ).toBe(true);
  await f.send(
    f.command({
      type: "castSpatial",
      spellId: "fleetfoot-gambit",
      selection: {
        aim: "tile",
        tile: f.socket.bm.grid!.positions["audit-hero"]!,
      },
    }),
  );
  await check();
  const activations: string[] = [];
  for (let step = 0; step < 5; step++) {
    activations.push(f.socket.bm.grid!.activation!.entityId);
    expect(f.socket.bm.grid!.activation!.spent).toBe(0);
    await pass();
  }
  expect(
    activations.some(
      (id, index) => id === "audit-hero" && activations[index + 1] === id,
    ),
  ).toBe(true);
});

test("captured weapon and targeting rules survive changed authoring without changing range, damage or RNG", async () => {
  const f = await tacticalDurable(data.db, (builds, grid) => {
    grid.battlefield.blocked = [];
    grid.positions["audit-goblin"] = { x: 5, y: 1 };
    const hero = builds[0]!;
    hero.weaponAttackProfile = {
      targeting: {
        aim: "tile",
        range: { min: 1, max: 4 },
        affectedTiles: [[0, 0]],
        recipients: "enemies",
      },
      damageType: "PHYSICAL",
      baseDamage: { min: 21, max: 21 },
      scaling: [
        { attribute: "strength", multiplier: 0.5 },
        { attribute: "movement", multiplier: 2 },
      ],
    };
    hero.spells[0]!.config.targeting = hero.weaponAttackProfile.targeting;
  });
  const initial = tacticalState(f.socket.bm);
  const command = f.command({
    type: "castSpatial",
    spellId: "audit-hero-hit",
    selection: { aim: "tile", tile: { x: 5, y: 1 } },
  });
  await f.send(command);
  expect(f.socket.bm.getEntityById("audit-goblin")!.health).toBeLessThan(
    initial.entities[2]!.health,
  );
  const original = structuredClone(WEAPON_PROFILES.unarmed);
  try {
    WEAPON_PROFILES.unarmed.baseDamage = { min: 999, max: 999 };
    WEAPON_PROFILES.unarmed.targeting = {
      aim: "caster",
      affectedTiles: [[0, 0]],
      recipients: "allies",
    };
    const recovered = await f.rehydrate();
    expect(tacticalState(recovered.bm)).toEqual(tacticalState(f.socket.bm));
    expect(
      recovered.bm.getEntityById("audit-hero")!.weaponAttackProfile!.baseDamage,
    ).toEqual({ min: 21, max: 21 });
  } finally {
    Object.assign(WEAPON_PROFILES.unarmed, original);
  }
});

test("a failed random-cast commit preserves RNG and resources, and retry commits only one strike sequence", async () => {
  const f = await tacticalDurable(data.db, (builds) => {
    builds[0]!.spells = [
      {
        config: createSpellFromType("random-cast", "volt-lash").config,
        currentCooldown: 0,
      },
    ];
  });
  const command = f.command({
    type: "castSpatial",
    spellId: "random-cast",
    selection: { aim: "global" },
  });
  const before = tacticalState(f.socket.bm);
  f.setStorageFailure(true);
  await f.send(command);
  expect(tacticalState(f.socket.bm)).toEqual(before);
  expect(f.storage.get("messages")).toBeUndefined();
  f.setStorageFailure(false);
  const restored = await f.rehydrate();
  expect(tacticalState(restored.bm)).toEqual(before);
  await f.send(command, 0, restored);
  const committed = tacticalState(restored.bm);
  await f.send(command, 0, restored);
  expect(tacticalState(restored.bm)).toEqual(committed);
  expect(tacticalState((await f.rehydrate()).bm)).toEqual(committed);
  expect(
    restored.bm.events.filter(
      ({ event }) =>
        event.eventType === "SPELL_CAST" &&
        event.data.spellId === "random-cast",
    ),
  ).toHaveLength(1);
  expect(f.storage.get("messages")).toHaveLength(1);
});

test("v2 snapshots round-trip configuration and reject missing rules, invalid coordinates and incompatible journals", async () => {
  const f = await tacticalDurable(data.db);
  const builds = f.storage.get("startingBuilds") as StartingBuilds;
  const grid = f.socket.bm.grid!;
  const setup = {
    rulesVersion: grid.rulesVersion,
    battlefield: grid.battlefield,
    positions: grid.positions,
  };
  const saved = serializeStartingBuilds(builds, setup);
  expect(saved.version).toBe(2);
  expect(deserializeStartingBuilds(saved)).toEqual(builds);
  expect(deserializeStartingGrid(saved)).toEqual(setup);
  expect(() => deserializeStartingBuilds({ ...saved, version: 1 })).toThrow(
    "Legacy",
  );
  expect(() =>
    deserializeStartingBuilds({
      ...saved,
      grid: { ...setup, battlefield: { ...setup.battlefield, height: 0 } },
    }),
  ).toThrow();
  const missing = structuredClone(builds);
  delete missing[0]!.spells[0]!.config.targeting;
  expect(() =>
    deserializeStartingBuilds({
      ...SuperJSON.serialize(missing),
      version: 2,
      grid: setup,
    }),
  ).toThrow("frozen targeting");
  f.storage.set("journalVersion", 1);
  await expect(f.rehydrate()).rejects.toThrow("Legacy journal");
  f.storage.set("journalVersion", 2);
  f.storage.set("startingGrid", { ...setup, rulesVersion: 99 });
  await expect(f.rehydrate()).rejects.toThrow();
});

test("all new production attempts store an explicit grid and a retry uses its persisted layout", async () => {
  const battleId = await beginDungeonAttempt(
    "audit-dungeon",
    "audit-owner",
    data.db,
  );
  const first = await new SyncFactory(data.db).get(battleId);
  expect(first.grid).toBeDefined();
  expect(first.characters[0]!.weaponAttackProfile).toBeDefined();
  expect(
    first.characters[0]!.spells.every(({ config }) => config.targeting),
  ).toBe(true);
  const [saved] = await data.db
    .select()
    .from(TB_battleStart)
    .where(eq(TB_battleStart.battleId, battleId));
  const frozen = deserializeStartingGrid(saved!.builds)!;
  frozen.battlefield = {
    width: 11,
    height: 9,
    blocked: [{ x: 10, y: 8 }],
    layoutVersion: "persisted-retry-layout",
  };
  await data.db
    .update(TB_battleStart)
    .set({
      builds: serializeStartingBuilds(
        deserializeStartingBuilds(saved!.builds),
        frozen,
      ),
    })
    .where(eq(TB_battleStart.battleId, battleId));
  await data.db
    .update(TB_dungeonBattle)
    .set({ completedAt: new Date() })
    .where(eq(TB_dungeonBattle.battleId, battleId));
  await data.db
    .update(TB_dungeonData)
    .set({ activeBattle: false, activeBattleId: null });
  const retryId = await beginDungeonAttempt(
    "audit-dungeon",
    "audit-owner",
    data.db,
  );
  expect((await new SyncFactory(data.db).get(retryId)).grid).toEqual(frozen);
});
