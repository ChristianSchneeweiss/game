# Game library

The **Library** navigation entry opens `/library`. It includes every registered
spell, equipment item, passive skill, and enemy, regardless of player ownership.
Search descriptions and names, filter by tier or recipients/slot, and sort by
name, tier, Might in either direction, mana, cooldown, estimated damage, or enemy
health as applicable. Inclusive minimum/maximum Might bounds combine with the
other filters. Numeric bounds exclude Unrated entries.
Selected entries and filters are encoded in the URL.
Every category defaults to Might, highest first, with names alphabetized for
equal values and Unrated last. Equipment is grouped by comparison family and
ordered by Might within each slot. Explicit sort choices in URLs are preserved.

Details include targeting footprints, item attack profiles, enemy base stats,
combat kits, and drop chances. Links connect enemies to their abilities and loot,
and connect abilities and items back to their sources. Spell descriptions also
explain their effects and conditional behavior.

The catalogue is generated from the game package's schemas and factories in
`apps/game/src/library/catalog.ts`; it has no copied content catalogue or database
dependency. Changing an authored definition updates the library on the next
client build. The shared enemy factory also supplies the server through its
existing import path.

## Might assessments

Might values overall power, including support, defense and special abilities,
together with costs and restrictions under declared reference conditions. It is
independent of character attributes and ordinary damage previews. A Library
entry's primary tier is derived solely from Might:

| Tier | Inclusive Might range |
| ---- | --------------------- |
| E    | 0–137                 |
| D    | 138–189               |
| C    | 190–262               |
| B    | 263–361               |
| A    | 362–499               |
| S    | 500 and above         |

The shared domain calculates each promotion as `round(100 * 5 ** (step / 5))`,
for steps 1–5. The 100-Might E reference defines the unit; E starts at zero.
The client consumes the derived grade without its own threshold table.

All 75 current production definitions have **Estimated** values in the
[developed-build v2 assessment](../might/assessments.md), with per-definition
rationales and versioned family references. The reference targets mid-to-end-game
builds with a level-41 attribute budget, 700–1,000 HP and 6–12-round encounters.
Its additional armor, resistance and crit are explicit design assumptions, not
changes to live characters. Future missing assessments display
**Might — · Unrated**. A real zero assessment displays **E · Might 0**.
Estimated assessments are provisional and visibly marked; both Estimated and
Assessed values participate in numeric sorting. The Library exposes only the
tier derived from Might; old authored grades are omitted from its catalogue and
details. Combat, persistence, equipment eligibility, rewards and drop chances
still use their existing behavior.

Comparison families are spells, passive skills, enemies, and each equipment
slot. Families are present even for Unrated definitions. When Might ordering
shows several item slots, the Library labels separate families alphabetically
and sorts inside each, placing Unrated last in either direction. This does not
establish a common scale between spells, armor, weapons, passives and enemies.

Author assessments once in the family files under `apps/game/src/might/`,
collected by `assessments.ts` and keyed by category and registered content type.
Each assessment contains:

- `might`: a nonnegative safe integer, never a rounded or inferred legacy grade.
- `status`: `estimated` or `assessed`.
- `referenceId`: a stable identifier for the documented reference conditions.
- `conditions`: the family reference, action/encounter assumptions and costs.
- `rationale`: the evidence supporting this complete combination of abilities.

The fields live together as authored evidence; `referenceId` may point to a
maintained document section. Reconcile reference contributions within a family
before publishing its values. A designer may choose an intended tier's budget,
but must reassess the complete result, including interacting effects. No runtime
simulation or per-instance rating is involved. The catalogue validates metadata
through `assessMight` and identifies invalid content in the error. Missing
assessments normalize to a null Might/tier with `unrated` status. An assessment
must not author a second tier.

URL parameters `mightMin`, `mightMax`, and `sort=mightAsc|mightDesc` preserve the
view. `tier=unrated` selects only unassessed entries. Malformed URL bounds are
discarded individually; reversed valid bounds are both discarded. In the UI,
invalid or reversed bounds show an inline error while the last valid range stays
applied. Clear filters removes range and group restrictions. Category switches
and related-entry navigation restore destination defaults. Unknown/incompatible
groups use the unrestricted category view. Existing URL parameters still work.

## Balance previews

Spell previews use detached tactical entities and the combat damage estimator.
Strength, Intelligence, Vitality, and Agility default to 20 and can be adjusted
locally. The caster and target share those attributes, have 100/100 health, and
have no equipment, passives, defense, critical chance, blessed, or affinities.
Basic Attack uses the current unarmed profile. Preview attributes reset on reload.

Estimated damage assumes one enemy and does not cap overkill. It is not DPS or a complete simulation: it excludes
damage over time and reactive effects, and conditional/multi-hit/delayed abilities
need their descriptions for context. Enemy stats show the base build, including
derived regeneration, before equipment or passives. Library controls do not save
balance changes or modify characters.

## Local verification

`/dev/library.html` renders the same screen through the Vite dev server without
requiring Clerk or the API. This development entry is not part of the production
build. The full `/library` route uses the normal game shell and local Clerk setup.

Run `bun tests/battle/run.ts rules/library rules/might integration/library-controls`
for catalogue coverage, cross-reference validation, preview/scaling, Might
boundaries, URL/search behavior and mounted controls. The runner isolates files
so synthetic assessments cannot leak into the real catalogue or other tests.
Fixture ratings in `tests/battle/support/library-fixtures.ts` exercise behavior;
they are not published valuations or calibration evidence.
