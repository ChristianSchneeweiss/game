import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { database, type TestDatabase } from "../support/database";
import { durableBattle } from "../support/durable";
import { combatState } from "../support/invariants";
const { bmStorage } = await import("../../../apps/server/src/game-usecases/bm-storage");

let data: TestDatabase;
beforeEach(async () => { data = await database(); });
afterEach(async () => { await data?.close(); });

describe("command commitment and recovery", () => {
  test("accepted commands reproduce events, resources, effects, turns and RNG after hibernation", async () => {
    const f = await durableBattle(data.db);
    await f.socket.webSocketMessage(f.ws, f.cast());
    expect(f.received.map((m) => m.type)).toContain("castAccepted");
    expect(combatState((await f.rehydrate()).bm)).toEqual(combatState(f.socket.bm));
  });

  test("failed journal commit rolls back live state and RNG before accepting another command", async () => {
    const f = await durableBattle(data.db);
    const before = combatState(f.socket.bm);
    f.failStorage();
    await f.socket.webSocketMessage(f.ws, f.cast());
    expect(f.received.map((m) => m.type)).toContain("rejected");
    expect(f.received.map((m) => m.type)).not.toContain("castAccepted");
    expect(f.journal()).toBeUndefined();
    f.allowStorage();
    expect(combatState((await f.rehydrate()).bm)).toEqual(before);
    expect(combatState(f.socket.bm)).toEqual(before);
    await f.socket.webSocketMessage(f.ws, f.cast());
    expect(combatState((await f.rehydrate()).bm)).toEqual(combatState(f.socket.bm));
  });

  test("an exception during damage resolution cannot poison the next accepted command's replay", async () => {
    const f = await durableBattle(data.db, { faultingCast: true });
    // Current content exercises an exception after damage but before an event is
    // published. If that reaction is repaired, both legal casts must replay too.
    await f.socket.webSocketMessage(f.ws, f.cast());
    await f.socket.webSocketMessage(f.ws, f.cast("audit-safe"));
    expect(f.received.map((m) => m.type)).toContain("castAccepted");
    expect(combatState((await f.rehydrate()).bm)).toEqual(combatState(f.socket.bm));
  });
});

describe("recoverable completion", () => {
  test("a lethal cast saves a readable result and starts one completion workflow", async () => {
    const f = await durableBattle(data.db, { lethal: true });
    await f.socket.webSocketMessage(f.ws, f.cast());
    expect(f.received.map((m) => m.type)).toEqual(["castAccepted", "state", "finished"]);
    expect((await bmStorage.get("audit-battle", data.db)).winner).toBe("TEAM_A");
    expect(f.workflows()).toEqual(["audit-battle"]);
    expect(f.workflowAttempts()).toBe(1);
  });

  for (const table of ["active_battle", "battle_result"] as const) {
    test(`completion resumes after a transient ${table} write failure`, async () => {
      const f = await durableBattle(data.db, { lethal: true });
      await data.failWrites(table);
      await f.socket.webSocketMessage(f.ws, f.cast());
      expect(f.socket.bm.isGameOver()).toBe(true);
      await data.allowWrites(table);
      await f.socket.setup("test-placeholder", "audit-battle");
      const restored = await f.rehydrate();
      await restored.setup("test-placeholder", "audit-battle");
      expect((await bmStorage.get("audit-battle", data.db)).winner).toBe("TEAM_A");
      expect(f.workflows()).toEqual(["audit-battle"]);
      expect(f.workflowAttempts()).toBe(1);
    });
  }

  test("workflow creation is retried after a transient failure, including cold recovery", async () => {
    const f = await durableBattle(data.db, { lethal: true });
    f.failWorkflow();
    await f.socket.webSocketMessage(f.ws, f.cast());
    expect((await bmStorage.get("audit-battle", data.db)).winner).toBe("TEAM_A");
    expect(f.workflowAttempts()).toBe(1);
    expect(f.workflows()).toEqual([]);
    f.allowWorkflow();
    const restored = await f.rehydrate();
    await restored.setup("test-placeholder", "audit-battle");
    expect(f.workflows()).toEqual(["audit-battle"]);
    expect(f.workflowAttempts()).toBe(2);
  });

  test("repeated warm and cold setup preserves the saved result without duplicating completion", async () => {
    const f = await durableBattle(data.db, { lethal: true });
    await f.socket.webSocketMessage(f.ws, f.cast());
    const result = await bmStorage.get("audit-battle", data.db);
    await f.socket.setup("test-placeholder", "audit-battle");
    await (await f.rehydrate()).setup("test-placeholder", "audit-battle");
    expect((await bmStorage.get("audit-battle", data.db)).timelineData).toEqual(result.timelineData);
    expect(f.workflowAttempts()).toBe(1);
  });
});
