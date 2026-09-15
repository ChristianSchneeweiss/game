# Might assessments: developed-build reference v2

All 75 current definitions have an **Estimated** Might assessment under a
mid-to-end-game reference. Values are authored judgments informed by mechanics
and controlled probes. Neither the probes nor the Library automatically calculate
Might from damage. The Library derives tiers from the authored integer.

This revision changes assessment inputs and ratings. It does not alter live
character attributes, equipment, spell effects, enemy stats, rewards or loot.
Ordinary Library damage previews remain independently adjustable and default to
attributes 20; their numbers are not the inputs to the published Might rating.

The canonical inputs are in [reference-profile.ts](../../apps/game/src/might/reference-profile.ts),
shared by the assessment tools. Every record links to a v2 family section below
and includes its conditions and individual rationale:

- [Spell records](../../apps/game/src/might/spell-assessments.ts)
- [Equipment and passive records](../../apps/game/src/might/equipment-and-passive-assessments.ts)
- [Enemy records](../../apps/game/src/might/enemy-assessments.ts)
- [Family conditions](../../apps/game/src/might/references.ts)

## Developed character assumptions

Each build has **200 base attribute points**, equivalent to a level-41 budget
from the current 40-point starting allocation and four points per level-up.
Level 41 is the chosen design benchmark, not a claim about observed player levels
or an implemented level cap. Use a suitable build for the ability being assessed,
with equal progression budgets across roles.

| Build | STR | INT | VIT | AGI | HP | Mana | Equipped items |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Physical | 80 | 20 | 70 | 30 | 700 | 100 | Iron Sword, Iron Cuirass |
| Caster | 20 | 80 | 70 | 30 | 700 | 400 | Oakwarden Staff, Int Armor |
| Tank | 50 | 20 | 100 | 30 | 1,000 | 100 | Iron Sword, Iron Cuirass |

HP follows base Vitality × 10 and mana follows base Intelligence × 5, as in
character progression. Equipment raises the physical build's Strength to 86,
the caster's Intelligence to 98 and the tank's Strength to 56. Equipping INT
does not retroactively increase the persisted maximum mana pool.

All builds also receive an explicit **reference-only endgame allowance** of
18 armor, 12 magic resistance and 10% crit chance. The cuirass brings physical
and tank armor to 30; caster armor remains 18. These allowances stand in for
intended developed equipment power that the small current item catalogue does
not supply. They are synthetic assessment inputs, not new gear, earned stats
or changes to live characters. No other passive is bundled into these builds.

Each build has Basic Attack plus four real equipped spells:

- Physical: Bladestorm Rhythm, Tidepiercer Thrust, Vital Strike, Rupture.
- Caster: Soulflare, Charred Chains, Lightning Surge, Cinderbrand.
- Tank: Bulwark Bash, Festering Blow, Vital Strike, Iron Will.

The main horizons are **6 and 12 rounds**, with both full resources and a
depleted state of 55% health and 10% mana. This gives sustain and mana recovery
an opportunity to matter without assuming their effects are always useful.
Damage comparisons include unarmored opponents and opponents with 30 armor/
20 magic resistance. Test groups as well as single targets.

## Spells v2

Retain the unit convention: **100 Might** represents an immediate single-target
reference action delivering **20 useful damage**, at range 1–3, for 10 mana and
configured cooldown 1. This revision keeps the HP unit fixed; it does not scale
the old hypothetical `6–14 + 0.5 INT` reference spell alongside the stronger
character. That old formula established 20 damage at the old INT20 reference.

Evaluate the real spell in a suitable developed build. Start by comparing useful
damage, healing, prevention or denied actions with that reference, then judge
costs, restrictions and interactions together. These are comparative assumptions,
not a universal damage-to-Might formula. The record's final number remains an
estimate, and the E–S thresholds are unchanged.

Use approximately 1.5 useful targets for local areas and two for global effects,
with one-to-three-enemy sensitivity. A party has one or two characters. Healing
assumes missing HP, shields assume incoming damage before expiry, and control
counts a surviving opponent's denied action only once. Do not also count that
same attack's prevention as an independent full control bonus. Attribute or
defense changes can affect individual spells very differently.

