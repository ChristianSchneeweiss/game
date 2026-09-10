# Battle effect and passive audit

The application source was not changed. The regression suite asserts intended behavior, so its failures are evidence of unresolved defects. Two controls pass: matching physical lifesteal and independently expiring stacked stat modifiers.

Verification: `bun test plans/battle-audit/effect-checks.test.ts > plans/battle-audit/effects-test.log 2>&1` — **2 pass, 11 fail**, 13 tests, 32 assertions. One aggregate test covers **429 accepted-input cast attempts**: 39 registered spells × 10 registered single passives plus no passive. It observes 51 failures: 28 null-healing exceptions, 11 Aegis Wall exceptions, 11 Battle Roar proc misses returning null, and one Storm Pulse self-reflection stack overflow. All encounters, identities, and state in the tests are synthetic.

The earlier characterization run also directly measured the downstream effects of each bug before the assertions were changed into failing regression expectations. It passed all ten observations; the final suite intentionally fails when the desired invariant is violated.

## [EFFECT-01] [P1] Handle casts whose damage type has no matching vamp stat

- **Evidence**: `apps/game/src/calculator.ts:196` returns early only when both vamp stats sum to zero. `apps/game/src/calculator.ts:198` leaves healing null when the current damage type has no matching stat. `apps/game/src/calculator.ts:211` passes that null into `mergeHandlerReturns`; its dereference at `apps/game/src/calculator.ts:268` throws.
- **Trigger**: Bloodfang-equipped character casts a magical spell; Soulleech-equipped character uses Basic Attack or another physical spell. Emberbound Revenant is authored with Soulleech and Basic Attack at `apps/game/src/enemies/emberbound-revenant.ts:24`.
- **Observed / expected**: TypeError after target health, caster mana, and cooldown have already mutated; the cast event never appears. Expected a completed damage event, with no inapplicable lifesteal component. The single-passive matrix reproduces 28 affected spell combinations.
- **Impact**: Ordinary player builds and a current authored enemy can abort accepted battle actions after partial state mutation.
- **Effort**: S (hours, including regressions).
- **Risk**: LOW — make the optional healing return explicit; retain current semantics for successful physical lifesteal and magical vamp.
- **Confidence**: HIGH — two focused real casts, a successful matching-type control, and 28 matrix reproductions.
- **Fix sketch**: Return `damageReturn` when no healing was generated, or merge only defined handler results. Confirm intended omnivamp damage-type scope independently; no scope change is necessary to remove the exception.
- **Tests**: `effect-checks.test.ts:48` and `effect-checks.test.ts:60` fail on the exception; `effect-checks.test.ts:68` is the passing control; matrix at `effect-checks.test.ts:204`.

## [EFFECT-02] [P1] Initialize Aegis Wall shields after their combat context exists

- **Evidence**: `apps/game/src/effect/max-hp-shield.effect.ts:9` calls `getTarget()` in the constructor, before `Handler.effect` assigns the battle manager at `apps/game/src/calculator.ts:249`. `apps/game/src/spells/aegis-wall.ts:20` constructs that effect for every target.
- **Trigger**: Any legal Aegis Wall cast.
- **Observed / expected**: TypeError dereferencing an undefined battle manager; 35 mana is consumed, cooldown becomes 7, and no shield is attached. Expected a complete cast with initialized protective effects.
- **Impact**: The registered A-tier defensive spell cannot be used. All 11 passive variants in the matrix fail identically.
- **Effort**: S.
- **Risk**: LOW — initialization can be deferred to `onApply`, or the spell can supply the resolved shield amount. The authored caster-versus-recipient HP basis should be preserved deliberately.
- **Confidence**: HIGH — real `safeCastSpell` reproduction and all 11 matrix variants.
- **Fix sketch**: Avoid entity lookup during effect construction. Resolve shield capacity once context is attached, or pass capacity from the spell's factory. Verify ally recipients with different maximum HP, stacked shields, and depletion after fixing construction.
- **Tests**: `effect-checks.test.ts:79` fails on construction; matrix at `effect-checks.test.ts:204`.

## [EFFECT-03] [P1] Prevent reflected damage from recursively reflecting

