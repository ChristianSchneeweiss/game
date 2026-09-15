## Problem Statement

Players currently collect and manage equipment, but the item system cannot
represent consumables or materials as ordinary owned items. Item definitions,
inventory reads, equipment construction, and reward claiming assume that an item
is gear associated with a character. This prevents the game from extending its
existing enemy loot with stackable supplies and materials.

Players also need a consistent tier display. Materials should simply have a
tier, and consumables should not require a Might assessment to exist or appear
correctly in the inventory and Library.

## Solution

Add the item-system foundation for three explicit kinds: equipment, consumables,
and materials. Present them through one account-owned inventory and one shared
catalog. Preserve individual equipment copies and represent interchangeable
consumables and materials as quantities. Every item has an E–S tier; materials
and consumables use directly assigned tiers, while equipment retains its
existing Might behavior.

Extend the existing per-enemy item-drop and reward-claim functionality to support
all three kinds and quantities. Preserve authored enemy probabilities, existing
tier-based defaults, and the current independent roll for each loot entry.

This issue implements definitions, ownership, stacks, reward handling, catalog
and inventory presentation, and compatibility. Consumable execution and its
loadout controls are a subsequent phase. Their agreed rules are preserved here:
consumables must be equipped for battle, and may be used directly from inventory
outside battle when their definition allows that context. No first effects,
battle action cost, slot count, or carried-quantity cap has been selected.

## User Stories

