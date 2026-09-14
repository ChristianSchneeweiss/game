import { afterEach, beforeEach, expect, test } from "bun:test";
import SuperJSON from "superjson";
import { database, type TestDatabase } from "../support/database";
import { tacticalDurable, tacticalState } from "../support/tactical-durable";

let data: TestDatabase;
beforeEach(async () => {
  data = await database();
});
afterEach(async () => {
  await data.close();
});

test("partial orthogonal movement shares one allowance and preserves combat clocks and RNG", async () => {
  const f = await tacticalDurable(data.db);
  const initial = tacticalState(f.socket.bm);
  await f.send(f.command({ type: "move", destination: { x: 1, y: 0 } }));
  expect(f.socket.bm.grid!.activation).toEqual({
    ...initial.grid!.activation!,
    spent: 1,
  });
  await f.send(f.command({ type: "move", destination: { x: 3, y: 0 } }));
  const moved = tacticalState(f.socket.bm);
  expect(moved.grid!.positions["audit-hero"]).toEqual({ x: 3, y: 0 });
  expect(moved.grid!.activation!.spent).toBe(3);
  expect(moved.revision).toBe(initial.revision + 2);
  expect(moved.rounds).toEqual(initial.rounds);
  expect(moved.rng).toEqual(initial.rng);
  expect(moved.entities).toEqual(initial.entities);
  await f.send(f.command({ type: "move", destination: { x: 4, y: 0 } }));
  expect(tacticalState(f.socket.bm)).toEqual(moved);
  expect(f.messages[0]!.at(-2)!.type).toBe("rejected");
});

test("owners, activation identity, freshness, board bounds and occupancy reject without mutation", async () => {
  const f = await tacticalDurable(data.db);
  const before = tacticalState(f.socket.bm);
  const valid = f.command({ type: "move", destination: { x: 1, y: 0 } });
  await f.send(valid, 1);
  await f.send({ ...valid, data: { ...valid.data, entityId: "guest-hero" } });
  await f.send({
    ...valid,
    data: { ...valid.data, revision: before.revision + 1 },
  });
  await f.send({
    ...valid,
    data: { ...valid.data, activationId: "previous-activation" },
  });
  for (const destination of [
    { x: 2, y: 1 },
    { x: 0, y: 1 },
    { x: -1, y: 1 },
    { x: 11, y: 1 },
  ])
    await f.send(f.command({ type: "move", destination }));
  expect(tacticalState(f.socket.bm)).toEqual(before);
  expect(f.storage.get("messages")).toBeUndefined();
});

test("accepted identity retries acknowledge once and reject a changed payload or owner", async () => {
  const f = await tacticalDurable(data.db);
  const move = f.command({ type: "move", destination: { x: 1, y: 0 } });
  await f.send(move);
  const committed = tacticalState(f.socket.bm);
  await f.send(move);
  const recovered = await f.rehydrate();
  await f.send(move, 0, recovered);
  await f.send(move, 1, recovered);
  await f.send(
    {
      ...move,
      data: { ...move.data, destination: { x: 1, y: 2 } },
    } as typeof move,
    0,
    recovered,
  );
  expect(tacticalState(recovered.bm)).toEqual(committed);
  expect(f.storage.get("messages")).toHaveLength(1);
  expect(
    f.messages[0]!.filter(({ type }) => type === "castAccepted"),
  ).toHaveLength(3);
});

test("end turn advances quiet command revision and grants the next owner fresh movement", async () => {
  const f = await tacticalDurable(data.db);
  const activation = f.socket.bm.grid!.activation!;
  await f.send(f.command({ type: "endTurn" }));
  expect(f.socket.bm.grid!.activation).toMatchObject({
    entityId: "guest-hero",
    allowance: 3,
    spent: 0,
  });
  expect(f.socket.bm.grid!.activation!.id).not.toBe(activation.id);
  expect(f.socket.bm.revision).toBe(1);
  const state = tacticalState(f.socket.bm);
  await f.send(f.command({ type: "endTurn" }));
  expect(tacticalState(f.socket.bm)).toEqual(state);
  await f.send(f.command({ type: "endTurn" }), 1);
  expect(f.socket.bm.grid!.activation!.entityId).toBe("audit-hero");
  expect(f.socket.bm.grid!.positions["audit-goblin"]).not.toEqual({
    x: 6,
    y: 1,
  });
});

