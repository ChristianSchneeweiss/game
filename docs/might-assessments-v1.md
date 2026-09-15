# Initial Might assessments

Historical v1 notes, superseded by [reference v2](might-assessments.md).
The source-code links below now show current records; the exact v1 values and
conditions are preserved in [the v1 snapshot](might-assessments/assessments-v1.json).

This pass assigns **Estimated** Might to all 75 current definitions: 39 spells,
4 equipment items, 10 passives and 22 enemies. These are provisional design
judgments under the references below, not completed balance calibration.
The Library derives tiers from these values and displays the Estimated label.
Combat behavior, existing runtime tiers and loot probabilities are unchanged.

The authored record for every definition contains its number, status, reference,
conditions and individual rationale. Records live in:

- [Spells](../apps/game/src/might/spell-assessments.ts)
- [Equipment and passives](../apps/game/src/might/equipment-and-passive-assessments.ts)
- [Enemies](../apps/game/src/might/enemy-assessments.ts)
- [Shared reference conditions](../apps/game/src/might/references.ts)

Each complete record is judged within its family. A 100-Might weapon is not
interchangeable with a 100-Might spell, armor piece, passive or enemy. Values do
not come from legacy tiers, and no formula sums an enemy's spell ratings.
Precision to a whole number is an authoring convention, not statistical certainty.

## Spells v1

The **100-Might reference** is a hypothetical immediate single-target attack:
6–14 base damage plus 0.5 Intelligence, range 1–3, 10 mana, configured cooldown 1.
At effective Intelligence 20 its average raw damage is 20. It establishes a
provisional design unit; it is not a shipped spell or proof that damage alone
measures power.

Use effective attributes 20, 100 HP/mana and zero crit, with three- and seven-round
encounters, one to three enemies, one to two allies, and defenses of zero or 12.
Local area effects assume roughly 1.5 useful targets and global effects about
two. Formation, overkill and already-dead targets limit useful coverage.
Basic Attack is assessed with the reference sword/staff; its detached Library
damage preview is unarmed and therefore smaller. Preview attribute sliders do
not change a definition's Might.

For a starting comparison, relate damage, healing and prevention to the same
20 useful HP swing, then judge the complete action under its conditions:

- Healing requires missing HP and must add value beyond natural regeneration.
  Shields count when consumed before expiry. Neither gets full credit for an
  unneeded nominal maximum.
- Control is the opportunity denied to a surviving enemy, including its threat
  and timing. Do not count one prevented attack again as both full control and
  an independent full mitigation contribution.
- Damage-over-time ticks and follow-up debuffs need time and surviving targets.
  Initiative reduction does not imply fewer actions or reduced movement.
- Mana competes with other casts. Cooldowns constrain repeat use, and melee or
  aligned footprints constrain access. A larger cooldown is not equivalent to
  charging: during cooldown the caster can still take other actions.
- Conditional components interact. For example, lifesteal is based on actual
  damage and missing HP; an execute's max-HP coefficient is not useful damage
  beyond the victim's remaining health.

These comparisons establish common assumptions for support, control and damage.
They are not an automatic conversion of every effect to damage, a DPS score or
a claim of measured fivefold combat value between the E and S thresholds.
The accompanying rationales explain departures from the starting comparison.

### Charging reduces Might

Value the full commitment from starting a cast through releasing it. Charging
reduces the value of the same eventual effect through unavailable actions and
movement, delayed kills or protection, and the risk of the caster or intended
targets dying. A charged spell can therefore have a much larger discharge while
remaining within the same Might budget. Cooldown alone does not impose that
same action cost.

For an initial comparison, spread the useful discharge across the cast action
plus **actual additional blocked activations**, then consider its delayed payoff
and failure risk. This is a design comparison, not a generic runtime multiplier:
charge duration, effect clocks, immediate secondary benefits and target retention
must be checked against the implementation. More charge should lower the rating
of an otherwise identical spell; do not discount a second time for actions
already included in the commitment.

Arcane Channeling currently applies `ChargeEffect(2)`. The casting turn consumes
one duration tick, and the next activation is blocked before release at its end
step. At effective INT 20, it deals 32 raw damage per surviving original enemy.
Two targets give 64 damage across **two committed actions**, rather than 64 from
an immediate single action. Its **140 Estimated Might** is roughly half the
design value of a comparable immediate release, also allowing for 40 mana,
cooldown 6 and lost targets. This is not a simulated instant-spell comparison.
Movement cannot dodge the locked-target discharge; caster death prevents it.
Higher live INT at release substantially increases the damage. Reassess this
value if either the charge timing or discharge changes.

## Passives v1

The **100-Might reference** is approximately 20 additional useful HP of encounter
contribution over seven rounds, without spending an action. Compare otherwise
identical builds with and without the passive: base attributes 20, 100 HP,
sword/staff, 12 armor, zero magic resistance and zero crit. Check short fights
as well as the seven-round reference and mixed incoming damage.

