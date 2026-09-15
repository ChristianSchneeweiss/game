Published as [issue #4: Add Might assessments and derived tiers to the Library](https://github.com/ChristianSchneeweiss/game/issues/4).

## Problem Statement

Players cannot reliably compare the overall power of spells, equipment, passive skills, and enemies. Existing tier labels are authored independently of a common valuation, and ordinary damage previews omit much of the value of healing, control, additional activations, and unusual abilities. An impressive name or complicated effect can therefore suggest a stronger option without evidence that it contributes more.

Designers need a shared power allowance for content, and players need a readable indication of that valuation in the Library. Tier must follow the valuation: crossing a numerical breakpoint promotes the content to the next tier.

## Solution

Introduce **Might**, an authored valuation of overall power under defined reference conditions. Each assessed content definition has one integer Might value. The Library derives its E–S tier from fixed, exponentially spaced thresholds and shows the value alongside the grade, for example **C · Might 190**.

Might includes numerical strength and special abilities, evaluated together with their costs and restrictions. It is distinct from Strength, currency, rarity, complexity, and the damage a particular character produces.

This first version implements the shared model and Library experience, including sorting, range filtering, and explicit assessment status. Unassessed content displays **Might — · Unrated**. Existing labels do not supply missing ratings. Calibrating and publishing real content values is a subsequent balance pass; this issue can be completed with the current catalogue still Unrated and isolated fixtures demonstrating rated behavior.

## User Stories

1. As a player, I want to see Might on Library entries, so that I can recognize their assessed overall power.
2. As a player, I want Might to include support, defense, and special effects, so that damage alone does not define the meaning of power.
3. As a player, I want the tier to follow Might automatically, so that the number and grade agree.
4. As a player, I want an entry at 189 Might to be D and one at 190 Might to be C, so that promotions have clear boundaries.
5. As a player, I want progressively wider Might ranges at higher tiers, so that the grades reflect exponential progression.
6. As a player, I want to see the same valuation in the Library list and detail view, so that opening an entry does not change its apparent strength.
7. As a player, I want related-entry navigation to resolve the same rating, so that inspecting an enemy's kit or a possible drop gives consistent information.
8. As a player, I want unrated content identified explicitly, so that missing information does not look like measured weakness.
9. As a player, I want a real zero-Might assessment distinguished from an absent assessment, so that zero has an unambiguous meaning.
10. As a player, I want provisional ratings marked Estimated, so that I can distinguish an initial assessment from an established one.
11. As a player, I want a short explanation of Might, so that I understand what the number can tell me.
12. As a player, I want the comparison family identified for a rating, so that I know which other entries it can meaningfully be compared with.
13. As a player, I want to sort comparable entries from highest to lowest Might, so that I can find stronger options quickly.
14. As a player, I want to sort comparable entries from lowest to highest Might, so that I can inspect early progression and weaker options.
15. As a player, I want unrated entries placed after rated entries in either Might sort direction, so that unknown values do not interrupt the comparison.
16. As a player, I want to filter by a minimum Might, so that I can find options above a chosen power level.
17. As a player, I want to filter by a maximum Might, so that I can explore content within a chosen allowance.
18. As a player, I want inclusive Might range filters, so that entries exactly on a boundary remain discoverable.
19. As a player, I want Might filters to combine with search, tier, and existing grouping controls, so that I can narrow the catalogue without losing useful filters.
20. As a player, I want to filter explicitly for Unrated entries, so that I can distinguish unassessed content from the rated catalogue.
21. As a player, I want my Library URL to preserve the new filters and ordering, so that reloads and links reproduce the same view.
22. As a player, I want to change preview attributes without changing authored Might or tier, so that build-specific damage and content valuation remain understandable.
23. As a player, I want invalid filter input and empty results handled clearly, so that the Library remains usable while I adjust a search.
24. As a player, I want Might information and controls accessible by keyboard and understandable without color, so that I can use the feature on the existing supported layouts.
25. As a player, I want current spells, items, passive skills, and enemies to remain discoverable during migration, so that adding assessments does not remove content from the Library.
26. As a designer, I want to author an assessment once per content definition, so that every Library representation uses the same value.
27. As a designer, I want to record the reference conditions and rationale behind a rating, so that later balance work can explain and revise it.
28. As a designer, I want invalid assessments rejected, so that malformed numbers cannot silently generate plausible tiers.
29. As a designer, I want changing Might across a breakpoint to update the derived tier, so that I do not maintain two conflicting power labels.
30. As a designer, I want to choose a Might budget within an intended tier and reassess the complete result, so that interacting effects cannot exceed their intended allowance unnoticed.
31. As a designer, I want to add ratings incrementally, so that implementing the feature does not require inventing values for the entire catalogue.
32. As a designer, I want the first version to preserve combat and acquisition behavior, so that a presentation and assessment change does not silently rebalance existing characters or loot.

## Implementation Decisions

- **Shared ownership.** Put the assessment model, validation, and tier derivation in shared game-domain code. Extend the existing Library catalogue projections and client presentation/search modules to consume that model. The client must not maintain a second threshold table.
- **Content identity.** Associate assessments with stable content definitions, using category and authored type together. Per-instance IDs, ownership, equipment state, preview attributes, and live battle state do not identify a separate assessment. Support the four existing Library categories: spells, items, passive skills, and enemies.
- **Canonical value.** A present Might value is a finite, nonnegative safe integer. Reject negative values, fractions, nonnumeric values, infinities, and unsafe integers at the authoring boundary. Normalize absent assessments to one explicit Unrated state. Never coerce missing data into zero, round invalid authored input silently, or derive a value from an old tier.
- **Assessment metadata.** A rated definition carries its integer Might, status (Estimated or Assessed), and a reference identifier explaining the standard conditions and assessment rationale. Comparison family belongs to the content independently of whether it has an assessment. Keep that evidence maintainable as authored metadata/documentation; no assessment history service or authoring dashboard is required. Invalid authored metadata should fail validation with the affected content identified.
- **Deterministic tier.** Tier is a derived property of a present Might value. An assessment does not author a second tier. Unrated content has no Might-derived tier. A value change takes effect across Library projections, filtering, ordering, and display without separately editing a badge.

| Tier | Inclusive minimum Might | Inclusive maximum Might |
| --- | ---: | ---: |
| E | 0 | 137 |
| D | 138 | 189 |
| C | 190 | 262 |
| B | 263 | 361 |
| A | 362 | 499 |
| S | 500 | No tier ceiling |

- **Exponential normalization.** The five promotion thresholds are the rounded values of 100 multiplied by the fifth root of five raised to promotion steps one through five. Each threshold is calculated from the original expression and rounded once. This yields approximately 38% growth per step. The 100-Might E reference is a unit convention inside E, not the bottom of E. S entry is five times that reference; arbitrary members of E and S need not differ by exactly fivefold. S being open does not authorize mechanically unlimited abilities.
- **Migration.** Initially leave all unassessed production content Unrated. The Library's main tier field, badge, tier sorting, and tier filters use only Might-derived grades. If the old authored grade is retained in the Library, show it separately in details as **Legacy tier A**, for example; never use it as a fallback for a Might-derived grade. Existing runtime/persistence tier fields outside the Library can remain for compatibility in this version. Do not change rewards, drop chances, equipment eligibility, combat rules, or saved builds as part of the migration.
- **Main display.** Show the integer and derived grade in list rows and details. Assessed content uses **C · Might 190**. Estimated content additionally displays **Estimated**, with an approximate-value indication permitted in presentation while the canonical stored number remains an integer. Unrated content uses **Might —** with an Unrated explanation. A valid zero displays **E · Might 0**. Use the existing visual language rather than introducing a Library redesign.
- **Player explanation.** Explain that Might values overall power, including special effects, relative to comparable content under standard conditions. Expose a readable comparison-family label in details. Keep internal measurement and implementation details out of the primary player flow.
- **Comparison scope.** A spell, weapon, armor piece, passive, and enemy do not acquire interchangeable numbers merely by each having a 100-point reference. For this version, comparison families use the existing content taxonomy: spells, passive skills, enemies, and each equipment-slot group for items. Family is available for Unrated entries too. Published assessments within one family must use reconciled reference contributions; establishing those contributions belongs to the later calibration pass. There is no cross-category Might ordering or summed character/party Might.
- **Sorting.** Add clearly named ascending and descending Might sorts. Within a family, sort by the canonical number, with deterministic name/type tie breakers. Unrated entries sort last within their family in either direction. Estimated entries participate numerically at their displayed integer; status remains visible. When several item families are visible, show separately labeled family groups in stable alphabetical order and sort numerically inside each group, rather than ranking one equipment slot against another. Existing item-group filtering can narrow that view to one family. No additional family selector is required. Keep existing non-Might sort behavior available. Tier sorting uses derived grades, with Unrated last.
- **Filtering.** Add optional inclusive minimum and maximum Might bounds and an Unrated tier option. An active numeric bound excludes Unrated entries. No bound means no numeric restriction. Keep tier, text, and existing group filters conjunctive. The Unrated option does not include zero-valued assessed entries. Make the new grade controls available for enemies as well as the other categories when applicable.
- **Filter input and URL behavior.** Extend the existing validated Library search state and route parameters for Might ordering and bounds. Empty bounds mean absent bounds. Accept only nonnegative safe integers. For direct URL input, discard malformed bounds; if the valid minimum exceeds the valid maximum, discard both. In the UI, show an inline error for an invalid or reversed range and keep the last valid applied range until corrected. Clear/reset controls remove the relevant range and group restrictions. Unknown or incompatible groups fall back to the category's unrestricted group. Numeric bounds apply independently within each visible family; Might ordering still preserves the labeled family groups. Category switches and related-entry navigation reset Might bounds and ordering to the destination's defaults, consistent with the existing navigation pattern. Preserve existing links.
- **Preview independence.** Attribute sliders continue to update ordinary spell descriptions and damage previews. They do not recompute Might, change assessment status, or move entries between tiers. Ordinary previews must not be repurposed as an automatic rating formula.
- **References and empty states.** Related entries and possible drops continue resolving through the catalogue identity. Any grade or Might shown for those references comes from the same projected entry. An empty result explains that no entries match and offers the existing way to clear filters. All-Unrated categories remain fully browsable with ordinary search and existing non-Might sorts.
- **Persistence and delivery.** Assessments are authored content metadata delivered through the existing shared catalogue. No new database table, server endpoint, account preference, balance service, or per-character stored Might is required for this version. Isolated test/development fixtures may demonstrate rated behavior; they must not become public assessments of current content or add fake entries to the production catalogue.

## Testing Decisions

- **Behavioral tests.** Assert values and interactions observable at public catalogue/query and rendered Library boundaries. Test the contract, not the organization of helper functions, component internals, or a duplicate implementation of the threshold formula.
- **Primary existing seam: Library catalogue and query behavior.** Extend the existing tests that build all four real catalogues, resolve combat-kit/drop references, change preview attributes, parse search state, and filter/sort entries. Exercise rating projection through the same public path used by real authored metadata and use ordinary catalogue-entry fixtures for query cases. Avoid a separate test hook for each content class or a production rating added only to satisfy a test.
- **Threshold and assessment cases.** Test the public shared Might validation/tier contract directly for zero; one below, exactly at, and one above every promotion threshold; values above S entry; and invalid numbers. This small public contract is the only new domain boundary that needs direct edge-case tests; do not introduce catalogue-injection machinery merely to test arithmetic. At the catalogue/query boundary, cover missing assessment, Estimated and Assessed values, and conflicting legacy grades. Verify that a changed assessment crossing 189 to 190 changes both the returned grade and tier-filter membership. The same applies to a downgrade.
- **Catalogue integrity and preview stability.** Preserve complete catalogue coverage, unique category/type identity, serializability, deterministic projections, and resolution of all related/drop references. Assert that preview attribute changes can change damage while leaving Might, status, family, and tier unchanged. Check that invalid rating metadata identifies the affected content rather than silently falling back.
- **Query cases.** Exercise ascending/descending Might ordering, equal-value ties, zero versus missing, Estimated values, Unrated placement within each family, inclusive one-sided/two-sided ranges, combined filters, Unrated-only selection, and safe handling of unknown or malformed URL values. Cover reversed ranges, resetting bounds on category switches/related navigation, and item-family grouping even when group input is unknown. Verify existing URLs and non-Might searches still work with an entirely Unrated catalogue.
- **One focused rendered Library seam.** Mount the existing Library page using the repository's React/Happy DOM test pattern and exercise visible controls with rated, Estimated, and Unrated catalogue fixtures. Verify list/detail agreement, accessible labels, status explanations, range validation, sort/filter interactions, and attribute-preview stability. Reuse the existing public catalogue boundary for fixture provision; do not mock the Might lookup or query logic under test.
- **Prior art.** The current Library rules tests already exercise catalogue completeness, preview scaling, references, search parsing, and numeric sorting with zero/missing values. The mounted Cards control tests demonstrate React rendering, user actions, focus assertions, and cleanup using Happy DOM. The existing development Library page supports a focused browser check of the real layout.
- **Visual and regression scope.** Check the Library in a browser at desktop and narrow widths, including keyboard use and an all-Unrated catalogue. Run the affected Library tests and relevant typechecks/build checks. Use the repository's isolated test-file runner for DOM/module-mock isolation. Broaden testing only for actual changes to shared behavior. Combat sweeps do not validate rating quality and are unnecessary for metadata-only implementation.
- **Calibration is separate evidence.** The existing 3,392 synthetic combat probes and their ten measurement tests establish controlled engine observations. They neither assign production ratings nor prove that one general formula prices every effect correctly. Do not turn those descriptive means into a universal score in this issue.

## Out of Scope

- Assigning or inventing final Might values for the existing catalogue, including converting old E–S labels into numerical values.
- Validating the first 100-Might reference in representative encounters, reconciling reference families, or publishing the subsequent representative-content calibration pass.
- Automatically pricing arbitrary special effects, running simulations during Library browsing, or recomputing Might from a character's current attributes.
- Rebalancing spells, equipment, passive skills, enemies, encounters, resource costs, or effect timing.
- Changing acquisition rarity, loot/drop probabilities, economy prices, or eligibility rules.
- Migrating every non-Library tier presentation or persisted runtime tier in this first version.
- Summed character/party power, universal comparisons across unreconciled families, upgrades with per-instance ratings, or tiers beyond S.
- A rating editor, analytics pipeline, historical assessment database, or redesign of the Library.

## Further Notes

The accepted vocabulary and direction are **Might**, stronger overall higher tiers, approximately fivefold progression from a 100-Might E reference to S entry, and exponential promotion ranges. Might is assessed first; the grade follows it. A designer may target a budget, but the completed combination must justify its assessment.

The research and first engine calibration are supporting work, not a completed balance model. For example, current Fireball did not outperform an equipped staff attack in the controlled sample despite its old A label; Fleetfoot's usefulness depended strongly on the recipient; Arcane Channeling's output depended on useful target count. Those observations support the explicit Unrated migration and the need to account for complete actions and costs.

After this issue, the next balance pass should validate simple attack, healing, control, weapon, and armor references, assess a small representative set under declared conditions, and then extend coverage. Assessments may change with evidence. No finished catalogue calibration is a prerequisite for implementing this issue.

The implementation issue is self-contained. The current local research and probe artifacts may not yet be present on the branch used by a future implementing agent; their absence must not cause the agent to invent ratings or block this model-and-Library work.
