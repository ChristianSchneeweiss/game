---
name: update-might
description: Propose conservative Might and reference updates for enemies, spells, equipment, and passives using late-mid-game stats; present changes sorted by absolute delta and apply only after user approval. Use for reassessment or synchronization after content or combat changes.
---

# Update Might

Reassess the current content, present the proposed changes, and apply them only
after the user approves the concrete proposal.
By default, cover every registered enemy, spell (including Basic Attack), item in
every equipment slot, and passive skill. Honor an explicitly narrower request,
including affected enemy kits when their spells, gear, or passives changed.

The implemented mechanics are the assessment inputs. Keep gameplay tuning separate
unless the user also requests it. A refresh may retain a defensible value; every
in-scope definition still needs review and current supporting rationale.

## Review before changing the project

Work in two phases: **propose**, then **apply approved changes**. Invoking this
skill starts the proposal phase. Keep the project unchanged while gathering
evidence and preparing candidate values, reference inputs, documentation, and
tests. Use an isolated temporary workspace for draft edits and generated outputs,
including any probe runs that write files. Base that workspace on the current
working tree so it includes ongoing content changes.

Present the complete delta list described below and wait for the user's review.
Approval covers only the presented changes or the subset the user selects. If
feedback changes the proposal, show the revised deltas before applying those
revisions. When a concrete proposal is already approved, continue with that
approval without asking again.

## Keep ratings stable

Treat the values at the start of the refresh as the numeric baseline. Aim for
modest adjustments and retain an existing value when it remains consistent with
the evidence's uncertainty. Prefer the smallest defensible change supported by
changed mechanics or a demonstrated error in the earlier assessment. Compare new
content with established peers in the same family so additions fit the existing
scale.

Preserve family anchors and promotion thresholds. A stronger character reference
alone is not a reason to rescale the whole catalogue. Review absolute and
percentage changes and the distribution within each family for broad inflation
or deflation. Explain substantial outliers and tier crossings individually;
larger corrections need concrete evidence. Honor any user-specified tolerance;
otherwise apply this conservative preference without inventing a hard percentage
cap that could conceal a real misvaluation.

## Use late-mid-game characters

Use a representative **late-mid-game character** as the main reference for spells,
equipment, and passives, and a party of such characters for enemy comparisons.
Choose compatible physical, caster, tank, or other relevant builds with equal
progression budgets. Ground their level, base attributes, gear, and spell kits in
the game's progression and attainable content; state the chosen budget, base and
effective attributes, HP, mana, defenses, crit, and loadout in the reference.
Highly optimized or fully maxed builds belong in sensitivity checks.

Start from the shared `MIGHT_REFERENCE` and check its suitability for that stage.
The existing developed-build profile includes explicit endgame stat allowances;
verify those assumptions rather than merely relabeling the profile as late-mid
game. Propose changes to unsuitable inputs and their documentation together,
keeping any synthetic allowance justified for the chosen stage. Apply the
stability preference above when translating this reference into revised ratings.

## Load the current model

Read [the Might index](../../../docs/might/README.md),
[current assessments](../../../docs/might/assessments.md), and
[the Library contract](../../../docs/features/library.md). For changes to the
valuation model, anchors, or assessment status, also read
[the specification](../../../docs/might/spec.md) and
[calibration guidance](../../../docs/might/calibration.md); distinguish historical
proposals from the current reference. All paths below are relative to the repo root.

| Responsibility | Source |
| --- | --- |
| Registered content and combat behavior | Schemas, factories, and definitions under `apps/game/src/enemies/`, `spells/`, `items/`, and `passive-skills/`; follow their effects, modules, and lifecycle hooks |
| Weapon targeting and scaling | `apps/game/src/tactical/catalogue.ts` |
| Shared assessment inputs and family references | `apps/game/src/might/reference-profile.ts` and `references.ts` |
| Authored records | `apps/game/src/might/spell-assessments.ts`, `enemy-assessments.ts`, and `equipment-and-passive-assessments.ts`, assembled by `assessments.ts` |
| Generated equipment assessments | `apps/game/src/might/tiered-equipment-assessments.ts` reads the authored `might` in `apps/game/src/items/equipment/tiered-equipment.ts` |
| Validation and tier derivation | `apps/game/src/might/might.ts` |
| Library projections and related content | `apps/game/src/library/catalog.ts` |
| Reproducible evidence | `scripts/might-assessment/` and `docs/might/assessments/` |

## Inventory and references

1. Capture the current ratings, derived tiers, statuses, and reference IDs before
   editing. Use the working tree's definitions, including unfinished content work.
   Enumerate the current schemas and factories; reconcile their IDs against the
   assessment records and probe outputs. Derive counts from that inventory.