This marginal comparison includes eligible damage types, missing health,
activation conditions and whether the owner survives to collect delayed value.
Stoneform starts with zero stacks, and Titan's Resurgence is conditional and
once per battle. Armor Up has no value on zero existing armor.

Keen Instincts is **0 Estimated Might** under this reference. It multiplies
existing crit chance, and zero multiplied by 1.25 is still zero. Current catalogue
equipment adds no crit chance, so its larger crit damage also has no effect here.
This is an explicit conditional assessment, not Unrated or a claim about every
possible future build. Positive-crit equipment or other sources require a new
assessment with an appropriate reference.

## Weapons v1

**Iron Sword is the 100-Might reference**: +6 Strength and its range-1 physical
attack profile, averaging 14 damage at base Strength 20. Assess the entire
equipped package, including spell scaling, reach and regeneration, over three
and seven rounds with base attributes 20 and defenses zero or 12.

Oakwarden Staff receives 150 for comparable basic damage plus range 3,
Intelligence scaling and mana regeneration. This is build- and encounter-sensitive:
range matters less in immediate melee, and enemy resistance changes relative
damage. The weapon reference does not define the armor scale.

## Armor v1

**Iron Cuirass is the 100-Might reference**, providing +12 armor. Use base
attributes 20, 100 HP/mana, sword/staff, no other armor/passives, mixed threats
and both short and long encounters. Compare useful physical mitigation with
the opportunity to turn Intelligence and regenerated mana into effective casts.

Int Armor receives 80 for +10 Intelligence and its regeneration/scaling benefits,
with no armor. It can outperform the cuirass in favorable caster encounters;
the estimate does not guarantee that one piece is always preferable.

## Enemies v1

**Skeleton Grunt is the 100-Might reference.** Evaluate each enemy's complete
authored stats, equipment, spells and passives together. Health alone, highest
spell tier and summed ability scores are insufficient.

The original v1 probe ran each of the
22 enemies against two heroes using actual battle rules, tactical movement,
regeneration, costs and effects. Both heroes have 100 HP/mana and base attributes
20 (the second has Agility 19); one uses Iron Sword and the other Oakwarden Staff.
They have Basic Attack only, no armor and no passives. Both teams use the same
heuristic planner. An empty 7×7 board has clustered and spread starting layouts,
with 16 matched seeds in each layout and a 15-round cap: **704 encounters**.

The current `scripts/might-assessment/enemies.ts` runs the v2 protocol instead.

[Raw results](might-assessments/enemy-probes.json) retain every seed and layout,
damage, spell/effect healing, deaths and outcome. Damage sums actual HP changes;
regeneration can make damage totals exceed starting HP. Healing totals include
spell/effect impacts, not ordinary natural regeneration, although regeneration
is active during every battle. No probe result is automatically converted to
Might. Selected evidence:

| Enemy | Mean rounds | Mean party damage | Enemy wins / 32 | Unfinished / 32 |
| --- | ---: | ---: | ---: | ---: |
| Skeleton Grunt | 1.06 | 8.19 | 0 | 0 |
| Ghoul Knight Ivern | 5.56 | 73.81 | 0 | 0 |
| Emberbound Revenant | 6.47 | 199.84 | 0 | 0 |
| Elder Treant | 12.25 | 185.00 | 0 | 18 |
| Hollowed Oakwarden | 14.81 | 297.84 | 0 | 30 |
| Commander Kelvaris | 6.72 | 314.69 | 32 | 0 |
| Thundermaw | 3.38 | 231.25 | 32 | 0 |

Unfinished runs are **censored**, not wins or losses. The high-defense and healing
kits need longer or better-equipped party comparisons; the burst bosses need
stronger reference parties to distinguish their ceilings. These matchups are
controlled pressure/durability evidence, not representative player win rates.
Heuristic decisions, Basic-Attack-only heroes, two layouts and solo enemies omit
player spell choices, obstacles, group synergies and many other situations.
Enemy healing/support abilities need allied-enemy scenarios before promotion
to Assessed status.

## Interpretation and next calibration

Ratings use implemented behavior where text and mechanics disagree. Aegis Wall
currently grants shields without its advertised defense bonus. Deflecting Stance
reduces incoming damage by actual reflected damage and has sensitive end-step
timing. Iron Will cleanses `DEBUFF`, not every negative effect; Soulleech currently
applies in the nonphysical damage branch. These are assessment constraints, not
gameplay fixes in this pass.

All entries remain Estimated. Promotion to Assessed requires representative
party/encounter matrices, cost-matched alternatives, sensitivity to attributes
and defenses, actual charge/expiry timing, and evidence for conditional roles.
Record changed conditions under a new reference version rather than silently
presenting old estimates as newly calibrated values.
