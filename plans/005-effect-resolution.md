# 005 — Centralize effect installation and damage reactions

**Status:** Complete; accepted replay break recorded in the index. **Priority:** P1. **Effort:** M. **Risk:** medium. **Planned at:** `3835a60`, 10 September 2026. **Dependencies:** 001's outcome/provenance contract and 004's clocks/death transition. **Primary findings:** B01, B02, B03, B04.

## Implementation result — 10 September 2026

All spell/passive effects use one installation path that binds source, target, origin, manager, tracking and hooks. Shields initialize after target binding; periodic passives retain effect provenance. Ineligible vamp contributes nothing, and reflected damage cannot recursively reflect. Hook iteration also remains stable when a spent shield removes itself. The effect suite and all 11 passive-matrix checks pass; a separate stacked-shield probe confirmed both shields absorb damage and expire.

The committed test files are unchanged, per the user’s instruction. See [verification results](verification-results.md) for the full run, independent checks and the three historical resimulation failures.

The user's later instructions supersede the planned test additions below and accept those three historical failures. All other completion checks pass; see the [confirmed decisions](README.md#confirmed-decisions).

## Problem and intended result

An inapplicable lifesteal branch leaves a null healing result that crashes result merging. Shields read their target before context exists. A passive directly appends a HOT without registering it for ticking or replay. Reflection recursively invokes reflection with no origin distinction.

One effect application interface should establish context, registration and lifecycle ownership for spells, passives and secondary effects. One reaction resolver should carry damage origin and compose valid outcomes. Definitions provide amounts and rules; they do not wire their own lifecycle or recursively re-enter the entire damage process without context.

## Current state and scope

`apps/game/src/calculator.ts:211` currently asserts away a possible null:

```ts
return this.mergeHandlerReturns([damageReturn, healing!]);
```

`effect/max-hp-shield.effect.ts:9` reads `this.getTarget().maxHealth` in its constructor. `passive-skills/titans-resurgence.passive.ts:19` calls `holder.applyEffect(new HealingOverTimeEffect(...))` directly. Both `effect/reflection.effect.ts` and `passive-skills/thorn-carapace.passive.ts` call `handler.damage` from their incoming-damage hook without a reaction origin.

In scope: `apps/game/src/{calculator.ts,battle-types.ts,lifecycle-hooks.ts,types.ts,bm.ts,base-entity.ts}`, `modules/effect.module.ts`, effect/passive base interfaces and the affected producers under `effect/` and `passive-skills/`. New reaction/application helpers belong beside this existing logic. Tests: `rules/effects.test.ts`, spell/passive sweeps and necessary support. Preserve the lifecycle phases from task 004 and the ordered event contract from task 001. Do not alter targeting policy or damage formulas to mask these failures.

## Implementation steps

1. **Install through one complete interface.** Constructors only capture configuration. Before target-dependent initialization, attach source, target, manager and typed provenance. Register the effect in the entity, clock and replay tracking through the same operation. Handle rejected effects and removal consistently. Passive-origin HOT/DOT must not require a nonexistent originating spell just to tick or describe itself. Migrate Aegis and Titan's Resurgence as callers of this general interface.
   Verify: `bun test --preload ./tests/battle/support/quiet.ts ./tests/battle/rules/effects.test.ts -t 'Aegis|Titan'` → construction, registration, healing and expiration pass.
2. **Compose valid results without changing eligibility.** Make an inapplicable vamp/heal/effect contribution an explicit empty result or omit it through a typed composition path. Preserve the existing physical-lifesteal and magical-vamp rules. Do not make all damage types heal simply to avoid null, and do not swallow unexpected exceptions.
   Verify: `bun test --preload ./tests/battle/support/quiet.ts ./tests/battle/rules/effects.test.ts -t 'Bloodfang|Soulleech|matching physical'` → matching and nonmatching damage cases pass.
3. **Carry reaction cause through damage resolution.** Distinguish direct and reflected damage and preserve source attribution. Reflected damage must not recursively trigger another reflection chain. Apply shared mitigation, death and event recording consistently, using actual resolved results. Use an explicit reaction policy; an arbitrary stack-depth limit or catching stack overflow is not a repair.
   Verify: `bun test --preload ./tests/battle/support/quiet.ts ./tests/battle/rules/effects.test.ts -t 'Thorn Carapaces|Deflecting Stance|lifesteal cannot revive'` → termination and liveness tests pass.

## Tests and completion criteria

Add constructor/context tests using multiple effect kinds and origins, a passive-produced periodic effect with no spell source, rejected application, repeated removal, and mirrored reflection with shields/overkill. Assert visible HP/effects/events through public interfaces instead of spying on private hook calls.

- All focused checks pass; every installed effect is tickable, removable and representable in replay.
- `bun tests/battle/run.ts sweeps/spells sweeps/passives` exits 0 after the prerequisite proc-miss repair. New legal combinations cannot crash or partially publish a result.
- `bun run typecheck` and `bun run typecheck:battle` pass. Run `bun run test:battle`; targeting/calculation defects may still fail.
- Update task 005 in `plans/README.md`.

Run `git diff --stat 3835a60..HEAD -- apps/game/src tests/battle` first and reconcile prerequisite changes. If a producer cannot express its origin through the shared interface, extend that interface explicitly rather than fabricate a spell ID. Keep damage-type eligibility and reflection percentages unchanged. Use a `codex/` branch if creating one.