[Spell preview evidence](assessments/spell-previews-v2.json) contains all
39 spells in all three profiles, including actual descriptions and direct-damage
estimates with/without defenses. Estimates include reference crit and apply gear
through the normal battle preparation. They do not measure healing, triggered
effects, real target coverage or complete action value. In particular, Volt
Lash's preview is expected damage per candidate; its four-hit total must be
considered separately.

### Charging remains a discount

Count the cast and actual additional blocked activations together. The same
discharge has lower value when it prevents other actions, delays kills or loses
targets before release. Cooldown is different: other spells can be used while
one ability cools down. Do not discount a committed action twice.

At the caster's equipped INT98, Arcane Channeling releases 186.2 raw damage per
surviving original enemy. With the reference crit chance it averages about
204.8 against zero MR or 184.8 against 20 MR. Two useful targets give roughly
389.6 damage across those defense cases.

`ChargeEffect(2)` occupies the casting activation and one further blocked
activation, giving a rough comparison of **194.8 damage per committed action**,
or about 974 reference points before further judgment. Delay, caster/target loss,
40 mana and cooldown 6 reduce the authored estimate to **780 Might**. The exact
discount is not a coded coefficient. A comparable immediate spell would have
more room for a higher rating; charging allows a much stronger discharge at a
given budget. Movement still cannot dodge surviving original locked targets.

## Passives v2

Retain **100 Might per approximately 20 useful HP of additional encounter
contribution**, without spending a casting action. Assess a passive on compatible
builds and compare identical starting cases with and without it. A physical
lifesteal passive is not averaged with an incompatible magic-only build.

[Paired probe results](assessments/passive-probes-v2.json) cover **1,792
matched pairs / 3,584 battles**. Each appropriate profile uses both horizons,
both resource states, both enemy-defense cases and 16 fixed seeds. One or two
profiles are used per passive as specified in the script.

For repeatable sustained pressure, two stationary 1,500-HP reference threats each
attack for 65 raw damage before the hero: one physical, one magical. Their
defenses are either zero or 30 armor/20 MR. The hero uses its actual spell kit,
real cooldowns, mana, damage, regeneration and passive effects through the battle
engine. The shared heuristic planner chooses actions. Stationary positioning
isolates sustained passive contributions; enemy probes separately exercise
tactical movement. The synthetic threats are not published game content.

Each record retains baseline and treatment endpoints. The same initial seed
does not guarantee identical later RNG draws when effects change the execution
path. Means describe these controlled cases, not representative player outcomes.

| Passive | v1 Might | v2 Might | Selected paired evidence |
| --- | ---: | ---: | --- |
| Armor Up | 40 | 280 | +56 mean remaining HP |
| Thorn Carapace | 100 | 300 | +69.31 mean damage, strong armor dependence |
| Blessed Fortune | 115 | 100 | +17.77 mean damage; fixed scaling is unaffected |
| Bloodfang | 55 | 160 | +33.94 mean healing; +25.07 remaining HP |
| Soulleech | 30 | 180 | +35.41 mean healing; deaths 60 → 51 / 128 |
| Mystic Flow | 30 | 140 | +25.81 mean damage; +27.54 unspent mana |
| Vital Wellspring | 100 | 420 | +82.32 mean remaining HP |
| Stoneform Resolve | 170 | 340 | +67.5 mean remaining HP |
| Titan's Resurgence | 120 | 260 | Deaths 32 → 16 / 256; +52.52 mean healing |
| Keen Instincts | 0 | 330 | +66.14 mean damage under the crit allowance |

These columns are not additive score components. Healing is often already
reflected in remaining HP, and unspent mana is not damage. Survival and changed
actions can interact. The final estimates weigh those effects, matchup dependence
and conditional activation; no script automatically converts endpoints to Might.

At 700–1,000 max HP, Titan's nominal four-tick recovery is 210–300 before rounding,
but many trials never activate or collect it all. Vital Wellspring adds about
9 recovery per activation at VIT70 or 13 at VIT100. Armor Up adds 6 armor on the
tank. Blessed Fortune does not become proportionally stronger merely because
Intelligence or Strength increased.

