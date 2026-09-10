# 006 — Resolve every impact against current legal targets

**Status:** Complete; accepted replay break recorded in the index. **Priority:** P2. **Effort:** S–M. **Risk:** medium. **Planned at:** `3835a60`, 10 September 2026. **Dependencies:** 004's liveness/clock rules and 005's reaction interface. **Primary findings:** B18, B19, B20, B26.

## Implementation result — 10 September 2026

Eligibility, complete selection and impact-time liveness are shared rules. Single and unique selection are uniform and do not mutate the input. Random bounces refresh the living enemy pool, charged attacks keep only surviving selected targets, and multi-hit attacks stop when the caster or target dies. All cast checks, 39 spell sweeps and 300 authored encounters pass.

The committed test files are unchanged, per the user’s instruction. See [verification results](verification-results.md) for the full run, independent checks and the three historical resimulation failures.

The user's later instructions supersede the planned test additions below and accept those three historical failures. All other completion checks pass; see the [confirmed decisions](README.md#confirmed-decisions).

## Problem and intended result

Random selection can include allies, list position changes selection probability, a dead selected target cancels an entire delayed attack, and multi-hit attacks keep hitting corpses. These are different failures of the same rule: eligibility must be explicit and evaluated at the right time.

A legal target is permitted for this caster and spell now. A selected target is the entity chosen from that legal set. Validate the original command as a complete selection; resolve delayed and repeated impacts against the currently surviving legal subset without interpreting an already-paid action as a new command.

## Current state and scope

`apps/game/src/utils/random-in-array.ts:11` selects with `Math.round(rng() * (array.length - 1))`, giving edge slots smaller probability. Its unique sampler repeatedly deletes from a set using the original array. `StormPulseSpell._cast` samples `getAliveEntities()` without filtering opposing teams. `VoltLashSpell._cast` captures living enemies once before four hits. Bladestorm applies its second hit unconditionally. Arcane Channeling validates the entire old selection at release time.

In scope: the sampling utility, shared target/resolution helpers in `apps/game/src/spells/base/` and `modules/`, shared damage/effect entry checks in `calculator.ts`, `apps/server/src/battle/commands.ts`, `enemies/base/base.enemy.ts` where needed, and the callers `spells/{storm-pulse.ts,volt-lash.ts,bladestorm-rythm.ts,arcane-channeling.ts}`. Tests: `rules/casts.test.ts`, enemy action and encounter sweeps. Reuse the existing `getBattleTargets` contract for user choices and the seeded battle PRNG for committed random selection.

## Implementation steps

1. **Separate eligibility, selection and impact validation.** Centralize team/liveness/cardinality rules. Player target queries and enemy selection should use the same eligibility logic. Queries do not draw from combat RNG. Keep request-time rejection for incomplete/duplicate/invalid target sets. An already-started delayed action filters its original selected IDs at impact time; it neither cancels survivors nor automatically selects replacement entities.
   Verify: `bun test --preload ./tests/battle/support/quiet.ts ./tests/battle/rules/casts.test.ts -t 'Storm Pulse|Arcane Channeling'` and `bun tests/battle/run.ts commands.test.ts sweeps/enemy-actions` → all selected tests pass.
2. **Sample uniformly from the legal pool.** Use equal-width index intervals for a single choice and sampling without replacement for unique choices. Handle empty input, zero selections and counts above the available pool deliberately. Do not mutate caller arrays. Preserve deterministic seeded operation and reject invalid counts without a nonterminating loop.
   Verify: `bun test --preload ./tests/battle/support/quiet.ts ./tests/battle/rules/casts.test.ts -t 'sampling|random target'` → both distribution tests pass; add the empty/count/nonmutation cases here.
3. **Recheck before each impact.** Recompute eligible living candidates for random bounces; skip later hits on an already-dead selected target. A corpse cannot take another effective hit, trigger retaliation or receive a new status. Preserve the spell's selection policy: a single-target multi-hit action is not automatically a retargeting bounce, and repeated visits to a still-living target depend on the declared policy. If no legal target remains, finish the already-paid action with no further consequences.
   Verify: `bun test --preload ./tests/battle/support/quiet.ts ./tests/battle/rules/casts.test.ts -t 'corpse'` → Volt Lash and Bladestorm retaliation regressions pass.

## Tests and completion criteria

Add permutations of entity ordering, no surviving targets, one surviving selected target, changing eligibility during a reaction and a bounce with a low-HP first victim plus a healthy survivor. Assert results and emitted consequences, not call counts on private damage methods.

- All focused commands pass; request rejection remains side-effect-free and per-impact liveness is enforced.
- Both direct and unique distributions remain within the existing deliberately loose seeded tolerance.
- `bun run typecheck` and `bun run typecheck:battle` pass; run `bun run test:battle` and report remaining calculation failures.
- Update task 006 in `plans/README.md`.

Run `git diff --stat 3835a60..HEAD -- apps/game/src apps/server/src/battle/commands.ts tests/battle` first. Reconcile task 004/005 interfaces. Do not introduce resurrection, mind-control or new targeting modes in this repair. Preserve still-living repeat-target behavior unless the authored rule explicitly changes it. Coordinate Storm Pulse edits with task 007 and use a `codex/` branch if creating one.
