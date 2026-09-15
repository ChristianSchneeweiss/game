# Might calibration

Might is the numerical valuation. Tier is the interval containing that number.
An ability gains a tier when its assessed Might reaches the next promotion
threshold. More unusual effects contribute to Might alongside ordinary stats;
an unusual mechanic does not independently grant a high tier.

The agreed progression is exponential and substantial: entry to S should be
approximately five times a reference E valuation at comparable character stats.
This document applies that decision and records the first real-engine probes.
It complements the [research report](/Users/christianschneeweiss/Documents/business/loot-game/game/docs/tier-budget-research.md).

## Promotion thresholds

Use 100 Might as an E reference. There are five promotions from E to S:

```text
multiplier per promotion = 5^(1/5) ≈ 1.379729661
threshold(step) = round(100 × 5^(step/5))
step: D=1, C=2, B=3, A=4, S=5
```

| Tier | Minimum Might | Maximum Might | Next promotion |
| --- | ---: | ---: | ---: |
| E | 0 | 137 | 138 |
| D | 138 | 189 | 190 |
| C | 190 | 262 | 263 |
| B | 263 | 361 | 362 |
| A | 362 | 499 | 500 |
| S | 500 | Open | — |

These integers are the proposed canonical thresholds for the chosen curve.
Calculate each from the original formula and round once; repeated multiplication
of previously rounded values drifts. Store whole-number Might and derive the
tier from that same value. Thus 189 is D, 190 is C, 499 is A, and 500 is S.

The E reference of 100 is a unit convention, not a minimum. Content worth less
than 100 remains E. Entry to S is five times that reference; arbitrary members
of E and S do not all differ by exactly fivefold. S is the terminal grade for
now, so an S label alone does not impose an upper power limit on content.

```text
tierForMight(might):
  require a finite, nonnegative integer
  if might >= 500: S
  if might >= 362: A
  if might >= 263: B
  if might >= 190: C
  if might >= 138: D
  otherwise: E
```

Missing valuations remain unrated. They are not zero and do not automatically
become E. The old authored tier must never be used to manufacture a Might value.
An assessment near a threshold should retain its uncertainty internally: a
plausible range of 180–200 crosses D/C and needs closer comparison before a
confident published grade.

## What a Might budget means

A designer may choose an allowance inside an intended tier: for example, 175
Might is a D-sized budget. The content spends that allowance on its combined
stats and special effects, accounting for costs and restrictions. Its assessed
value then determines the final tier. If a redesign is worth 195 Might, it is C;
the original intended grade does not override that result.

For illustration only, an attack valued at 120 Might is E. Adding an effect
assessed at 50 additional Might would make the complete option 170, or D.
If the combined effect actually contributes another 30 beyond that estimate,
the revised total is 200, or C. Those effect prices are invented to explain the
threshold rule, not a proposed universal price for any particular status.

Do not assume that independently assessed components always add. A passive may
increase how frequently an effect triggers, or a weapon may improve both damage
and mana regeneration. The complete combination must earn its total valuation.

## First reference proposal

Begin with a simple ranged attack as a numerical comparison instrument:

| Property | Proposed reference |
| --- | --- |
| Role | Reliable, single-target magical attack. |
| Delivery | Range 1–3, one activation, 10 mana, configured cooldown 1. |
| Damage | Base 6–14 plus 0.50 × current Intelligence. |
| Standard attributes | 20 in the relevant current attribute; no criticals, defense, or reactive effects in the elementary comparison. |
| Reference valuation | 100 Might, by initial design convention. |

At Intelligence 20, this reference has 16–24 raw damage and midpoint 20. At
10 and 50 Intelligence, its raw midpoints are 15 and 35. It is a **proposed
benchmark**, not a change to Fireball or a newly registered spell, and it has
not been validated as the right E reference through full encounters.

Within this narrow direct-damage comparison, holding all delivery properties
fixed, 100/20 gives five Might per unit of midpoint damage. Promotion payloads
at Intelligence 20 would consequently be:

| Entry point | Might | Direct-damage midpoint in this comparison |
| --- | ---: | ---: |
| E reference | 100 | 20.0 |
| D | 138 | 27.6 |
| C | 190 | 38.0 |
| B | 263 | 52.6 |
| A | 362 | 72.4 |
| S | 500 | 100.0 |