- **Evidence**: `apps/game/src/passive-skills/thorn-carapace.passive.ts:12` and `apps/game/src/effect/reflection.effect.ts:13` send reflected damage through the same full damage handler. `apps/game/src/calculator.ts:65` invokes the opposing damage hooks again with no reflection-origin guard.
- **Trigger**: Two opposing Thorn Carapace holders hit each other; Deflecting Stance meets an opposing Thorn Carapace. Thundermaw is authored with Thorn Carapace at `apps/game/src/enemies/thundermaw.ts:30`.
- **Observed / expected**: RangeError: maximum call stack size exceeded, even when repeated reflected values have reached zero. No original health damage is committed in the double-Thorn case. Expected bounded reflected damage and a completed cast.
- **Impact**: Valid defensive builds can crash a battle action. The matrix additionally finds Thorn Carapace + Storm Pulse self-reflection because Storm Pulse currently selects the caster; its friendly-fire root cause belongs to the spell audit.
- **Effort**: S–M.
- **Risk**: MED — explicitly define damage origin, which hooks reflected hits may invoke, and how multiple reflection effects compose.
- **Confidence**: HIGH — two focused reproductions plus the matrix self-hit case.
- **Fix sketch**: Carry an explicit reflected-damage marker or use a bounded dedicated reflected-damage path. Stop zero damage before reactive hooks; zero suppression alone does not define correct positive-damage reflection semantics.
- **Tests**: `effect-checks.test.ts:90` and `effect-checks.test.ts:99` fail with RangeError.

## [EFFECT-04] [P1] Register Titan's Resurgence healing through the effect handler

- **Evidence**: `apps/game/src/passive-skills/titans-resurgence.passive.ts:19` calls the entity's `applyEffect` directly. `apps/game/src/base-entity.ts:150` only pushes to `activeEffects`, bypassing the initialization and registration at `apps/game/src/calculator.ts:236`. The current Hollowed Oakwarden has this passive at `apps/game/src/enemies/hollowed-oakwarden.ts:30`.
- **Trigger**: Start a combat round with the holder below 30% HP for the first time.
- **Observed / expected**: A HOT is appended with no battle manager, source, target, spell source, lifecycle registration, or tracking event. It never heals at post-round. Its fourth end step throws `Battle manager not found` during expiration. Expected 7.5% max-health healing for four rounds with safe expiration and client-visible tracking.
- **Impact**: A current boss passive fails to heal and can abort combat after four holder turns; client effect state also cannot match the engine.
- **Effort**: S–M.
- **Risk**: MED — passive-origin effects need valid provenance even though the passive is not an entity-owned spell.
- **Confidence**: HIGH — registration, missing healing, and expiration failure were directly measured.
- **Fix sketch**: Apply the HOT through the centralized handler. Ensure HOT source resolution supports passive-origin effects; `HealingOverTimeEffect.onPostRound` currently assumes a spell lookup exists even when its source is a passive. Emit application/tick/removal events through the normal timeline.
- **Tests**: `effect-checks.test.ts:132` fails its context invariant; the prior characterization directly verified no healing and the fourth-step exception.

## [EFFECT-05] [P1] Keep lethal reflection final when applying lifesteal

- **Evidence**: `apps/game/src/calculator.ts:202` heals the source after nested reflection has already killed it. `apps/game/src/base-entity.ts:146` allows healing a zero-health entity. Death bookkeeping is established at `apps/game/src/bm.ts:197` and is not undone by ordinary healing.
- **Trigger**: A Bloodfang holder with 1 HP deals a 100 physical-damage hit to a Thorn Carapace target.
- **Observed / expected**: Reflection kills the caster, adds it to `deadEntities`, queues a DEATH event, and removes it from the turn queue. The original hit then grants 10 lifesteal HP. The entity is simultaneously alive by `isDead()` and dead in the manager. Expected the caster to remain dead; any intended resurrection must use an explicit revival transition.
- **Impact**: Win checks, current turn order, death events, and subsequent damage can disagree about whether the caster is alive.
- **Effort**: S.
- **Risk**: MED — keep death and resurrection semantics consistent across nested damage and healing sources.
- **Confidence**: HIGH — deterministic direct handler reproduction with currently registered passives.
- **Fix sketch**: Prevent ordinary lifesteal/vamp healing after source death, or establish an explicit atomic damage/death policy. Add a general dead-recipient healing guard if ordinary heals are never intended to revive.
- **Tests**: `effect-checks.test.ts:150` expects 0 HP but receives 10; prior characterization also asserts the stale dead map, missing queue entry, and pending DEATH event.

## [EFFECT-06] [P2] Make regeneration passives affect actual upkeep