2. Follow enemy kits through their actual spells, passives, equipment, and weapon
   profiles. Separate equipped combat gear from loot drops. Reassess an enemy at
   its own attributes; a spell's character-reference Might is not its enemy value.
3. Keep the established family units and reference assumptions that fit the
   late-mid-game benchmark. Compare equipment within its slot; accessories have
   their own anchors. Use compatible builds with equal
   progression budgets and hold other slots fixed in a slot comparison.
4. Prepare matching executable inputs and written conditions for review.
   Reference-only stat allowances remain synthetic. Apply gear through normal
   battle preparation and check actual resource behavior: equipment INT/VIT can
   affect regeneration without increasing persisted maximum mana/HP. Preview
   sliders are independent of the authored rating.

When proposing material changes to assumptions, plan consistent reference
versions across profile data, family anchors, scripts, JSON metadata/output paths,
documentation, and tests. Rating changes alone need not create a new reference
version. Preserve the distinction between historical evidence and results from
the current inputs.

## Refresh evidence

Use the pinned Bun toolchain. Inspect the runners' coverage and output paths,
then regenerate the relevant evidence. During the proposal phase, run these
commands from the root of the isolated temporary copy: they overwrite JSON
files under `docs/might/assessments/`. Keep those writes outside the live project
until approval. A full refresh uses all three:

```sh
bun --no-env-file scripts/might-assessment/spells.ts
bun --no-env-file scripts/might-assessment/passives.ts
bun --no-env-file scripts/might-assessment/enemies.ts
```

These commands write JSON evidence, not final Might values. Inspect the results
and reconcile their content IDs, reference inputs, and run counts with the current
inventory. Extend the existing probes when missing coverage would affect a rating:

- **Spells:** Direct-damage previews omit healing, effects, expiry, control, and
  full action value. Exercise relevant sequences and useful target coverage.
  Compare distinctive effects against otherwise similar spells without them.
  For charging, inspect the actual activation timeline and compare equivalent
  immediate delivery using the discount guidance below.
- **Passives:** Compare matching with/without-passive cases on compatible builds.
  Include fresh/depleted resources and relevant horizons and defenses. Stationary
  pressure cannot establish movement value. Healing and threshold passives need
  cases that can activate them; verify that the chosen kit supplies those cases.
- **Equipment:** The existing three runners do not provide paired equipment
  trials. Add slot-swap comparisons using the shared reference helpers where
  needed, including tactical layouts for movement/reach and compatible scaling
  builds. Record all new slot anchors and retain individual item rationales when
  the generated assessment text cannot explain a rating.
- **Enemies:** Exercise actual kits alone and in groups with tactical movement,
  formations, fixed seeds, and explicit unfinished outcomes. If the reference
  party kills weak enemies before they act, use additional discriminating cases
  or explain intrinsic differences; zero observed pressure does not imply zero
  Might. Keep supplemental scenarios distinct from the canonical reference.

Retain baseline/treatment outcomes and reproduction inputs. Matching initial
seeds do not guarantee identical later random draws when execution paths differ.
Identify missing or failed probes explicitly; only successful runs count as fresh
evidence. If a measurement gap remains, record a mechanic-based estimate and its
limitation instead of claiming measured coverage.

## Develop proposed valuations

### Give unique effects more weight

Give useful unique effects more influence on Might than straightforward stat
boosts. Attribute and flat-stat bonuses establish a modest baseline; distinctive
mechanics such as extra activations, action denial, triggered interactions, and
new tactical options should be the stronger differentiators between comparable
entries. Apply this priority within the late-mid-game reference and conservative
rating changes above.

Explain what the effect enables beyond higher numbers, how often it matters,
and which conditions or synergies enable it. Compare otherwise similar options,
or probe with and without the effect while holding stats fixed, to expose value
that damage previews miss. Credit implemented combat usefulness rather than
novelty of wording. An inactive effect earns no premium, and an effect's measured
benefit should not also receive a second generic uniqueness bonus.

### Charging discounts Might

Charging is a cost that **reduces Might for an otherwise equivalent spell**.
The same damage and effects delivered after a charge should cost less Might than
immediate delivery. Conversely, at the same Might budget, a charged spell can
afford stronger damage or effects; a powerful release does not by itself make
the charged spell more expensive.

