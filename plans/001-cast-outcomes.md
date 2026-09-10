# 001 — Resolve casts once and record ordered outcomes

**Status:** Complete; accepted replay break recorded in the index. **Priority:** P1. **Effort:** M–L. **Risk:** high. **Planned at:** `3835a60`, 10 September 2026. **Dependencies:** none. **Primary findings:** B05, B16, B17.

## Implementation result — 10 September 2026

Legal casts with no successful optional effect now commit their mana and cooldown once. Version 2 events carry explicit payment and ordered health impacts, including nested reactions and delayed casts. The client still reads version 1 saved events. Cast, turn and mounted-client checks pass.

The committed test files are unchanged, per the user’s instruction. See [verification results](verification-results.md) for the full run, independent checks and the three historical resimulation failures.

The user's later instructions supersede the planned test additions below and accept those three historical failures. All other completion checks pass; see the [confirmed decisions](README.md#confirmed-decisions).

## Problem and intended result

A valid status cast can spend mana and cooldown, then be treated as rejected because its optional effect did not proc. Delayed resolution looks like another paid cast to the client. Reflected damage is recorded after healing even though it happened before healing, changing the effect of health caps during replay.

Repair the shared action outcome and event contract: validation, payment, optional consequences and delayed consequences must have explicit meanings. A cast is a committed use of a spell; a battle replay displays resolved events and does not make combat decisions. Durable commitment is the responsibility of task 003, not a property to infer from an effect result.

## Current state and scope

- `apps/game/src/spells/base/status.spell.ts:28` returns `null` for an ordinary chance miss: `if (rng >= this.effectChance) return null;`.
- `apps/server/src/battle/commands.ts:89` interprets the result as rejection: `if (result === null) throw new Error("The spell was rejected.");`.
- `apps/game/src/spells/arcane-channeling.ts` emits another `SPELL_CAST` when its charge resolves.
- `apps/client/src/routes/battle/-presentation/timeline.ts:150` deducts the configured mana cost for every non-passive `SPELL_CAST` and later applies grouped damage before grouped healing.
- `apps/game/src/bm.ts:146` flushes the reaction buffer after publishing the root spell event. `thorn-carapace.passive.ts` records reflection through that buffer.

In scope: `apps/game/src/{battle-types.ts,timeline-events.ts,bm.ts,calculator.ts,types.ts}`, `spells/base/`, delayed-spell event adapters, effect/passive event emitters, `apps/server/src/battle/{commands.ts,protocol.ts}`, event serialization in `game-usecases/bm-storage.ts` and `lib/superjson-recipes.ts`, and client battle presentation/session consumers that read these events. New helpers should live beside the relevant existing module. Test files under `tests/battle/` are in scope.

Match existing TypeScript discriminated unions and Zod/SuperJSON serialization in `timeline-events.ts` and `protocol.ts`. Preserve request/revision checks in `commands.ts`. Damage formulas, target selection, effect clocks, dungeon persistence and general reflection policy belong to other tasks.

## Implementation steps

1. **Define the outcome contract at the resolver seam.** A legal cast can resolve with zero consequences. Invalid requests and genuine execution failures remain distinguishable. An empty effect result must not mean a rejected cast, and arbitrary exceptions must not be converted into successful no-ops. Use explicit spell/effect/passive provenance instead of manufacturing a new paid cast for passive or delayed activity.
   Verify: `bun test --preload ./tests/battle/support/quiet.ts ./tests/battle/rules/casts.test.ts -t 'Battle Roar|Sky Serpent'` → both proc-miss regressions pass; player and bot turns advance normally.
2. **Record resource commitment separately from impacts.** Introduce explicit paid-cast data and ordered consequences, using a discriminated event shape or ordered child records. Charge release, DOT/HOT, reflection and passive activation cannot charge mana or restart cooldowns. Record actual applied amounts after caps and mitigation. Preserve the actual order of nested damage/healing; a total by target is insufficient when operations do not commute.
   Verify: `bun test --preload ./tests/battle/support/quiet.ts ./tests/battle/rules/turns.test.ts -t 'client|reconstruction'` → delayed payment and reflection/capped-healing checks pass.
3. **Make the client consume the contract.** Update timeline reconstruction and the mounted hook as needed. Keep one compatibility adapter/version path for existing recorded battles; do not silently invent missing historical event information or add a named-spell exception to the reducer.
   Verify: `bun tests/battle/run.ts integration/client timeline.test.ts live-recordings.test.ts playback.test.tsx session.test.tsx recovery.test.ts commands.test.ts` → all selected tests pass.

## Tests and completion criteria

Add focused outcome tests for a valid zero-impact cast, nested damage followed by capped healing, delayed release, and passive/effect activity that costs no mana. Exercise live updates and cold reconstruction from the same events. Keep stale revisions, invalid ownership/targets and unavailable spells rejected without mutation.

- All three verification commands above pass; old recordings remain readable.
- `bun run typecheck` and `bun run typecheck:battle` exit 0.
- Run `bun run test:battle`; report remaining failures by finding. B09/B10 persistence failures and unrelated combat bugs may remain at this stage.
- Update task 001 in `plans/README.md`. Do not change unrelated user files or publish anything as part of this task.

Before implementation, run `git diff --stat 3835a60..HEAD -- apps/game/src apps/server/src/battle apps/client/src/routes/battle tests/battle` and reconcile actual drift. Use a `codex/` branch if creating one. If a required historical value cannot be reconstructed, document that compatibility limit rather than changing old outcomes to guessed values. Future event emitters must use this same outcome contract.