test("a failed journal write rolls back position, allowance and request acceptance through cold recovery", async () => {
  const f = await tacticalDurable(data.db);
  const command = f.command({ type: "move", destination: { x: 1, y: 0 } });
  const before = tacticalState(f.socket.bm);
  f.setStorageFailure(true);
  await f.send(command);
  expect(tacticalState(f.socket.bm)).toEqual(before);
  expect(f.storage.get("messages")).toBeUndefined();
  f.setStorageFailure(false);
  const restored = await f.rehydrate();
  expect(tacticalState(restored.bm)).toEqual(before);
  await f.send(command, 0, restored);
  expect(restored.bm.grid!.activation!.spent).toBe(1);
  expect(f.storage.get("messages")).toHaveLength(1);
});

test("spatial casts reject unavailable resources, mismatched aim and legacy target-ID commands", async () => {
  const f = await tacticalDurable(data.db, (builds, grid) => {
    grid.positions["audit-goblin"] = { x: 1, y: 2 };
    builds[0]!.spells[0]!.config.manaCost = 51;
  });
  const before = tacticalState(f.socket.bm);
  const cast = f.command({
    type: "castSpatial",
    spellId: "audit-hero-hit",
    selection: { aim: "tile", tile: { x: 1, y: 2 } },
  });
  await f.send(cast);
  expect(tacticalState(f.socket.bm)).toEqual(before);
  // A shape mismatch, old target-ID command and malformed tile cannot bypass grid validation.
  await f.send(
    f.command({
      type: "castSpatial",
      spellId: "audit-hero-hit",
      selection: { aim: "global" },
    }),
  );
  await f.socket.webSocketMessage(
    f.sockets[0]!,
    SuperJSON.stringify({
      type: "castSpell",
      data: {
        entityId: "audit-hero",
        spellId: "audit-hero-hit",
        targetIds: ["audit-goblin"],
      },
    }),
  );
  await f.socket.webSocketMessage(
    f.sockets[0]!,
    SuperJSON.stringify({
      ...cast,
      data: {
        ...cast.data,
        selection: { aim: "tile", tile: { x: 1.5, y: 2 } },
      },
    }),
  );
  expect(tacticalState(f.socket.bm)).toEqual(before);
});

test("a legal cast commits once, damages only its resolved recipient and closes movement for its activation", async () => {
  const f = await tacticalDurable(data.db, (builds, grid) => {
    grid.positions["audit-goblin"] = { x: 1, y: 2 };
    builds[0]!.weaponAttackProfile!.baseDamage = { min: 50, max: 50 };
  });
  const before = tacticalState(f.socket.bm);
  await f.send(
    f.command({
      type: "castSpatial",
      spellId: "audit-hero-hit",
      selection: { aim: "tile", tile: { x: 1, y: 0 } },
    }),
  );
  expect(tacticalState(f.socket.bm)).toEqual(before);
  const command = f.command({
    type: "castSpatial",
    spellId: "audit-hero-hit",
    selection: { aim: "tile", tile: { x: 1, y: 2 } },
  });
  await f.send(command);
  const committed = tacticalState(f.socket.bm);
  expect(f.socket.bm.getEntityById("audit-goblin")!.health).toBeLessThan(
    before.entities[2]!.health,
  );
  expect(f.socket.bm.grid!.activation!.entityId).toBe("guest-hero");
  expect(f.socket.bm.revision).toBe(1);
  await f.send(command);
  await f.send({
    type: "move",
    data: {
      entityId: "audit-hero",
      activationId: command.data.activationId,
      revision: 1,
      requestId: "after-cast",
      destination: { x: 1, y: 0 },
    },
  });
  expect(tacticalState(f.socket.bm)).toEqual(committed);
  expect(f.storage.get("messages")).toHaveLength(1);
});