1. As a player, I want items identified as equipment, consumables, or materials, so that I understand their purpose.
2. As a player, I want to browse my owned items together, so that I can see my collection without consulting separate ownership systems.
3. As a player, I want to filter my inventory by item kind, so that I can find gear, supplies, or materials quickly.
4. As a player, I want every item to show its name and description, so that I can recognize what I own.
5. As a player, I want every item to display an E–S tier, so that its grade is readable across the collection.
6. As a player, I want materials to display their assigned tier without Might, so that an ordinary quality grade does not depend on a combat assessment.
7. As a player, I want consumables to display their assigned tier without Might, so that unassessed supplies remain understandable.
8. As a player, I want equipment to retain its existing tier and Might behavior, so that this expansion does not change how I assess my gear.
9. As a player, I want identical consumables to display a quantity, so that I can understand my available stock at a glance.
10. As a player, I want identical materials to share a quantity, so that repeated drops do not clutter my inventory with separate copies.
11. As a player, I want duplicate equipment to remain separate owned copies, so that I can distinguish the gear assigned to different characters.
12. As a player, I want equipment to retain its equipped-character information, so that I know which copies are available.
13. As a player, I want materials and consumables excluded from gear slots, so that I cannot accidentally equip them as weapons or armor.
14. As a player, I want my current equipment controls and build previews to keep working, so that the new item kinds do not disrupt character preparation.
15. As a player, I want consumable details to identify their supported use contexts, so that I can distinguish battle supplies from outside-battle items.
16. As a player, I want inventory loading, empty, and failed states to be clear, so that I know whether I own no items or the collection could not be loaded.
17. As a player, I want my inventory quantities to persist after a reload, so that collected rewards remain available.
18. As a player, I want inventory controls usable by keyboard and on narrow screens, so that I can inspect my collection on supported devices.
19. As a player, I want inventory reads scoped to my account, so that another player's collection cannot appear as mine.
20. As a player, I want the same account inventory available to my characters, so that ownership does not depend on constructing one particular character.
21. As a player, I want collecting items to preserve participation in concurrent dungeon runs, so that inventory support does not introduce an account-wide run restriction.
22. As a player, I want enemy rewards to support equipment, consumables, and materials, so that the existing loot flow can award the new item kinds.
23. As a player, I want each enemy's configured drop chance to apply, so that different enemies can remain distinct sources of the same item.
24. As a player, I want a reward to show its quantity, so that I know how many items collecting it will add.
25. As a player, I want claiming stackable rewards to add to existing stock, so that repeat drops accumulate correctly.
26. As a player, I want a reward containing multiple equipment copies to grant separate pieces, so that quantities do not merge gear that can be equipped individually.
27. As a player, I want repeated or simultaneous claims of the same reward to grant it once, so that reconnects and repeated clicks cannot duplicate items.
28. As a player, I want a failed claim to leave both my inventory and the unclaimed reward intact, so that I can retry without losing or partially collecting items.
29. As a player, I want unrelated simultaneous rewards to accumulate correctly, so that one claim does not overwrite another.
30. As a player, I want old rewards without quantities to remain collectible, so that upgrading the game does not strand previously earned loot.
31. As a player, I want existing owned equipment and assignments preserved across the database upgrade, so that I keep my builds.
32. As a player, I want saved battle builds and recordings to remain readable, so that the broader item catalog does not alter historical equipment.
33. As a player, I want authored consumables and materials to appear in the Library, so that I can inspect the same definitions used by inventory and rewards.
34. As a player, I want inventory, Library rows, and item details to agree on names and tiers, so that the same item is represented consistently.
35. As a player, I want tier filters and sorting to work for materials and consumables without Might, so that their assigned grades remain useful.
36. As a player, I want enemy drop references to resolve to the correct item details, so that I can inspect what an enemy can award.
37. As a player, I want Might filters to avoid treating an absent consumable or material assessment as zero, so that numerical comparisons remain meaningful.
38. As a content author, I want one canonical definition per item type, so that changing a name or description does not require maintaining duplicate metadata.
39. As a content author, I want to define and inspect an item without a character, so that catalog data does not depend on a holder or live battle.
40. As a content author, I want to assign material and consumable tiers directly, so that adding content does not require inventing Might values.
41. As a content author, I want existing enemy loot entries to accept the new item kinds, so that I can extend current content through familiar authoring rules.
42. As a content author, I want optional tier-based drop helpers to use shared item metadata, so that generating a default rate does not require creating runtime equipment.
43. As a content author, I want explicit enemy probabilities and current defaults preserved, so that adding item support does not silently rebalance existing drops.
44. As a content author, I want invalid item identifiers, tiers, probabilities, and quantities rejected clearly, so that malformed content cannot become plausible inventory.
45. As a game developer, I want one inventory module to grant copies or merge stacks, so that reward callers do not implement storage rules separately.
46. As a game developer, I want stack spending to enforce sufficient stock and complete-batch success, so that later consumable commands can rely on a safe ownership interface.
47. As a game developer, I want concurrent spending of the last available item to succeed once, so that future uses cannot overspend shared stock.
48. As a game developer, I want isolated fixtures to exercise all item kinds through production interfaces, so that this foundation can be verified before choosing production consumable effects.
49. As a game developer, I want equipment-only type checks and saved-data validation to stay narrow, so that broadening the catalog cannot admit materials into equipment construction.
50. As a game developer, I want tests to verify observable inventory, reward, and presentation behavior, so that internal refactoring does not require rewriting implementation-shaped tests.

## Implementation Decisions