Keen Instincts now has a useful reference: 10% crit becomes 12.5%, and the critical
multiplier becomes 2.5× instead of 2×. Its **330** rating is conditional on that
explicit design allowance. Actual zero-crit builds, including current enemies
with no crit source, still receive zero benefit. This revision does not give
those live entities crit chance.

## Weapons v2

**Iron Sword remains the 100-Might weapon anchor.** Compare physical and caster
builds with the same 200-point budget, main attribute 80 and identical other
equipment (Iron Cuirass for this slot comparison). Hold the endgame allowances
fixed. Iron Sword raises Strength to 86; staff raises Intelligence to 88 when
the armor slot is held equal.

Include attack profile, movement/reach, spell scaling and regeneration over the
longer horizon. Staff retains 150 for comparable basic damage, range 3 and casting
utility. This assessment is still provisional; the new passive trials are not
paired equipment trials.

## Armor v2

**Iron Cuirass remains the 100-Might armor anchor.** Hold base attributes, weapon
and the design-only defensive allowance fixed while swapping the armor slot.
Evaluate repeated physical prevention against Int Armor's marginal scaling and
extra mana actually spent. Int Armor retains 80 pending paired slot trials.
Armor and weapon values are separate units, not directly interchangeable.

## Enemies v2

**Skeleton Grunt remains the 100-Might enemy unit anchor.** The characters used
to assess enemies are now the developed physical/caster party above, with caster
Agility 29 to fix ordering. Existing enemy stats and kits are unchanged: the
high-level reference does not secretly scale them or their spell Might.

[Enemy results](assessments/enemy-probes-v2.json) cover **1,408 battles**:
22 types, individually and as three-enemy groups, clustered/spread 7×7 starting
layouts, 16 seeds each. Both sides use the real tactical engine and shared
heuristic planner. The horizon is 18 rounds; unfinished fights would be marked
explicitly rather than counted as wins or losses.

The developed party won every case, with no hero deaths. Many early enemies died
in the opening round, including before any enemy activation. This indicates
that the party outgrows the current authored content; it does not show every
weak enemy has the same intrinsic power or zero Might.

| Three-enemy group | Mean completed rounds | Mean party damage | Mean spell/effect healing |
| --- | ---: | ---: | ---: |
| Emberbound Revenant | 0.94 | 39.84 | 9.69 |
| Elder Treant | 2.13 | 19.81 | 0 |
| Hollowed Oakwarden | 5.13 | 116.50 | 391.41 |
| Commander Kelvaris | 2.59 | 132.28 | 5.16 |
| Thundermaw | 4.19 | 456.88 | 0 |

Enemy ratings remain relative to the fixed enemy-family unit. Consider intrinsic
durability, action denial, reach and group support along with measured pressure.
The floor in many results limits discrimination between weaker enemies. A 1,000
rating for Thundermaw describes its position in this family; it does not imply
it can challenge a 1,000-Might character or guarantee an endgame boss fight.
There is no summed character/party Might or cross-family score comparison.

## Reproduction and history

Run from the repository root with the pinned Bun toolchain:

```sh
bun --no-env-file scripts/might-assessment/spells.ts
bun --no-env-file scripts/might-assessment/passives.ts
bun --no-env-file scripts/might-assessment/enemies.ts
bun tests/battle/run.ts rules/library rules/might integration/library-controls
```

Git history preserves all 75 previous values and their original conditions and
rationales. Retrieve the v1 snapshot, notes and enemy probes at their original
paths; these describe the earlier reference:

```sh
git show eb016e5:docs/might-assessments/assessments-v1.json
git show eb016e5:docs/might-assessments-v1.md
git show eb016e5:docs/might-assessments/enemy-probes.json
```

All values remain Estimated. A systematic calibration still needs more varied
encounters, layouts, stronger enemies, independent validation of the endgame
gear/crit assumptions, and better decisions for conditional support and charging.
Implementation quirks remain part of the assessment: Aegis Wall supplies shields
without the advertised defenses; Iron Will cleanses only DEBUFF; Soulleech uses
the nonphysical damage branch; Deflecting Stance has sensitive end-step timing.
Revisit affected assessments whenever those mechanics or reference inputs change.
