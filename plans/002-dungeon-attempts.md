# 002 — Give dungeon attempts identity and transactional progression

**Status:** Complete; accepted replay break recorded in the index. **Priority:** P1. **Effort:** M–L. **Risk:** high. **Planned at:** `3835a60`, 10 September 2026. **Dependencies:** none. **Primary findings:** B11, B12, B13, B15. **Related decision:** who may start a dungeon attempt.

## Implementation result — 10 September 2026

Dungeon starts atomically claim a battle ID and freeze the complete build with saved HP/mana. Completion claims an attempt inside the same transaction as progression, XP and loot. Duplicate and stale completions cannot reward or advance a newer attempt. Start permissions are creator or participating character owner, as confirmed by the user. All 10 dungeon integration checks pass. Separate two-connection PostgreSQL checks passed 10 overlapping-start trials; authorization and migration rollback checks also pass. The guarded migration is prepared, not applied to a shared database.

The committed test files are unchanged, per the user’s instruction. See [verification results](verification-results.md) for the full run, independent checks and the three historical resimulation failures.

The user's later instructions supersede the planned test additions below and accept those three historical failures. All other completion checks pass; see the [confirmed decisions](README.md#confirmed-decisions).

## Problem and intended result

The dungeon currently confuses the number of battle attempts with the number of cleared waves. Completion is not deduplicated by battle ID, a stale completion can clear a newer active battle, overlapping starts can create two attempts, and battle reconstruction loses saved HP/mana.

Make a dungeon attempt the persistence unit: it has an identity, an authored wave, immutable starting state and a completion marker. Starting and completing it are each atomic PostgreSQL transactions. A combat round remains an engine turn traversal; a dungeon wave is an authored encounter.

## Current state and scope

`apps/server/src/game-usecases/dungeon-manager.ts:176` currently advances with:

```ts
if (winningTeam === "TEAM_A") {
  dungeon.round = dungeonBattles.length;
}
```

`apps/server/src/routers/dungeon-router.ts:133` checks `dungeon.activeBattle` before entering its transaction. `SyncFactory.add` stores participant IDs/team, while `SyncFactory.get` reconstructs characters with `EntityFactory.createCharacter(p, this.db)`; the saved per-dungeon resources are absent from that handoff.

In scope: `apps/server/src/db/schema.ts` and migration artifacts, `game-usecases/{dungeon-manager.ts,sync-factory.ts,entity-factory.ts,loot-manager.ts,character.ts}`, `routers/dungeon-router.ts`, and starting-build serialization in `battle/starting-builds.ts`. The workflow may be adapted to the new completion interface; its delivery/retry policy belongs to task 003. Tests: `tests/battle/integration/dungeon.test.ts`, recovery tests and SQL support.

Use the current Drizzle transaction style and `captureStartingBuilds`/`restoreStartingBuilds` conventions. Preserve the public dungeon and battle ID response shapes. Combat rules, spell balance and authenticated session handling are out of scope.

## Implementation steps

1. **Represent and claim an attempt atomically.** Persist battle ID, dungeon ID, wave and immutable starting builds/resources. Store or derive the exact active attempt identity, not just a boolean. Lock the dungeon row or use a conditional claim inside the same transaction that creates the attempt and participants; check `cleared` there too. A concurrent request may reject or return the same attempt, never create a second one. Preserve the current public `activeBattle` view for callers.
   Verify: `bun test --preload ./tests/battle/support/quiet.ts ./tests/battle/integration/dungeon.test.ts -t 'saved HP|overlapping start'` → both tests pass.
2. **Apply completion by identity once.** Look up the requested attempt. Atomically claim its unprocessed completion, grant loot/XP, persist character resources and advance a victory to `attempt.wave + 1`; a defeat leaves that wave available. Clear active state only when it still refers to this attempt. Old or duplicate completion cannot mutate a newer attempt. Keep a durable completion marker even if transient participant/active-battle records are cleaned up.
   Verify: `bun test --preload ./tests/battle/support/quiet.ts ./tests/battle/integration/dungeon.test.ts -t 'lost attempts|repeating completion|old completion|reward write|scoped'` → all selected progression, idempotency and rollback cases pass.
3. **Enforce database guarantees and compatibility.** Add appropriate uniqueness for attempt identity and reward identity (for the current schema, one reward bundle per battle/user), backed by the transaction rather than an application-only check. Inventory existing duplicate/ambiguous rows before enforcing new constraints. Frozen builds must retain current health/mana, loadout and modifiers needed for repeatable battle creation; keep a deliberate fallback for legacy records that lack snapshots.
   Verify: `bun tests/battle/run.ts integration/dungeon recovery.test.ts` → all selected tests pass. Add concurrent completion and creation-failure rollback cases to the same SQL harness.

## Tests and completion criteria

The PGlite harness executes real SQL generated from the application's Drizzle schema, including filters, constraints and rollback. Preserve its passing controls. It serializes queries on one connection: add a disposable PostgreSQL integration check with two connections for the chosen locking/claim strategy before claiming production concurrency correctness.

- Loss/retry sequences, duplicate wins/defeats, stale completions, overlapping starts, snapshot handoff and transactional failure tests pass.
- A new test repeats completion after the next attempt has started and verifies rewards, XP, active identity and saved resources stay unchanged.
- `bun run typecheck` and `bun run typecheck:battle` exit 0; run `bun run test:battle` and report unrelated remaining findings.
- Schema changes include a reviewed migration path. Existing data is not discarded to satisfy uniqueness.
- Update task 002 in `plans/README.md`.

Run `git diff --stat 3835a60..HEAD -- apps/server/src/db apps/server/src/game-usecases apps/server/src/routers/dungeon-router.ts apps/server/src/battle/starting-builds.ts tests/battle` first. Use a `codex/` branch if creating one. Report ambiguous duplicate production data before choosing a destructive reconciliation.

The user confirmed that creators and participating character owners may start an attempt. This rule is implemented and was checked locally for both permitted roles and an unrelated owner, without editing test files.