- **Delivery scope.** Implement the catalog, inventory, stack persistence, reward extension, and presentation foundation in this issue. Record the agreed consumable-use rules without implementing effects, battle supply allocation, consumable equipping controls, or a new use command. The foundation must be independently complete; those later gameplay choices are not prerequisites for finishing it.
- **Domain identities.** An item kind is equipment, consumable, or material. An item type is a stable catalog identifier. An equipment copy has its own persistent identity. A stack represents interchangeable copies of one type owned by an account. Unknown identifiers are invalid and never default to material.
- **Canonical definitions.** Extend the existing equipment catalog into the shared item catalog. Consolidate the equipment metadata exception currently authored in its dedicated class. Every item definition has its kind, stable type, name, description, and tier information. Keep definitions grouped by kind inside the implementation, with one source of truth for shared metadata. Do not create another complete display registry.
- **Kind-specific fields.** Model definitions as a discriminated union. Gear slots and equipment modifiers belong to equipment definitions. Consumable definitions describe a nonempty set of supported contexts: battle, outside battle, or both. Materials have no direct Use or Equip behavior. The foundation records context metadata; actual use implementations are introduced with the first consumable gameplay phase, without placeholder effect handlers.
- **Small catalog interface.** Callers can resolve an item definition without an owner, holder, or battle. Keep catalog data independent of runtime equipment construction. Ordinary materials do not need a runtime class or inherited combat lifecycle methods.
- **Narrow equipment integration.** Introduce a distinct equipment-only type and schema before broadening the overall item identifiers. Equipment construction, gear slots, enemy equipment, character builds, visual gear resolution, and saved equipment decoding must remain restricted to equipment. Rename the current equipment-only item factory to make that responsibility explicit; preserve its specialized runtime behavior.
- **Tier policy.** Use tier consistently for the existing E–S scale. Materials and consumables have directly authored tiers and require no Might values, assessment status, or valuation formula. Defer optional consumable Might assessments. Existing equipment and other assessed content retain their current Might calculations and tier presentation. There is no material Might requirement and no second quality field in this issue.
- **Library policy.** Materials and consumables show their authored tier in lists, details, filters, and tier sorting. Missing Might does not erase their tier or label the item Unrated. Omit inapplicable Might presentation for these kinds. Numeric Might filters exclude entries without an assessment rather than treating them as zero; the Unrated filter continues to describe missing assessments in Might-based content. Preserve existing comparison families and numerical ordering for assessed content. Non-Might kinds remain accessible through ordinary and tier-based browsing.
- **Inventory ownership.** Continue account ownership. Inventory reads return equipment copies with existing assignment information and stack entries with quantities, joined with canonical definition metadata. Resolve the owner from the authenticated session for client requests. Keep the existing equipment-only read usable by gear preparation through a narrow projection as needed.
- **Inventory module.** Provide server-side operations to read inventory, grant items, and spend stackable items. Grant requests contain types and quantities; the implementation creates equipment copies or merges matching stacks. Spending initially accepts only stackable kinds. These are trusted gameplay interfaces, not client endpoints for arbitrary grants or spending. Do not add generic persistence adapters solely to anticipate hypothetical storage implementations.
- **Quantity contract.** Quantities and stored totals must be positive integers within the supported database range. Reject invalid input and overflow before committing. Combine duplicate types within a batch before validation. An equipment grant of quantity three creates three independently identified copies; a stackable grant increases one logical stack. Remove depleted stacks. There is no gameplay bag capacity or inventory stack cap in this foundation.
- **Transaction contract.** Inventory mutations participate in the surrounding gameplay transaction. Validate complete batches, acquire required locks in consistent order, and use concurrency-safe changes. Any mutation failure must abort the enclosing operation; callers must propagate failures rather than catch them and commit partial work. Insufficient stock changes nothing. Read-then-write checks without appropriate database concurrency control are insufficient.
- **Persistence.** Preserve the existing equipment table, IDs, ownership, and equipped-character references. Add a stack table with an owner reference, stackable item type, and positive integer quantity, unique by owner and type. Narrow the equipment type at the application/schema interface. Keep physical storage choices behind the inventory module. Do not attach one equipped-character reference to a shared stack or add battle-reservation storage in this phase.
- **Migration compatibility.** Add the stack schema through the project's existing migration process, covering both fresh installations and upgrades. Preserve all existing equipment rows and assignments. Include the new table and constraints in existing schema verification, migration rehearsal, and backup/restore coverage. No live database mutation is needed merely to implement or review the issue.
- **Existing enemy loot.** Extend the current enemy-authored item entries and the existing drop routine. An item reward still uses the existing ITEM category and carries its per-entry drop rate, item type, and quantity. Enemies retain individual probabilities. Preserve independent rolls per entry, entry ordering where it affects deterministic results, and current random-number consumption for existing loot. Do not introduce a replacement drop-table system or a universal probability field on item definitions.
- **Default rates.** Keep current tier-based convenience defaults and authored enemy rates. Generalize equipment-only item-drop conveniences where needed to obtain tier from the shared definition instead of constructing equipment with a fake holder. Existing additive equipment drops remain intact; extending type support must not duplicate existing drops or alter enemy loadouts.
- **Reward quantities.** Add quantity to item rewards, with missing quantity interpreted as one for old authored entries and persisted rewards. Keep drop selection separate from granting ownership. Validate probabilities as finite values from zero through one and quantities as positive integers within supported bounds. Explicitly reject malformed present quantities instead of coercing them to the legacy default.
- **Claiming and retries.** Extend the existing locked loot-claim transaction to grant every item kind through the inventory module and then consume the claim record. A mixed reward succeeds completely or leaves both reward and inventory unchanged. Repeated or concurrent claims must not grant twice; preserve the current retry outcome where an already-claimed reward may report that it no longer exists. No separate generic idempotency framework is required for stock helpers.
- **Inventory presentation.** Adapt the existing item collection to show all owned kinds, with Equipment, Consumables, and Materials filters, item details, and stack quantities. Retain the existing equipment presentation and assignment controls where applicable. Materials and consumables do not expose gear-equipping actions. Display consumer-relevant use-context metadata without presenting an enabled consumable-use action before gameplay exists. Reuse the established interface styling rather than redesigning the whole application.
- **Reward and Library presentation.** Extend existing reward summaries and Library item projections to handle all kinds and item quantities. Preserve enemy-drop navigation and exact probabilities. Ensure names, tiers, and quantities agree before and after claiming, with normal query refresh after a successful claim. New item kinds must not require equipment modifiers, gear icons, or a character merely to render.
- **Concrete content scope.** No production material names, consumable effects, source assignments, or new balance numbers have been selected. Do not invent a production catalog or rebalance live enemies for this issue. Use isolated test/development definitions, including a material and a consumable, to verify the complete authoring-to-claim-to-display path through production interfaces. Keep fixtures out of normal production catalogs. The runtime implementation must support authored definitions of all three kinds without a testing-only alternate grant path.
- **Accepted future consumable rules.** Consumables use dedicated loadout slots distinct from gear. Battle use requires equipping; outside-battle use is directly from inventory when allowed. Equippable does not mean the equipment kind. Keep those facts in descriptions and domain vocabulary, but defer slot counts, carried quantities, action costs, effect targeting, allocation timing, and settlement until that gameplay is specified.
- **Concurrent runs and existing decisions.** Preserve each player's character ownership and the host/readiness rules for shared runs. Items remain account-owned while party membership and current dungeon resources belong to individual runs. This foundation must not reserve an account or character globally, change readiness, or mutate active battle stock. Later supply allocation must respect concurrent runs and each participant's control.
- **Architecture limits.** Use the existing game engine, database, and Cloudflare hosting. No Temporal dependency, external workflow platform, general effect scripting language, or battle-engine replacement is part of this feature.