- **Evidence**: `apps/game/src/base-entity.ts:83` derives health regeneration directly from bot status/vitality, and `apps/game/src/base-entity.ts:91` derives mana regeneration directly from intelligence. These bypass `healthRegen` and `manaRegen`, which are modified by `apps/game/src/passive-skills/vital-wellspring.passive.ts:14` and `apps/game/src/passive-skills/mystic-flow.passive.ts:14`.
- **Trigger**: An injured or mana-depleted holder has Vital Wellspring or Mystic Flow. Water Elemental and Sky Serpent are current authored holders.
- **Observed / expected**: Both exposed regeneration attributes increase by 25%, but a holder and identical baseline regenerate exactly the same amounts. With vitality/intelligence 20, starting HP/mana 10, both end at 20 HP and 14 mana. Expected actual regeneration to improve according to the passives.
- **Impact**: Both passives grant no advertised combat benefit; displayed attributes disagree with upkeep.
- **Effort**: S.
- **Risk**: MED — the exposed health-regeneration base currently uses vitality/4 while upkeep uses vitality/2 or a bot constant, so preserve or intentionally migrate that balance when centralizing the calculation.
- **Confidence**: HIGH — paired identical entities with and without the passives.
- **Fix sketch**: Centralize effective regeneration and apply its modifiers during upkeep. Add player and bot cases so the passive correction does not accidentally halve existing player regeneration.
- **Tests**: `effect-checks.test.ts:118` fails because boosted HP is 20, equal to the baseline; earlier characterization measured identical mana too.

## [EFFECT-07] [P2] Give a two-turn DOT two ticks regardless of initiative

- **Evidence**: `apps/game/src/spells/cinderbrand.ts:25` creates a duration-2 burn. `apps/game/src/base-entity.ts:134` decrements/removes effects at the target's end step via `apps/game/src/effect/base-effect.ts:36`, whereas `apps/game/src/effect/dot.effect.ts:26` only deals damage at the end of the whole combat round.
- **Trigger**: Cinderbrand successfully burns a slower target that has yet to act in the current round.
- **Observed / expected**: With the same seed and successful authored 30% proc, a slower caster produces two ticks/10 damage; a faster caster produces one tick/5 damage. Expected two 5-damage ticks in either initiative ordering. Rupture uses the same duration-2 DOT lifecycle.
- **Impact**: Increasing initiative can halve DOT damage; duration and total damage depend on target position in the queue rather than the advertised effect duration.
- **Effort**: S–M.
- **Risk**: MED — choose a consistent tick/expiration phase without changing stun, charge, and turn-based buff semantics accidentally.
- **Confidence**: HIGH — real `safeCastSpell` plus `postTurn`, identical deterministic seed, only caster agility changed.
- **Fix sketch**: Couple DOT duration consumption to actual DOT ticks, or otherwise ensure expiration follows its final scheduled tick. Retain comparative initiative regression coverage.
- **Tests**: `effect-checks.test.ts:164` expects `{damage: 10, ticks: 2}` but receives `{damage: 5, ticks: 1}` for the faster caster.

## [EFFECT-08] [P3, dormant path] Return the configured base critical damage

- **Evidence**: `apps/game/src/base-entity.ts:67` initializes base critical damage to 1, but the switch after `apps/game/src/base-entity.ts:221` omits `critDamage` and defaults to zero at line 236. `apps/game/src/calculator.ts:48` uses this lookup for the critical multiplier.
- **Trigger**: Query any entity's critical damage, or calculate damage for an entity with positive critical chance.
- **Observed / expected**: Configured base critical damage 1 is returned as 0; a forced 100-damage critical hit still deals 100 instead of 200. Expected attribute lookup to preserve the configured base value, then apply modifiers.
- **Impact**: Incorrect exposed critical-damage values; critical-hit damage would be wrong once a positive crit-chance source exists. **Reachability limitation:** current authored entities default to zero crit chance, and Keen Instincts only multiplies that zero. No current positive crit-chance source was found, so this is not presented as a currently observed natural crit failure.
- **Effort**: S.
- **Risk**: LOW — add the missing switch case; verify Keen Instincts composes with the base value.
- **Confidence**: HIGH for the lookup/damage defect, explicitly dormant for natural combat crits.
- **Fix sketch**: Return `baseSpecialAttributes.critDamage` for that attribute. Keep content/balance changes that enable crit chance separate from this lookup repair.
- **Tests**: `effect-checks.test.ts:107` expects 1 but receives 0. The earlier characterization forced crit chance to 1 and measured the unchanged 100 damage.

## Boundaries and handoff

- Battle Roar's null result on a failed chance roll and Storm Pulse's friendly-fire selection are also reproduced by the passive matrix but belong to the separate spell audit.
- Client ordering of reflected-damage events versus healing is being audited by the root task; the death/lifesteal state inconsistency above is separate.
- Legacy `CompositeEffect` and plain `ShieldEffect` machinery was inspected but no unverified legacy-only behavior is promoted to a current-content finding. Aegis Wall fails before shield composition can be exercised through a normal registered cast; depletion/stacking should be covered when repairing initialization.
- Effect hook direction and negative intermediate damage deserve regression coverage if new nontrivial healing/effect hooks or shield mechanics are enabled; neither is counted as a current-content bug without a verified trigger here.