Assess the full commitment: the casting activation, actual additional blocked
activations, delayed benefit, and implemented risks such as losing the caster or
targets before release. Compare that commitment with the immediate spell's normal
casting action. Holding the payoff fixed, greater charge costs warrant a larger
discount. Cooldown has a different cost because other spells remain available.
Account for each lost action or delay once; avoid applying an action-efficiency
discount and then charging the same lost actions again. Treat the charge itself
as a restriction, not as a unique-effect premium.

### Prepare the complete assessment

Judge the whole contribution against the appropriate anchor: useful damage,
healing, prevention, control, reach, scaling, and sustain together with resource
costs, timing, conditions, and interactions. Raw damage, old tiers, and summed
stats do not provide a universal Might formula. Avoid double-counting healing
already reflected in remaining HP, prevention already credited to denied actions,
or unused mana and overkill. Compare within families; do not sum content ratings
into character or party Might.

Prepare candidate records with a nonnegative safe-integer `might`, honest
`status`, resolvable `referenceId`, current `conditions`, and an individual
`rationale` explaining relevant unique-effect premiums and charging discounts.
Use `estimated` for provisional author judgment; successful probes
alone do not establish completed calibration or justify `assessed`. Missing
assessments remain Unrated rather than acquiring zero or a value from a legacy
tier. Resolve all gaps that can be assessed and report any remaining ones.

For tiered equipment, propose edits to the source `might` in `TIERED_EQUIPMENT`,
preserving its shared tier derivation. Keep `tierFromMight` as the promotion rule;
a reassessed value may cross a threshold. Do not force a value to preserve an
intended grade or copy old runtime grades into assessment records.

## Present the proposal and wait

State the proposed late-mid-game character stats and any reference, evidence,
status, or documentation changes the user would be approving. Then present one
combined table across the in-scope families:

| Entry (family or slot) | Old Might | Proposed Might | Delta | Delta % | Old → new tier | Reason |
| --- | ---: | ---: | ---: | ---: | --- | --- |

Use stable content IDs when names could be ambiguous. Calculate signed
`delta = proposed - old`, and sort by `abs(delta)` **descending**. An increase
of 80 and a decrease of 80 have equal sorting weight. Break ties consistently
by family and content ID. Sort by the numeric Might difference, not percentage,
tier, or family grouping. Include every reviewed entry with a numeric baseline;
unchanged entries have delta zero and belong at the bottom. Provide the full
table, not only a top-N selection; a long table may be a temporary review artifact
linked from the response, with the largest changes also shown inline.

Give concise reasons for changes, expanding the reasoning for the largest
absolute changes, substantial relative changes, and tier crossings. Cite the
mechanic, reference assumption, or probe evidence supporting each larger change,
including unique-effect premiums and charging discounts where relevant. Explain
any broad shift within a family.

For an old value of zero, show the absolute change and mark the percentage as
undefined. New or Unrated entries have no numeric baseline: list them separately
after the numeric table with their proposed value and rationale; leave deltas
undefined instead of treating missing values as zero. Identify unresolved entries
and measurement limits so they are visible during review.

Finish by asking the user to approve or revise this concrete proposal, and stop
before applying it. Keep the reviewed baseline, proposed values, reference inputs,
and supporting evidence available for the follow-up.

## Apply approved changes

After approval, recheck the affected definitions, ratings, and reference inputs
against the reviewed baseline. If intervening edits materially change the
proposal, reassess those entries and present revised deltas for review. Apply only
the approved values and supporting changes; leave unapproved entries pending.
If shared reference edits would also alter unapproved entries' conditions or
metadata, include that affected set in the review before applying those edits.

Update the authoritative records, approved reference inputs, and supporting
scripts/evidence from the reviewed proposal. Update `docs/might/assessments.md`,
its index, and other current Might references with revised conditions, rationales,
counts, evidence links, and limitations.
Check every emitted `referenceId` against an actual Markdown heading, including
each equipment slot. Search for stale values and version strings in affected
docs/tests, distinguishing live claims from historical examples and deliberate
test fixtures. Refresh related-entry projections through the shared catalogue.

## Verify and report

Run the existing focused suite after applying changes:

```sh
bun tests/battle/run.ts rules/library rules/might integration/library-controls
```

Run the relevant type checks from `package.json` when TypeScript changes. Include
content-expansion/slot coverage tests if affected; add probe regression checks
only for new measurement behavior. Preserve boundary, Unrated, sorting/filtering,
and preview-independence tests when updating production-specific expectations.

Completion of the approved update requires every approved change accounted for,
valid assessment metadata, derived tiers, resolving reference links, and
documentation consistent with the evidence actually produced. Summarize applied
changes, checks run, measurement limits, and entries still awaiting approval or
assessment. Distinguish retaining a reviewed rating from leaving an entry
unexamined.
