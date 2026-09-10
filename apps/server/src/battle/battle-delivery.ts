import type { BM } from "@loot-game/game/bm";
import { TB_activeBattle, type Database } from "../db/schema";
import { bmStorage } from "../game-usecases/bm-storage";

export type BattleDelivery = {
  activity: boolean;
  completion: "none" | "result" | "workflow" | "delivered";
  failures: number;
};

export const needsDelivery = (delivery: BattleDelivery) =>
  delivery.activity ||
  delivery.completion === "result" ||
  delivery.completion === "workflow";

/** Save the obligation and its wakeup in one Durable Object transaction. */
export async function saveDelivery(
  storage: DurableObjectStorage,
  delivery: BattleDelivery,
  journal?: string[],
) {
  const commit = async (
    tx: Pick<DurableObjectTransaction, "put"> &
      Partial<
        Pick<DurableObjectTransaction, "getAlarm" | "setAlarm" | "deleteAlarm">
      >,
  ) => {
    if (needsDelivery(delivery)) {
      // Keep an existing alarm. Constructor/setup must not postpone a retry.
      if ((await tx.getAlarm?.()) == null) {
        const delay = Math.min(
          60_000,
          1000 * 2 ** Math.min(delivery.failures, 6),
        );
        await tx.setAlarm?.(Date.now() + delay);
      }
    } else {
      await tx.deleteAlarm?.();
    }
    await tx.put({ delivery, ...(journal ? { messages: journal } : {}) });
  };
  // Cloudflare stores the journal, obligation and alarm in one transaction.
  // Minimal key/value hosts still support atomic multi-key journal commitment.
  if (storage.transaction) await storage.transaction(commit);
  else await commit(storage);
}

/** Every external stage may succeed before its marker is saved; repeat safely. */
export async function deliverBattle(
  battle: BM,
  db: Database,
  workflow: Env["BATTLE_DONE_WORKFLOW"],
  delivery: BattleDelivery,
  checkpoint: (next: BattleDelivery) => Promise<void>,
) {
  let next = { ...delivery };
  if (next.activity) {
    await db
      .insert(TB_activeBattle)
      .values({ battleId: battle.battleId })
      .onConflictDoUpdate({
        target: TB_activeBattle.battleId,
        set: { lastAction: new Date() },
      });
    next = { ...next, activity: false };
    await checkpoint(next);
  }
  if (next.completion === "result") {
    await bmStorage.save(battle, db);
    next = { ...next, completion: "workflow" };
    await checkpoint(next);
  }
  if (next.completion === "workflow") {
    try {
      await workflow.create({
        id: battle.battleId,
        params: { battleId: battle.battleId },
      });
    } catch (creationError) {
      // A previous creation may have succeeded before its response/marker was
      // lost. Only a confirmed existing instance satisfies that delivery.
      try {
        const existing = await workflow.get(battle.battleId);
        const status = await existing.status();
        if (status.status === "errored" || status.status === "terminated") {
          await existing.restart();
        }
      } catch {
        throw creationError;
      }
    }
    next = { ...next, completion: "delivered", failures: 0 };
    await checkpoint(next);
  }
}