## Testing Decisions

- **Test observable behavior.** Exercise the same interfaces used by gameplay callers and players. Assert resulting inventory, reward availability, quantities, item details, and compatible saved builds. Avoid mocks of stack arithmetic, tests of helper wiring, per-class snapshots, or assertions about internal method call order.
- **Primary seam: existing rewards and ownership flow.** Extend the enemy reward/drop, authenticated claim, and inventory-read path. Use the current database integration fixture and normal server interfaces. A representative mixed reward must flow from an enemy loot definition through rolling, persistence, claiming, and the returned inventory without manually inserting the final owned items as the only proof.
- **Grant and claim cases.** Verify one stack per owner/type, merging across claims, multiple equipment copies, mixed-kind rewards, zero/guaranteed drop probabilities, deterministic existing loot rolls, different explicit rates for the same item on different enemies, duplicate entries, quantity overflow, unauthorized access, unknown types, malformed quantities, and default quantity one for old rewards. A forced failure during a mixed claim must retain the claim and roll back every inventory change; retry then grants exactly once.
- **Inventory mutation seam.** Use the inventory module's own grant/spend interface for atomic batch and insufficient-stock cases that have no player-facing use command yet. Verify duplicate costs are combined, a deficient batch spends nothing, depletion removes a stack, and two attempts to spend the final item cannot both succeed. Keep this focused; do not build a mock consumable-execution layer to reach it.
- **Concurrency evidence.** Use the project's existing disposable PostgreSQL rehearsal with independent connections for simultaneous stack creation, additive grants, final-item spending, and duplicate claims. The fast embedded database integration tests remain useful, but a single connection executing promises is not sufficient evidence for lock contention behavior.
- **Catalog and presentation seam.** Extend the existing catalog/query tests and the focused rendered Library/collection controls. Demonstrate that every authored type resolves, equipment-only decoders reject the new kinds, material/consumable tiers display without Might, tier filters include them correctly, numerical Might filters do not fabricate zero, and drop references resolve. Verify stack quantities, kind filters, loading/error/empty states, keyboard interaction, and agreement among reward summaries, inventory, and details.
- **Fixtures.** Follow the current isolated Library-fixture and database-fixture patterns. Keep test content out of production and avoid a new public testing interface. For drop checks, use controlled seeded randomness or supplied deterministic RNG values rather than flaky frequency assertions.
- **Compatibility seam.** Extend existing equipment-build and equipment-tier reward integrations to retain equipment IDs, assignments, attributes, and frozen-build restoration after inventory and catalog changes. Cover legacy rewards without quantity and existing saved build decoding. Preserve actual historical behavior rather than merely accepting a wider serialized shape.
- **Database migration checks.** Extend existing fresh/upgrade schema equivalence, interrupted-migration, row-preservation, and backup/restore checks for the new stack table and constraints. Preserve equipment rows, loot, dungeon resources, and saved results. Run migrations only in disposable test targets during verification.
- **Prior art.** The repository already tests full equipment reward claiming and nine-slot persistence, concurrent gear replacement and ownership, frozen equipment snapshots, dungeon completion retry/rollback, catalog completeness and drop references, mounted Library controls, and real PostgreSQL concurrency and migrations. Extend these patterns instead of introducing a parallel harness.
- **Required verification.** Run relevant inventory/reward integrations, catalog and rendered-interface checks, equipment/save compatibility tests, migration/concurrency checks, and client/server type checking. Perform focused browser verification of the changed collection and reward views. Broaden combat testing only for actual changes to shared combat behavior; this issue does not add consumable combat rules.

