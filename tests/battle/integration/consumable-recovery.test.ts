import { afterEach, beforeEach, expect, test } from "bun:test";
import { getItemDefinition } from "../../../apps/game/src/items/catalog";
import { CONSUMABLE_DEFINITIONS } from "../../../apps/game/src/items/stackable-catalog";
import { buildTimeline } from "../../../apps/client/src/routes/battle/-presentation/timeline";
import type { GridCommand } from "../../../apps/server/src/battle/protocol";
import { tacticalDurable, tacticalState } from "../support/tactical-durable";
import { database, type TestDatabase } from "../support/database";

let data: TestDatabase;
beforeEach(async () => {
  data = await database();
});
afterEach(async () => {
  await data.close();
});

async function fixture() {
  return tacticalDurable(data.db, (builds) => {
    builds[0]!.health = 10;
    builds[0]!.mana = 0;
    builds[0]!.consumables = (["healing-potion", "mana-potion"] as const).map(
      (type, slot) => {
        const item = getItemDefinition(type);
        if (item.kind !== "consumable") throw new Error("Invalid fixture");
        return {
          version: 1,
          slot: slot as 0 | 1,
          type,
          name: item.name,
          quantity: 1,
          restoration: item.restoration,
        };
      },
    );
  });
}
function drink(
  f: Awaited<ReturnType<typeof fixture>>,
  slot: 0 | 1,
): GridCommand {
  const activation = f.socket.bm.grid!.activation!;
  return {
    type: "useConsumable",
    data: {
      entityId: "audit-hero",
      activationId: activation.id,
      revision: f.socket.bm.revision,
      requestId: crypto.randomUUID(),
      slot,
    },
  };
}

test("drinking commits one action, survives retries and recovery, and replays frozen effect values", async () => {
  const f = await fixture();
  const command = drink(f, 0);
  const originalActivation = f.socket.bm.grid!.activation!.id;
  const before = f.socket.bm.getEntityById("audit-hero")!.health;
  await f.send(command);
  expect(f.socket.messages).toHaveLength(1);
  expect(f.socket.bm.grid!.activation!.id).not.toBe(originalActivation);
  expect(
    f.socket.bm.getEntityById("audit-hero")!.consumables?.[0]!.quantity,
  ).toBe(0);
  const use = f.socket.bm.events.find(
    ({ event }) => event.eventType === "CONSUMABLE_USE",
  )!;
  expect(use.event.data).toMatchObject({ resource: "health", amount: 40 });
  expect(f.socket.bm.getEntityById("audit-hero")!.health).toBe(before + 40);
  const accepted = tacticalState(f.socket.bm);
  await f.send(command);
  expect(f.socket.messages).toHaveLength(1);
  expect(tacticalState(f.socket.bm)).toEqual(accepted);
  const definition = CONSUMABLE_DEFINITIONS["healing-potion"]!;
  try {
    CONSUMABLE_DEFINITIONS["healing-potion"] = {
      ...definition,
      restoration: { resource: "health", amount: 999 },
    };
    const recovered = await f.rehydrate();
    expect(tacticalState(recovered.bm)).toEqual(accepted);
    expect(
      recovered.bm.getEntityById("audit-hero")!.consumables?.[0]!.quantity,
    ).toBe(0);
  } finally {
    CONSUMABLE_DEFINITIONS["healing-potion"] = definition;
  }
  const frames = buildTimeline(f.socket.bm.startEntityData, f.socket.bm.events);
  expect(frames.at(-1)!.stats.get("audit-hero")!.health).toBe(before + 40);
  expect(
    frames.find((frame) => frame.cue?.label === "Healing Potion")?.cue?.style,
  ).toBe("heal");
});

test("wrong owner, stale activation, missing supply and journal failure cannot consume a bottle", async () => {
  const f = await fixture();
  const command = drink(f, 1);
  const before = tacticalState(f.socket.bm);
  await f.send(command, 1);
  await f.send({
    ...command,
    data: { ...command.data, revision: -1 },
  } as GridCommand);
  await f.send({
    ...command,
    data: { ...command.data, slot: 2 },
  } as unknown as GridCommand);
  expect(tacticalState(f.socket.bm)).toEqual(before);
  expect(f.socket.messages).toHaveLength(0);
  f.setStorageFailure(true);
  await f.send(command);
  expect(tacticalState(f.socket.bm)).toEqual(before);
  expect(
    f.socket.bm.getEntityById("audit-hero")!.consumables?.[1]!.quantity,
  ).toBe(1);
  f.setStorageFailure(false);
  await f.send(command);
  expect(f.socket.messages).toHaveLength(1);
  expect(
    f.socket.bm.events.find(({ event }) => event.eventType === "CONSUMABLE_USE")
      ?.event.data,
  ).toMatchObject({ resource: "mana", amount: 25 });
  expect(
    (await f.rehydrate()).bm.getEntityById("audit-hero")!.consumables?.[1]!
      .quantity,
  ).toBe(0);
});