This is a starting ruler for otherwise comparable direct attacks. A heal,
permanent armor modifier, extra activation, or free attack does not acquire a
price from this table without a justified comparison of its different delivery
and costs. Establish separate role references for those effects, then reconcile
them through build and encounter outcomes.

The fivefold budget should not be applied separately to every factor. If a
spell gains five times the damage per target and five times as many useful
targets, it can produce 25 times the raw output. Also, under flat mitigation,
20 versus 100 raw damage becomes 10 versus 90 after 10 defense. A fivefold raw
increase therefore produces a ninefold effective increase in that case.

## Engine observations

The [probe output](/Users/christianschneeweiss/Documents/business/loot-game/game/docs/might-calibration/engine-results.json)
contains 53 synthetic configurations over 64 fixed seeds each: **3,392 runs**,
using Bun 1.4.0 and tactical rules version 2. These are controlled sequences
against stationary targets. They exercise real casts, costs, effects, armor,
regeneration, cooldowns, and activation scheduling. They do not estimate dungeon
clear rates or player win rates.

The three stat inputs are 10, 20, and 50 before equipment. Real equipment bonuses
apply: the central staff cases therefore use 28 Intelligence, and sword cases
use 26 Strength. Most targets have 1,000 HP to prevent overkill from hiding the
output being examined. Heroes retain real regeneration; mana is normally 100.
Enemy actions are scripted passes except in named retaliation cases.

Reported means below are descriptive across those 64 seeds. Different actions
consume random numbers differently, so matching seed names does not imply
identical subsequent rolls. Small differences are not evidence of meaningful
superiority; the retained per-run data and traces make the results inspectable.

| Comparison | Observed result | Calibration implication |
| --- | --- | --- |
| Staff Basic Attack versus Fireball, base stats 20, one activation | 14.734 versus 13.172 useful damage; Fireball spends 10 mana. | The current A label does not establish a useful upgrade over this free ranged action. |
| Staff Basic Attack versus Cinder Wisp, same setup | 14.734 versus 14.672 useful damage; Cinder Wisp spends 10 mana. | Roughly equal damage in this sample, with an added resource cost. Their variance and complete sequences still matter. |
| Fireball whenever ready over seven rounds, filling with staff attacks | 100.516 damage and 30 mana spent, versus 105.188 from staff attacks alone. | The present comparison problem persists in a simple repeated-use sequence. |
| Single Heal on a wounded hero, base stats 20 with staff | 8.891 useful spell healing for 10 mana; at full health, zero useful healing. | Keep healing opportunity and innate regeneration separate when valuing the cast. |
| Fleetfoot on self, two rounds | Three activations but two attacks, for 30.578 damage versus 30.375 from two ordinary staff attacks; 50 mana spent. | It transfers timing and adds upkeep, rather than adding an attack in this sequence. The tiny damage difference is sampling variation. |
| Fleetfoot from a base-10 support to a base-50 partner, two rounds | 78.953 party damage versus 69.266 without Fleetfoot; support spends 50 mana. | Recipient strength improves the exchange, but these results alone do not justify S. |
| Bulwark Bash whenever ready, four rounds, with a retaliating target | 78.422 outgoing damage versus 57.078 for sword attacks; enemy gets two activations instead of four. Incoming damage is 28.641 versus 58.219. | Damage and reliable denial both contribute, and denial is particularly significant against a lone opponent. |
| Arcane Channeling, base stats 20 with staff | 45 actual damage to one target or 180 to four, with 40 mana spent. | Useful target count is a major part of its budget. |
| Final Verdict against a 1,000-max-HP target | At 110 HP: 41.906 damage. At 100 HP: 100 useful damage and a kill. With 1,100 armor at the threshold: zero damage. | Threshold behavior, useful damage, and defense determine finishing value. Huge raw overkill is not useful output. |
| Stone Bark with no armor, two retaliating rounds | Incoming damage remains 29.625, while outgoing damage falls from 29.672 to 14.938 and the cast spends 10 mana. | The percentage armor buff has no benefit when multiplying zero. |
| Stone Bark with Iron Cuirass, same sequence | Incoming damage falls from 7.125 to 5.141; the same attack and mana opportunity costs remain. | Equipment enables a benefit, but the complete trade needs to be worthwhile. |

