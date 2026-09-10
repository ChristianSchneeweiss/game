# 004 — Unify turn advancement, effect clocks and death

**Status:** Complete; accepted replay break recorded in the index. **Priority:** P1. **Effort:** M. **Risk:** high. **Planned at:** `3835a60`, 10 September 2026. **Dependency:** 001's ordered outcomes. **Primary findings:** B06, B07, B08, B22, B23.

## Implementation result — 10 September 2026

Turn completion keeps the actual actor even when resolution changes the queue. Queue construction is pure; blocked opportunities advance their effects before any upkeep. Dead actors cannot receive ordinary healing or upkeep. The user confirmed that DOT/HOT duration means affected-character turns. Their shared periodic lifecycle credits a tick delivered at round end to the next holder end step, preventing duplicate or missing final ticks. All 6 turn and 24 effect checks pass.

The committed test files are unchanged, per the user’s instruction. See [verification results](verification-results.md) for the full run, independent checks and the three historical resimulation failures.

The user's later instructions supersede the planned test additions below and accept those three historical failures. All other completion checks pass; see the [confirmed decisions](README.md#confirmed-decisions).

## Problem and intended result

Channeling removes its caster from the queue before `postTurn` chooses which actor just finished. Charge-release callbacks can kill entities after a queue's living-entity snapshot was collected. Ordinary healing revives dead actors without a revival transition. DOT/HOT tick at one phase and consume duration at another. The first decision skips upkeep.

Give the combat clock ownership of actor completion and lifecycle phases. Give death one consistent transition. A combat round is a traversal of the turn queue, including additional actions; it is not a dungeon wave.

## Current state and scope

`apps/game/src/bm.ts:343` identifies the finished actor using the already-mutated queue:

```ts
const currentEntityId = this.getCurrentRound().orderQueue.shift();
if (!currentEntityId) {
  return;
}
```

`calculateOrderQueue()` captures `getAliveEntities()` and then runs stun/charge end-step callbacks inside filtering. `BaseEntity.onEndStep()` decrements every effect through `onEndStep`, while DOT/HOT resolve in `onPostRound`. `BaseEntity.applyHealing` currently adds health without checking death.

In scope: `apps/game/src/{bm.ts,base-entity.ts,battle-types.ts,lifecycle-hooks.ts,types.ts}`, effect lifetime implementations under `effect/` (especially base, charge, stun, DOT, HOT, extra-action), and turn-driving calls in `apps/server/src/battle/commands.ts`. Update only consumers necessary for explicit effect lifetime data and the associated tests. Use existing public lifecycle/command interfaces as seams; keep spell damage numbers and persistence logic out of this task.

## Implementation steps

1. **Advance the actor whose action finished.** Capture the active actor/turn opportunity before resolution. Queue edits cannot substitute the next actor for it. Normalize an empty queue through due round transitions until a live actor can act or the battle finishes. Queue construction must not hide mutation callbacks; resolve due work first and recheck life/eligibility afterward. Preserve deliberate extra actions—duplicate actor IDs are not inherently a bug.
   Verify: `bun test --preload ./tests/battle/support/quiet.ts ./tests/battle/rules/turns.test.ts -t 'following ally|last initiative|death during'` → all queue/death-after-release cases pass.
2. **Define the lifecycle phases and clocks explicitly.** Perform opening upkeep once before the first player or bot decision. Distinguish effects that expire on an actor's turn opportunity, after a combat-round tick, or at battle end. DOT/HOT with duration N must tick N times and consume N affected-character turns before expiration, regardless of initiative (user decision, 10 September 2026). Stun/channel clocks must continue while the actor cannot act. Tick first, then consume that tick's duration; a queue read must not itself tick effects.
   Verify: `bun test --preload ./tests/battle/support/quiet.ts ./tests/battle/rules/effects.test.ts -t 'over [123] rounds|two-turn Cinderbrand'` and `bun test --preload ./tests/battle/support/quiet.ts ./tests/battle/rules/turns.test.ts -t 'opening turn'` → all selected tests pass.
3. **Make liveness consistent everywhere.** Lethal damage removes all pending turns and records death once. Dead actors receive no upkeep, ordinary healing or lifesteal revival. Any future revival must be a separate explicit transition that restores eligibility and death bookkeeping together; implementing legacy resurrection content is not part of this task.
   Verify: `bun test --preload ./tests/battle/support/quiet.ts ./tests/battle/rules/effects.test.ts -t 'lifesteal cannot revive'` and `bun tests/battle/run.ts rules/turns commands.test.ts` → all selected checks pass.

## Tests and completion criteria

Add cases for both teams temporarily unable to act, death during each lifecycle phase, additional actions, repeated setup without duplicate opening upkeep, and effects added/removed while processing a phase. Keep pending phase iteration stable. If an old fixture depends on the broken timing, drive it until its declared release/expiration rather than weakening its state assertions.

- Every duration/initiative combination produces the declared number of ticks and no ticks after expiration.
- Live/dead HP, death bookkeeping and turn eligibility agree at every command boundary.
- Opening upkeep runs exactly once; channeling neither skips the next ally nor strands a battle.
- All focused checks and both `bun run typecheck` / `bun run typecheck:battle` pass.
- Run `bun run test:battle`; report remaining reaction, targeting and calculation failures. Update task 004 in `plans/README.md`.

Run `git diff --stat 3835a60..HEAD -- apps/game/src apps/server/src/battle/commands.ts tests/battle` first. Reconcile task 001's event changes. If a timing change would change an authored duration rather than repair its clock, record the rule choice explicitly. Future statuses must declare their clock; do not recreate countdowns in queue filters. Use a `codex/` branch if creating one.
