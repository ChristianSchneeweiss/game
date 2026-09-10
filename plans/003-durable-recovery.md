# 003 — Make battle commitment and completion recoverable

**Status:** Complete; accepted replay break recorded in the index. **Priority:** P1. **Effort:** M–L. **Risk:** high. **Planned at:** `3835a60`, 10 September 2026. **Dependencies:** 001's explicit action outcomes; 002's idempotent attempt completion. **Primary findings:** B09, B10.

## Implementation result — 10 September 2026

Each command resolves against an isolated reconstruction of the committed journal. The command, delivery obligation and alarm commit before acknowledgement. Activity, result persistence and workflow creation resume from durable checkpoints, including cold recovery and confirmed duplicate workflow delivery. All 8 durable integration checks pass without modifying their storage or workflow substitutes.

The committed test files are unchanged, per the user’s instruction. See [verification results](verification-results.md) for the full run, independent checks and the three historical resimulation failures.

The user's later instructions supersede the planned test additions below and accept those three historical failures. All other completion checks pass; see the [confirmed decisions](README.md#confirmed-decisions).

## Problem and intended result

A cast currently mutates the live battle before its command journal is saved. A failed write leaves memory ahead of recoverable state, including RNG. A terminal cast can commit but fail to save its result or start its completion workflow; warm/cold setup then leaves that work unfinished.

Give the Durable Object a single command commit interface and a durable pending-completion record. Acknowledgement means the action is recoverable. Result persistence and workflow delivery happen through retryable stages. This is local durable commitment plus idempotent delivery, not a transaction spanning Cloudflare storage and PostgreSQL.

## Current state and scope

`apps/server/src/durable-objects/battle-ws.ts:172` currently does:

```ts
const accepted = await this.handleMessage(message, ws);
if (accepted) {
  this.messages.push(message);
  await this.ctx.storage.put({ messages: this.messages });
```

The same try/catch then performs `TB_activeBattle` writes and `finishBattle()`. `finishBattle()` saves the result and calls `BATTLE_DONE_WORKFLOW.create({ id: this.battleId, ... })`. `setup()` only finalizes when `needsSetup && this.bm.isGameOver()`. The constructor replays accepted messages but does not resume pending finalization.

In scope: `apps/server/src/durable-objects/battle-ws.ts`, small persistence/recovery helpers under `battle/`, `battle/starting-builds.ts`, `game-usecases/bm-storage.ts`, `workflows/battle-done.workflow.ts`, and `tests/battle/{integration/durable.test.ts,support/durable.ts,support/database.ts}`. Use existing SuperJSON/Zod message parsing and actual `BattleWebsocket` methods as the test seam. Dungeon reward/progression semantics come from the idempotent completion interface specified here: one battle ID may be delivered repeatedly with no duplicate mutation. Do not reimplement that transaction in the Durable Object.

## Implementation steps

1. **Resolve in isolated candidate state and commit once.** Serialize mutating requests per battle revision. Preserve existing validation and duplicate/stale revision protections. Resolve against a candidate reconstructed from frozen starting builds and the accepted command prefix, or another explicitly serializable checkpoint. Avoid arbitrary deep clones of manager classes and closures. A resolver exception or failed durable write discards the candidate, including RNG, effects, queues and cooldowns. Persist the accepted revision/journal before swapping live state and sending `castAccepted`/state. Preserve stable identities for already committed event references across candidate reconstruction.
   Verify: `bun test --preload ./tests/battle/support/quiet.ts ./tests/battle/integration/durable.test.ts -t 'command commitment'` → all command recovery cases pass.
2. **Persist a completion obligation with the terminal commit.** Model pending work explicitly: result persistence, workflow delivery, completed delivery. Save terminal state and the pending obligation atomically in Durable Object storage; make `bmStorage.save` and the downstream attempt completion safe to repeat. A failure after command commitment must not be reported as a rejected cast. A retry must not repeat damage or charge resources.
   Verify: `bun test --preload ./tests/battle/support/quiet.ts ./tests/battle/integration/durable.test.ts -t 'recoverable completion'` → existing database and workflow failure cases pass.
3. **Resume without a new player command.** Drive pending stages from recovery/setup and a Durable Object alarm. Persist retry scheduling with the obligation using the configured storage backend's transaction facilities. Handle an existing workflow ID by checking the known instance rather than inventing another ID; the local generated Cloudflare types specify that duplicate `create(id)` throws. Retain pending state after delivery failure and use bounded backoff. Avoid overwriting an already scheduled alarm during construction. Alarm delivery can repeat and must be idempotent. [Cloudflare's alarm contract](https://developers.cloudflare.com/durable-objects/api/alarms/) documents repeated delivery and limited automatic retries; reschedule deliberately when longer outages must remain recoverable.
   Verify: extend the external storage/workflow doubles for alarms and run `bun tests/battle/run.ts integration/durable integration/dungeon recovery.test.ts` → all selected tests pass.

## Tests and completion criteria

Add failures after mutation/before commit, during durable commit, after commit/before acknowledgement, after result save, after workflow creation/before its marker, and after progression/before transient cleanup. Add overlapping commands and alarm-only recovery. The next accepted command and cold reconstruction must have equal semantic state and RNG. A failed first cast in existing content must not be the only way the harness can exercise an execution failure.

- All focused checks pass; each failure point eventually reaches one readable result and one effective attempt completion.
- No committed action receives a contradictory rejection because subsequent completion delivery failed.
- No pending completion depends on another player reconnecting to make progress.
- `bun run typecheck` and `bun run typecheck:battle` exit 0. Run `bun run test:battle`; unrelated combat findings may remain.
- Update task 003 in `plans/README.md`.

Run `git diff --stat 3835a60..HEAD -- apps/server/src/durable-objects/battle-ws.ts apps/server/src/battle apps/server/src/game-usecases/bm-storage.ts apps/server/src/workflows/battle-done.workflow.ts tests/battle` first. Reconcile prerequisite changes before implementing. If the deployed storage backend cannot atomically support the proposed commit/scheduling sequence, revise that sequence before shipping; do not hide the recovery gap behind a catch. Preserve the current deployment configuration and use a `codex/` branch if creating one.
