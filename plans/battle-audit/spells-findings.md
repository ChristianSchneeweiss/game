# Battle spell and AI correctness audit

Audit date: 2026-09-10. Application source and existing tests were not changed.

Verification command: `bun test plans/battle-audit/spell-checks.test.ts > plans/battle-audit/spells-test.log 2>&1`.

Result: **61 pass, 12 fail, 73 tests, 104,238 assertions**. Failure assertions describe desired behavior and are ready to become regressions after fixes. Two broad-sweep failures duplicate focused failures for Aegis Wall and Battle Roar; the player/bot Battle Roar failures share one root cause.

Coverage: all **39 registered spells**, each in 64 seeded scenarios (16 seeds × full/wounded/single-enemy/dead-member formations), totaling **2,496 casts** through real `getBattleTargets`/`castBattleSpell` commands. Each scenario checked resource bounds, deterministic/read-only server descriptions and targeting, and cast-event production. All 39 standalone inventory descriptions were also exercised. All **22 registered enemy types** passed their stock AI target/legal-count/mana-fallback checks. That AI targeting matrix deliberately omitted passives to isolate targeting; a separate live Sky Serpent reproduction retained its real passive. Effect internals were assigned to another audit.

## Confirmed findings

### [SPELL-01] Resolve failed Battle Roar procs as spent turns

- **Priority**: P1.
- **Evidence**: `apps/game/src/spells/base/status.spell.ts:27` returns `null` on a normal chance miss; `apps/game/src/spells/base/base.spell.ts:69` already spent resources; `apps/server/src/battle/commands.ts:89` and `:108` treat that result as command rejection; `apps/game/src/enemies/sky-serpent.ts:24` equips Battle Roar after Storm Pulse.
- **Trigger / observed vs expected**: A failed player stun spends 15 mana, sets cooldown to 4, emits no cast event and retains the same turn. A real Sky Serpent whose Storm Pulse is unavailable fails its Battle Roar under seeds 0, 4, 6, 7, 11 and 14 of the 16-seed regression, throws `Enemy action rejected: Sky Serpent`, and remains the active bot. A legitimate 40% miss should consume the action and continue the battle with a recorded cast.
- **Impact**: Player resources silently change on an apparent rejected command; an ordinary enemy chance roll can leave the fight on a bot turn with no player action available.
- **Effort**: S (hours), including focused player/bot regressions.
- **Risk**: LOW — distinguish a resolved miss from an invalid cast while preserving validation rejection behavior.
- **Confidence**: HIGH — code and real server-command reproductions.
- **Fix sketch**: Return a resolved empty/miss result from the status spell when its proc fails. Ensure it produces a cast event and advances exactly one turn without applying the status.
- **Tests**: `spell-checks.test.ts:145` (player), `:166` (real enemy), plus broad Battle Roar sweep; all fail on the current checkout.

### [SPELL-02] Make Storm Pulse descriptions independent of battle RNG

- **Priority**: P1.
- **Evidence**: `apps/game/src/spells/storm-pulse.ts:28` samples battle RNG during its damage formula; `:62` invokes that formula while describing the spell; `apps/game/src/spells/base/base.spell.ts:139` requires an assigned battle manager; `apps/server/src/routers/index.ts:95` constructs an unassigned spell for every inventory description.
- **Trigger / observed vs expected**: Describing a newly created Storm Pulse throws `TypeError` at `this.battleManager.getRNG`. This is the exact operation performed by `getMySpells`. All other 38 registered spell descriptions succeed. Inventory descriptions must work before joining a battle.
- **Impact**: Owning a Storm Pulse prevents the entire `getMySpells` mapping from completing, blocking the spell inventory response. The battle tooltip path itself is protected by `describeBattleSpell` and passed all RNG-purity checks.
- **Effort**: S (hours).
- **Risk**: LOW — keep random bonus selection in casting and calculate deterministic preview bounds separately.
- **Confidence**: HIGH — exact endpoint operation reproduced without a database dependency.
- **Fix sketch**: Remove RNG use from raw damage evaluation used by previews. Roll the optional bonus only during the cast and supply deterministic bounds when describing the ability.
- **Test**: `spell-checks.test.ts:116`; fails solely for Storm Pulse.

