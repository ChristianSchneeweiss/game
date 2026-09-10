# 007 — Share resolved attributes, pure formulas and conditional rules

**Status:** Complete; accepted replay break recorded in the index. **Priority:** P2. **Effort:** M. **Risk:** medium. **Planned at:** `3835a60`, 10 September 2026. **Dependencies:** 004's effect clocks and 005's application/outcome interface. **Primary findings:** B14, B21, B24, B25, plus the configured critical-damage defect. **Related decision:** Final Verdict's execute threshold. Coordinate after 006 for shared Storm Pulse edits.

## Implementation result — 10 September 2026

Upkeep reads resolved regeneration attributes while preserving unmodified base values; critical damage reads its configured multiplier. Damage descriptions use pure formulas, with conditional damage and defense penetration represented as reusable rules. Earthshatter grants its declared battle-long defenses through the shared conditional-effect primitive. Final Verdict uses the user-confirmed 10% threshold; separate 9.9%, 10% and 10.1% boundary checks pass. All calculation/catalog checks pass.

The committed test files are unchanged, per the user’s instruction. See [verification results](verification-results.md) for the full run, independent checks and the three historical resimulation failures.

The user's later instructions supersede the planned test additions below and accept those three historical failures. All other completion checks pass; see the [confirmed decisions](README.md#confirmed-decisions).

## Problem and intended result

Regeneration bypasses resolved attributes, the base critical multiplier is omitted from attribute lookup, a tooltip formula draws battle randomness, and two advertised conditional stat rules have no implementation. The common repair is a reliable calculation path plus small composable rule primitives.

Resolve attributes consistently. Evaluate numeric ranges without a battle manager or RNG. Perform chance decisions only during resolution, then apply their modifiers through the shared damage/effect interfaces. Spell definitions declare these rules; they should not duplicate calculation or lifecycle machinery.

## Current state and scope

- `apps/game/src/base-entity.ts:83` computes health upkeep directly as `this.isBot ? 2 : this.getAttribute("vitality") / 2`, bypassing `healthRegen` modifiers. Its base getter instead contains a vitality/4 formula. Mana upkeep similarly bypasses `manaRegen`.
- `getBaseValueAttribute` handles `critChance` but omits `critDamage`, then silently returns 0 for unhandled keys. Configured base `critDamage` is 1.
- `spells/storm-pulse.ts:29` calls `this.getRNG()` from `attributeScaling`, which descriptions call without an assigned battle manager.
- Earthshatter's description promises +20 armor and magic resistance until battle end after at least two stuns; its definition only composes damage and stun. Tidepiercer describes a 30% chance to ignore 25% of defense but only configures ordinary damage.

In scope: `apps/game/src/{base-entity.ts,calculator.ts,entity-types.ts,types.ts}`, existing damage/healing/effect modules and stat-modifier effects, small conditional-rule helpers beside them, `spells/{earthshatter.ts,tidepiercer-thrust.ts,storm-pulse.ts}`, description callers in `apps/server/src/battle/commands.ts` and `routers/index.ts`, and their tests. Preserve the established target policy, damage reaction policy, spell costs and base damage numbers. A general spell DSL, item system rewrite and balance redesign are outside scope.

## Implementation steps

1. **Use one resolved attribute path.** Make upkeep consume resolved regeneration attributes and make the base mapping complete for every declared attribute key, including `critDamage`. Preserve current unmodified combat regeneration as the compatibility baseline: character health regeneration VIT/2, enemy health regeneration 2, mana regeneration INT/5. Reconcile the getter with that baseline before adding modifiers; blindly using its current VIT/4 formula would introduce a balance change and break opening-upkeep expectations. Keep critical chance unchanged while honoring the configured critical multiplier.
   Verify: `bun test --preload ./tests/battle/support/quiet.ts ./tests/battle/rules/effects.test.ts -t 'critical damage|Mystic Flow'` and `bun test --preload ./tests/battle/support/quiet.ts ./tests/battle/rules/turns.test.ts -t 'opening turn'` → all selected cases pass. Add independent health-only and mana-only modifier tests plus caps and expiration.
2. **Separate chance decisions from pure calculation.** Damage/range formulas receive explicit inputs. Chance rolls happen in the resolver using the battle PRNG; descriptions inspect possible numeric outcomes without sampling. Move Storm Pulse's chance-based bonus into a reusable conditional damage contribution, then have inventory and battle tooltips use pure range evaluation. Do not create a fake battle manager or substitute a default RNG for tooltips.
   Verify: `bun test --preload ./tests/battle/support/quiet.ts ./tests/battle/rules/casts.test.ts -t 'inventory spell'` and `bun tests/battle/run.ts sweeps/spells recovery.test.ts` → outside-battle descriptions and read-only/RNG checks pass for the registry.
3. **Compose conditional stat effects from resolved outcomes.** Add narrowly scoped primitives to the existing modules: an attack-local penetration modifier and a follow-up effect conditional on actual successful applications. Declare Tidepiercer's 30%/25% rule without temporarily mutating target armor or permanently changing caster penetration. Declare Earthshatter's +20/+20 battle-lifetime buff based on the count of targets stunned by that cast. Make chance scope explicit where required; count actual successful stuns rather than merely selected targets. Use the shared modifier stacking and lifetime rules.
   Verify: `bun test --preload ./tests/battle/support/quiet.ts ./tests/battle/rules/casts.test.ts -t 'Earthshatter|Tidepiercer'` → both regressions pass. Add proc/no-proc controls, insufficient-stun cases, repeat casts and checks that temporary penetration never leaks into the next attack.

## Tests and completion criteria

Use `rules/effects.test.ts` as the pattern for literal attribute examples and `rules/casts.test.ts` for real command/result examples. Keep the all-spell catalog and spell/passive matrix registry-driven. This task should make the last confirmed findings green after its predecessor repairs; do not replace behavior assertions with description-string checks.

- All focused commands, `bun run typecheck`, `bun run typecheck:battle`, and the full `bun run test:battle` exit 0 after tasks 001–006.
- Every numeric attribute used by resolution has an intentional base mapping. Displayed formulas and actual resolution use the same pure arithmetic inputs.
- Chance-driven modifiers are confined to their declared cast/hit/effect lifetime; unrelated spell outputs do not change.
- Update task 007 in `plans/README.md`.

Run `git diff --stat 3835a60..HEAD -- apps/game/src apps/server/src/battle/commands.ts apps/server/src/routers/index.ts tests/battle` first. Reconcile prerequisite work, especially effect lifetime and Storm Pulse target selection. Use a `codex/` branch if creating one.

The user confirmed Final Verdict's threshold as 10%. The implementation compares health fractions consistently, and local checks at 9.9%, 10% and 10.1% passed without editing test files.