### Timing details worth preserving

Configured cooldown 2 permits repeated casts on zero-based rounds 0, 3, and 6
in the tested ordinary activation sequence. Budget repeat frequency using this
behavior, rather than dividing damage by the displayed cooldown number.

Arcane Channeling applies a duration-2 charge during round 0. The cast's own
end step consumes the first duration tick. The blocked activation in round 1
consumes the second tick and releases the damage; the caster resumes acting in
round 2. Thus the current implementation has one subsequent blocked activation
after the casting activation. Any future change to that timing changes its
value and needs a fresh comparison.

Fleetfoot's extra activation includes normal upkeep. In the self-cast sequence,
the caster recovers 12 useful mana after spending 50, including the additional
upkeep. In the support-to-partner sequence, the support recovers 4. This does not
make the effect free, but it belongs in the complete resource comparison.

### Scaling sensitivity

| Base stat input | Equipped staff Intelligence | Staff attack, mean | Fireball, mean | Cinder Wisp, mean | Arcane, one target |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 10 | 18 | 12.281 | 12.172 | 12.672 | 27 |
| 20 | 28 | 14.734 | 13.172 | 14.672 | 45 |
| 50 | 58 | 22.281 | 16.172 | 20.672 | 99 |

The first three columns of attack results are one-activation samples; Arcane is
measured through its delayed discharge. They are not equivalent time windows.
The table demonstrates why a fixed Might valuation needs declared reference
conditions and checks at other stat levels.

## Initial decisions from the evidence

**Keep the promotion rule independent of the valuation method.** The range
lookup is deterministic; obtaining a defensible Might value requires design
judgment supported by measurements. Neither a placeholder tier nor a single
damage preview establishes that value.

**Rework the elementary spell references before trusting the current catalogue.**
Fireball and Cinder Wisp need an intended advantage over a normal equipped attack.
Single Heal needs a useful recovery role in the presence of innate regeneration.
These could be retuned, assigned low Might, or deliberately given a distinct
role. The probe results do not choose that product direction automatically.

**Assess specialist effects in relevant complete sequences.** Fleetfoot needs
partners with useful expensive actions, sufficient resources, and realistic
timing. Bulwark needs multi-enemy and boss-control cases. Arcane needs target
loss, pressure while charging, and representative formations. Stone Bark needs
the armor builds it is intended to support.

No final Might values are assigned to current content by these probes. The
direct-attack reference above is the first concrete calibration proposal. The
remaining step is to validate that reference in authored encounters, assess the
current spells against it and the equivalent support/defense references, then
publish the assessed integer Might values with derived tiers.

## Library contract

The intended display is **D · Might 145**. At **Might 190**, the same grade lookup
returns C. A balance change that crosses a threshold changes the displayed tier
automatically.

Persist or author the assessed Might value once. Derive the tier, list sorting,
filters, detail badge, and related-entry grade from the same shared rule. A
Library-specific copied grade would recreate the inconsistency this model is
intended to remove. Preview attribute changes affect context-dependent spell
numbers while authored Might remains fixed for that content definition.

Unrated entries display **Might —**. If legacy grades remain temporarily, label
them as such so they cannot be mistaken for calculated grades. Publishing an
estimated rating requires a real assessment, a documented reference family,
and an explicit estimate status. The current implementation of the Library
has not been changed by this calibration work.

Cross-category comparisons need care: a permanent weapon and an activated
spell consume different opportunities. Until their reference contributions are
reconciled, compare Might within the documented content family and do not sum
individual values into a purported measurement of party power.

## Reproducing the probes

From the repository root with Node 22.19.0 and Bun 1.4.0:

```sh
bun --no-env-file scripts/might-calibration/run.ts
bun --no-env-file test scripts/might-calibration/engine.test.ts
```

The runner regenerates
[engine-results.json](/Users/christianschneeweiss/Documents/business/loot-game/game/docs/might-calibration/engine-results.json)
with seed lists, scenario definitions, per-run outcomes, descriptive means, and
a representative full trace per scenario. It runs locally without app services
or a database. The [detailed measurement notes](/Users/christianschneeweiss/Documents/business/loot-game/game/docs/might-calibration/engine-probes.md)
describe lifecycle handling, exact fixtures, and resource accounting. Engine
gameplay rules and the existing test suite are unchanged.