### [SPELL-03] Restrict Storm Pulse's random pool to opponents

- **Priority**: P1.
- **Evidence**: `apps/game/src/spells/storm-pulse.ts:44` samples `getAliveEntities()` without checking teams; `:65` promises up to three random enemies.
- **Trigger / observed vs expected**: In a caster + one ally + one enemy battle, a normal command damages all three. The deterministic regression lowers the caster from 1000 to 974 HP. The caster and ally should retain their HP.
- **Impact**: The ability always deals friendly fire in this common three-entity formation. Larger parties also compete with enemies for the three hit slots, changing encounter outcomes for both players and Sky Serpent.
- **Effort**: S (hours).
- **Risk**: LOW — filter by opposing team before selecting up to three living targets.
- **Confidence**: HIGH — source contract and real command reproduction agree.
- **Fix sketch**: Select random targets from living opponents of the caster and retain the three-target cap.
- **Test**: `spell-checks.test.ts:136`; fails with caster HP 974 instead of 1000.

### [SPELL-04] Release Arcane Channeling onto surviving targets

- **Priority**: P2.
- **Evidence**: `apps/game/src/spells/arcane-channeling.ts:32` captures the original target array; `:43` aborts the entire release if `validateTargets` fails; `apps/game/src/spells/base/base.spell.ts:122` requires every original target to still be alive and valid.
- **Trigger / observed vs expected**: Cast onto two enemies, kill one while charging, then execute the caster's normal EndStep release hook. The remaining enemy stays at 1000 HP and no second cast event is produced. The living enemy should still be hit.
- **Impact**: An ally killing any selected enemy wastes the whole 40-mana charged AoE and its skipped actions, even when other original enemies remain alive.
- **Effort**: S (hours).
- **Risk**: MED — delayed-target semantics should be explicit: preserve living original targets, or target all current enemies at release.
- **Confidence**: HIGH — isolated release reproduction through the real installed charge effect. Queue bookkeeping is separately audited.
- **Fix sketch**: Filter dead or otherwise invalid individual targets at release instead of aborting the entire action. Only skip the damage when no legal targets remain.
- **Test**: `spell-checks.test.ts:212`; fails with surviving target HP 1000.

### [SPELL-05] Stop multi-hit actions from striking corpses

- **Priority**: P2.
- **Evidence**: `apps/game/src/spells/volt-lash.ts:45` snapshots living enemies once before its four-hit loop, and `:52` repeatedly selects from that stale array. `apps/game/src/spells/bladestorm-rythm.ts:45` always dispatches the second strike without checking the first strike's death. `apps/game/src/calculator.ts:171` calculates and dispatches damage even for an already-dead target.
- **Trigger / observed vs expected**: Start two enemies with the first at 1 HP. Instrument the real handler while casting each spell through server commands. Across 16 seeds per spell, Volt Lash sent 24 hits to an already-dead enemy while another enemy remained alive; Bladestorm sent one corpse hit for every seed. Later hits should stop or reselect an eligible live target.
- **Impact**: Volt Lash wastes remaining bounces, and corpse strikes still run damage/effect/lifesteal hooks and contribute to reported damage. Bladestorm can run the entire second impact after its target has died.
- **Effort**: S (hours).
- **Risk**: MED — preserve intended repeated hits on living targets while defining stop/reselection after death.
- **Confidence**: HIGH — the spy observes target death before invoking the unmodified real damage handler.
- **Fix sketch**: Rebuild/filter the Volt Lash pool before each bounce, break when none remain, and skip Bladestorm's second hit after death. A common handler guard can prevent further after-death damage side effects.
- **Test**: `spell-checks.test.ts:227`; fails with the recorded corpse-hit list.

### [SPELL-06] Grant Earthshatter's promised defensive reward