## Out of Scope

- Consumable effect implementations, first production consumable/material content, and new production drop rates or source assignments.
- Consumable equipping controls, slot counts, carried-quantity caps, battle action costs, target rules, outside-battle use commands, or applying effects.
- Battle stock reservations, run/encounter supply allocation, replenishment, unused-stock returns, and consumption settlement/recovery. These require a subsequent gameplay spec.
- New Might assessments for consumables, Might for materials, revaluation of equipment, changing Might thresholds, or a second quality taxonomy.
- Crafting, trading, selling, bags, inventory capacity limits, per-copy material properties, generalized stack keys, and arbitrary inventory administration endpoints.
- Replacing the enemy loot system, changing reward ownership/distribution, altering existing random rolls, or modifying shared-run leadership and readiness rules.
- A new workflow dependency, Temporal, a general effect framework, a rewritten battle engine, or unrelated frontend redesign.

## Further Notes

This spec captures the agreed foundation and is ready to implement without
choosing consumable gameplay. The earlier suggestion of two consumable slots
was illustrative, not an accepted balance rule. It must not become an implicit
requirement of this issue.

The narrow tier exception for materials and consumables updates the assumption
in the existing Library valuation work that an item needs Might to have a tier.
It does not change equipment or the other currently assessed content families.

For the later battle phase, equipping alone does not decide whether supply is
reserved or drawn from shared stock. Concurrent runs must not spend the same
item twice. Battle reconstruction replays commands, including during normal
command processing, so effect evaluation cannot spend live inventory. Supply
transitions must survive interrupted writes, and recorded rules must preserve
compatible effect behavior after content/code changes. Those constraints are
recorded here for continuity, not as an implemented protocol.