- **Priority**: P2.
- **Evidence**: `apps/game/src/spells/earthshatter.ts:24` only configures a stun effect; `:36` promises +20 Armor and Magic Resistance until the battle ends after at least two enemies are stunned. `apps/game/src/spells/base/damage+effect.spell.ts:46` only applies the target effects and has no caster reward.
- **Trigger / observed vs expected**: Resolve a cast that records stuns on multiple enemies. Caster Armor and Magic Resistance remain 0; both should be 20 under the current player-facing rule.
- **Impact**: A successful S-tier ability omits its defensive benefit and gives players incorrect expectations about survival.
- **Effort**: S (hours).
- **Risk**: MED — define stacking across repeated Earthshatter casts when adding the battle-long modifier.
- **Confidence**: HIGH — successful status application recorded; reward absent in both state and implementation.
- **Fix sketch**: Count enemies actually stunned and apply the promised caster defense modifier when the threshold is met. Ensure the duration and repeat-cast rule match the intended ability contract.
- **Test**: `spell-checks.test.ts:183`; fails with Armor 0 instead of 20.

### [SPELL-07] Implement Tidepiercer Thrust's advertised defense-ignore proc

- **Priority**: P2.
- **Evidence**: `apps/game/src/spells/tidepiercer-thrust.ts:17` is only a basic physical damage module; `:29` promises a 30% chance to ignore 25% of target defense. `apps/game/src/spells/base/damage.spell.ts:21` forwards the damage without a spell-specific penetration change.
- **Trigger / observed vs expected**: A 20-Strength caster produces 32–37 raw damage against 40 Armor. Every one of 64 seeded casts deals 0 damage. A successful 25%-ignore proc leaves 30 Armor and should deal 2–7 damage; there is no implementation of that proc.
- **Impact**: The advertised anti-defense ability cannot penetrate the armor it claims to sometimes bypass.
- **Effort**: S (hours).
- **Risk**: MED — apply penetration only to this cast and preserve the ordinary attacker's penetration and effect ordering.
- **Confidence**: HIGH — absent branch in the complete spell implementation, plus 64 seeded command reproductions.
- **Fix sketch**: Roll the proc during casting and pass its temporary defense reduction through damage calculation for that impact only.
- **Test**: `spell-checks.test.ts:245`; fails with 0 penetrating casts.

### [SPELL-08] Select random array entries with equal probability

- **Priority**: P2.
- **Evidence**: `apps/game/src/utils/random-in-array.ts:11` uses `Math.round(rng() * (array.length - 1))`; `apps/game/src/spells/volt-lash.ts:52` uses this for enemy selection. The same helper is used by `uniqueRandomFromArray`, including enemy targeting.
- **Trigger / observed vs expected**: For four equal enemy slots, 60,000 seeded picks produce counts `[9992, 19799, 20158, 10051]`. Uniform random selection should give approximately 15,000 for each slot. The first and last intervals have half the width of the middle intervals.
- **Impact**: Middle positions are about twice as likely to be hit by Volt Lash as edge positions despite no weighting rule. The without-replacement helper inherits positional bias through its removal choices.
- **Effort**: S (hours).
- **Risk**: LOW — changes random-target distribution and deterministic recording results for new simulations, so existing golden recordings should be assessed deliberately.
- **Confidence**: HIGH — exact interval math and seeded helper reproduction.
- **Fix sketch**: Use equal-width index intervals, such as floor of RNG times array length. Keep empty-array handling and verify seeded single-pick and without-replacement distributions.
- **Test**: `spell-checks.test.ts:260`; fails with the distribution above.

## Cross-audit result and design uncertainty

- **Aegis Wall**: Every one of its 64 command scenarios throws while constructing its shield after spending 35 mana. A focused regression is at `spell-checks.test.ts:128`. Effect implementation ownership and final finding belong to the effects audit; do not duplicate that finding here.
- **Final Verdict**: `apps/game/src/spells/final-verdict.ts:22` computes HP as a percentage and compares it to `0.1`, making the trigger **0.1%**, not 10%. A target at 5% HP survives the ordinary strike in `spell-checks.test.ts:204`. This is suspicious but the intended threshold was not established by an explicit current rule, so treat it as a design verification item rather than a confirmed 10%-execute bug.
- **No additional AI legality failures**: The 22 registered enemy-type checks passed. They verify legal living targets, duplicate exclusion, exact target counts and zero-mana fallback, not strategic quality (such as choosing a heal only when useful).
- **No battle-description RNG mutation**: `describeBattleSpell` passed the state/RNG purity checks for all 39 spells. The standalone inventory path is the separate confirmed issue above.
