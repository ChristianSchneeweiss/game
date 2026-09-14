# [Convert all battles to configurable tactical grids with movement and tile targeting](https://github.com/ChristianSchneeweiss/game/issues/3)

## Problem Statement

Battles currently let players choose entities to attack or support, but their positions have no combat meaning. A melee strike can reach the same targets as a ranged spell, weapons do not define Basic Attack's reach, and area attacks cannot reward arranging enemies into a particular shape. Players cannot reposition to line up attacks, protect a partner, or choose where to commit to combat.

The game needs tactical movement and understandable tile targeting throughout the existing battle system. Ability authors also need to change a spell's shape or range in one place, and encounter authors need larger or rectangular arenas for different fights without changing combat code.

## Solution

Convert the complete current battle system to an authoritative battlefield of square tiles. Each encounter specifies its width, height, blocked cells, and starting formation; 7 × 7 is the default, not a fixed engine limit. All current spells, equipment, enemy kits, and encounters must work with the grid in solo and two-character cooperative play.

Each actionable activation grants the entity its current Movement allowance, initially based at 3 and modifiable independently of Agility. Players can spend that allowance across several orthogonal moves, then cast once or explicitly end their turn. Casting ends the activation. Existing initiative, mana, cooldowns, ownership, and effect lifecycles continue to apply.

Spells define targeting through editable coordinate footprints, common presets, and an aiming mode: selected tile, chosen direction, caster-centered, or global. The equipped weapon supplies Basic Attack's targeting and damage profile. Both battle presentations show legal movement and targeting through the same rules the server uses. Accepted actions, positions, and outcomes remain recoverable and replayable.

Use the initial spell and weapon assignments below. Fireball remains single-target at range 1–3. Existing spell numbers and tiers remain the baseline, with a proper tier and scaling pass deferred. A prototype or one integrated encounter can be an implementation stage; neither alone completes this issue.

## User Stories

1. As an adventurer, I want the complete current battle system converted to movement, positioning, and tile targeting across every encounter, so that my existing solo and two-character dungeon runs consistently use tactical combat.
2. As an encounter author, I want independently configurable battlefield width and height with a shared 7 × 7 default, so that rectangular and larger encounters use the same combat rules.
3. As an encounter author, I want fixed hero slots and enemy starting formations preserved with the encounter's layout version, so that retrying the same encounter produces stable starting conditions.
4. As an adventurer, I want each living entity to occupy one tile and block movement while death frees its tile and team changes preserve its position, so that battlefield occupancy remains predictable.
5. As an adventurer, I want orthogonal movement around explicitly blocked tiles while spells and weapon attacks ignore those obstacles, so that navigation and attack reach follow clear initial rules.
6. As an adventurer, I want a dedicated Movement stat starting at 3 and modified by equipment, passive skills, and effects independently of Agility, so that mobility can vary without changing initiative.
7. As an adventurer, I want to spend my remaining Movement across several legal moves before casting, so that I can inspect targeting between moves without receiving additional movement allowance.
8. As an adventurer, I want a fresh movement allowance for every actionable activation, including extra actions, so that repeated appearances in the turn queue each provide their intended opportunity to reposition.
9. As an adventurer, I want casting to end my activation and an explicit End Turn action to permit passing after movement or without acting, so that every activation can finish cleanly.
10. As an adventurer, I want movement commands to preserve the existing initiative, mana, cooldown, and effect lifecycle boundaries, so that dividing movement into several commands does not accelerate combat clocks.
11. As an adventurer, I want existing stun and charge restrictions to prevent voluntary movement as well as casting when my activation is not actionable, so that movement cannot bypass effects that prevent acting.
12. As an adventurer, I want aiming range measured by Manhattan distance to the selected center while the complete footprint expands and clips only at battlefield edges, so that I can predict which tiles an area attack covers.
13. As an adventurer, I want to aim at empty center or direction tiles while immediate damage attacks require an eligible enemy somewhere in their footprint, so that useful area placements remain possible without committing attacks that cannot hit.
14. As an ability author, I want each spell's footprint expressed as typed coordinate offsets or a reusable preset in one configuration, so that changing its shape updates targeting, previews, and resolution together.
15. As an ability author, I want directional footprints authored once facing north and rotated by the shared resolver for each cast, so that directional spells work consistently without duplicated patterns or persistent facing.
16. As an adventurer, I want footprint recipients determined by current team relationships and liveness, with enemy-directed attacks ignoring allies and allied targeting including the caster, so that spatial coverage and target eligibility remain distinct.
17. As an adventurer, I want all 39 current spells converted according to the agreed assignments, including Fireball as a single-tile enemy attack at range 1–3, so that my existing collection remains usable with its accepted targeting defaults.
18. As an adventurer, I want directional lines to affect every eligible enemy on their listed cells without stopping at intervening actors or obstacles, so that their previews accurately describe their piercing behavior.
19. As an adventurer, I want Lightning Surge, Earthshatter, and Arcane Channeling to retain explicit global targeting and Nature's Embrace and Aegis Wall to retain party-wide targeting, so that these accepted spells preserve their battlefield-wide roles.
20. As an adventurer, I want Storm Pulse to choose up to three distinct random enemies from its global eligible candidate pool only when committed, so that its preview shows possible recipients without promising or consuming random outcomes.
21. As an adventurer, I want Volt Lash to choose each of up to four sequential strikes from the currently living eligible global candidates with repeat victims allowed, so that deaths and team changes affect later strikes correctly.
22. As an adventurer, I want Arcane Channeling to retain its original enemy identities and discharge against surviving eligible recipients after charging without charging its costs again, so that movement does not change this spell's accepted delayed behavior.
23. As an adventurer, I want self spells to aim automatically and ally-selectable support spells to accept living eligible recipients even when healing or buffs may have no additional effect, so that the grid preserves existing support choices.
24. As an adventurer, I want applied effects to follow their recipients when they move and secondary caster effects to remain independent of offensive footprints, so that positioning does not unintentionally change existing spell effects.
25. As an adventurer, I want existing damage formulas, effect chances, multi-hit sequencing, and special spell behavior preserved except for the explicitly accepted conversion changes, so that the grid does not silently redesign my build.
26. As an adventurer, I want my equipped weapon to supply Basic Attack's targeting, damage type, base damage, and attribute scaling while retaining its zero mana cost and cooldown, so that weapon choice directly affects how I fight.
27. As an equipment author, I want configurable Iron Sword, Oakwarden Staff, unarmed, and enemy fallback attack profiles with a list of additive attribute contributions, so that the accepted weapon defaults use one consistent system.
28. As an adventurer, I want my active battle's weapon profile and executable rules to remain consistent with its frozen build and rules version, so that equipment changes outside that battle do not alter its attacks.
29. As an enemy AI maintainer, I want enemies to evaluate useful legal casts from their current tile and reachable destinations, so that they can choose effective movement and attacks with their configured abilities.
30. As an enemy AI maintainer, I want enemies without a useful cast to approach a reachable future attack position or pass safely with stable tie-breaking, so that distant targets and blocked routes do not stall the battle.
31. As an adventurer, I want enemy threat previews to show possible movement and attack reach distinctly from committed charged attacks, so that I can assess danger without mistaking possibilities for promised actions.
32. As an online party member, I want movement, casting, and passing restricted to the owner of the active character, so that hosting a dungeon does not grant control over another player's character.
33. As an online party member, I want stale, invalid, and repeated commands handled without unintended state changes, resource spending, or random draws, so that latency and reconnection cannot duplicate actions or corrupt the battle.
34. As an online party member, I want reconnecting to restore the authoritative battlefield, positions, activation, and exact remaining movement after every accepted command, so that I can continue from the committed state.
35. As an adventurer, I want movement paths, legal anchors, affected tiles, and eligible recipients previewed through the same rules used to resolve commands without consuming combat randomness, so that planning reliably matches execution.
36. As an adventurer using the 3D presentation, I want actors, tile picking, movement paths, attack footprints, and camera framing derived from the actual battlefield dimensions, so that rectangular arenas remain readable and interactive.
37. As an adventurer using the 2D fallback, I want equivalent movement and targeting controls including empty-tile selection, so that every tactical action remains available without the 3D presentation.
38. As an adventurer using mouse, touch, keyboard, or reduced motion, I want accessible battle controls and a clear distinction between planned and committed actions, so that input method and animation preferences do not limit tactical play.
39. As an observer or returning adventurer, I want replays and recovery to preserve resolved paths, positions, victims, strike order, and delayed outcomes while existing battles retain compatible legacy rules, so that recorded and unfinished battles remain trustworthy.
40. As an ability and encounter author, I want validated, centrally editable dimensions, layouts, footprints, ranges, and weapon values separated from battle-specific saved rules, so that future balance changes remain straightforward without silently changing active or historical battles.

## Implementation Decisions

1. **Complete conversion through shared combat rules.** Extend the existing shared game, battle command, enemy decision, persistence, and presentation modules. The shared game module owns combat geometry and eligibility; React and Three.js display and request actions rather than deciding legality. Reuse current damage, healing, status, and lifecycle behavior where compatible. All registered spells, current equipment, enemy kits, and authored encounters must be covered before completion.

2. **Encounter-configured battlefield.** Store positive integer width and height, blocked cells, and starting placements with the battle. Encounter definitions may omit dimensions to use the shared 7 × 7 default; resolved battle state always contains explicit dimensions. Width and height are independent, so an 11 × 9 test arena is valid. Validate the whole layout, including sufficient distinct unblocked starting tiles for its participants; reject invalid authored coordinates instead of silently clamping them. Indexing, occupancy, pathfinding, clipping, picking, camera framing, and the fallback presentation use actual dimensions. No rule assumes 49 cells or coordinates limited to 0–6.

3. **Stable encounter starts.** Author fixed party slots and enemy formations for every existing encounter, supporting both one- and two-character parties. Freeze the resolved dimensions and layout version when creating a battle and preserve them for retries, recovery, and replay. An encounter can differ in dimensions from the next encounter. Do not resize an active battlefield or regenerate an old layout from updated authoring data. Specific valid starting coordinates are implementation work within these rules; no separate player deployment phase is required.

4. **Occupancy and initial terrain.** One living entity occupies one tile, including visually large enemies. All living entities block movement, including allies. Movement is orthogonal and each traversed tile costs one step. Blocked cells prevent movement, not attacks; there is initially no line of sight, cover, or elevation. Death frees an entity's tile. Team changes affect target eligibility without changing its position. Ordinary healing retains its existing inability to revive a dead entity. Art must communicate the actual movement-only obstacle rule.

5. **Movement stat and activation state.** Add Movement to the entity attribute/modifier model with a base value of 3, independent of Agility. Equipment, passive skills, and effects can modify it. Each new actionable activation receives an allowance from the entity's current modified Movement. Track a distinct activation identity, active entity, granted allowance, and steps spent. Movement grants are non-negative whole tile steps. Several accepted moves consume the same allowance; submitting another movement command does not grant more steps. Each extra action is another activation and grants fresh movement. Movement and ranges do not automatically scale with battlefield dimensions.

6. **Turn progression.** Movement is available before casting. A successful cast ends the activation, including a legal cast whose optional proc misses. End Turn allows passing before or after movement. Movement does not spend mana, advance the queue, tick cooldowns, or repeat upkeep/end-step processing. Preserve existing initiative and effect clock boundaries. Stun/charge restrictions that prevent acting also prevent voluntary movement in skipped activations. Extra actions retain their existing scheduling. An Agility debuff does not acquire a Movement penalty automatically.

7. **One shared spatial query interface.** Provide read-only queries for reachable destinations and paths, legal tile anchors or directions, potential footprint cells, and eligible recipients. Use these queries for player previews, authoritative validation, and AI. Translation, rotation, bounds checking, footprint deduplication, and occupant lookup belong behind this interface. Uniform-cost orthogonal pathfinding can use breadth-first search, with deterministic path ties. A movement request may specify a destination; the server chooses and records the actual legal path. Queries and previews do not consume combat randomness or mutate live battle state.

8. **Simple spell authoring and typing.** A spatial spell's affectedTiles is a readonly list of integer coordinate-offset pairs, authored inline or by referencing a shared preset. Use a discriminated aiming contract: tile aiming includes an inclusive minimum/maximum range and a footprint; direction and caster aiming include a footprint; global aiming has neither a footprint nor range. Recipient configuration distinguishes enemies, allies, and everyone, relative to the caster's current team; allies include the caster. Use typed cast selections that match the aiming mode: a tile coordinate, a cardinal direction, or no manual aim for caster/global casts. Runtime schemas validate finite integer coordinates, nonempty valid spatial patterns, range bounds, and matching selection modes. Duplicate footprint entries never cause accidental duplicate hits. Replace the old exact ally/enemy target-count validation for grid casts rather than maintaining two competing targeting definitions.

9. **Range and rotation semantics.** Tile range measures Manhattan distance from the caster to the selected center only. Expand the entire footprint from that center, clipping only at actual board edges; a range-3 plus can affect a tile four steps from the caster. Offsets use positive x to the right and positive y downward. Directional patterns are centered on the caster, authored facing north, and rotated to the cast's selected north/east/south/west direction. Directional reach is encoded by offsets rather than a second range rule. The selected adjacent tile is a direction selector and may be empty. Rotation does not depend on team, camera angle, last animation, or persistent facing.

10. **Eligibility and committing a cast.** Immediate damage attacks require at least one eligible enemy in the footprint before committing; the chosen center can be empty. A single-tile enemy attack therefore needs an enemy on its selected tile. Allied support requires a living eligible ally and permits self when in range; full health or an existing buff alone does not invalidate a target. Self and global spells aim automatically while retaining explicit cast confirmation. Eligible candidates come from the server's current board and team state, not a client-supplied victim list. Preserve existing resource-once behavior and legal no-op results. A spatially empty result must never trigger the old empty-target substitution to the caster.

11. **Footprints and special spell execution.** The targeting interface returns potential candidates, not a promise that every candidate will be hit. Ordinary areas affect every eligible occupant. Storm Pulse and Volt Lash perform their distinct random selection during committed execution. Use a deterministic candidate/recipient order for new grid rules while preserving legacy ordering for recovery of old battles. Preserve sequential effect execution, per-cast versus per-target chance scope, and liveness checks between deliberate multiple hits. Applied effects follow entities that move; secondary effects such as healing the caster remain part of spell execution independently of the main footprint. The initial special rules below are normative.

12. **Weapon attack profiles.** Basic Attack remains a spell. The equipped weapon supplies its aiming configuration, damage type, rolled base damage range, and a list of additive attribute scaling contributions. Calculate contributions from current modified attributes, add them to rolled base damage, then use the existing damage pipeline. Reuse the existing attribute and damage-type vocabularies. An empty scaling list is valid. Profiles are editable in one place and use the same targeting resolver as spells. Future concrete conditional behavior has one shared evaluation point with explicit combat inputs and serializable configuration; do not build a general expression language or invent unused condition types. Weapon profiles change Basic Attack only, not the targeting or formulas of other collected physical spells. Keep Basic Attack's zero mana cost and zero cooldown. Preserve the active battle's captured profile and rule version if equipment changes outside that battle.

13. **Enemy decisions.** Enemies use the same Movement, targeting, and action rules as characters. Evaluate useful legal casts from the current tile and reachable destinations, select a move/cast pair, or approach a reachable tile from which an attack can eventually work. Path toward an attack position, not an occupied victim tile. If no useful action or approach is possible, end the activation safely. Use deterministic utility and tie-breaking, considering useful damage/healing/control and movement cost; prefer fewer steps when benefits tie. Evaluate possibilities without advancing live combat RNG. AI must handle longer approaches on larger boards, occupied routes, depleted mana, unavailable spells, and no eligible targets without throwing or looping.

14. **Enemy information.** Show possible movement-plus-attack reach and turn order. Enemies choose actual actions when their activation arrives. Exact threatened areas are promises only for specific charged attacks with explicit committed semantics, not a universal prediction of every enemy's next action. Global and random attacks must be presented truthfully; potential recipients are not guaranteed victims, and Arcane Channeling is not advertised as a ground attack that movement can dodge.

15. **Authoritative commands and ownership.** Extend the existing battle command interface with movement and explicit end-turn commands alongside spatial casts. Commands identify the active entity/activation, expected state revision, and an idempotency identity. Validate owner, active activation, freshness, bounds, occupancy, movement budget, legal path, resources, cooldowns, and cast eligibility before mutation. Only the owner controls a character's move, cast, or pass. Keep host leadership and character ownership distinct; retain the shared-run rules for invitations, readiness, roster, and waiting for disconnected owners. Invalid or stale commands change neither combat state nor RNG. Repeated accepted command identities do not apply twice.

16. **Atomic persistence and command revisions.** Extend the existing candidate-reconstruction and persist-before-swap command processing to all action types. Apply a command to an isolated candidate, persist its accepted journal/state, and only then publish it as committed. A failed action or journal write leaves live and recovered state consistent. A command/state revision advances on every accepted mutation, including an end turn without a damage/effect event; event count alone must not be the freshness guarantee. Reconnection synchronizes committed state and the exact remaining allowance. Preserve existing idempotent battle completion, dungeon progression, resource carry-over, and rewards behavior.

17. **Schemas, freezing, recovery, and replay.** Update runtime serializers and schemas as well as TypeScript interfaces. Persist explicit board dimensions and starting layout, frozen spell/weapon configuration, compatible rule and journal versions, and sufficient activation/movement state. Record movement start/path/end, aimed and potential tiles where applicable, actual recipients, repeated strike order, and resolved position changes for presentation. Server recovery re-executes accepted commands with the correct rules, RNG ordering, and deterministic AI. Visual replay consumes recorded outcomes. Retain supported legacy behavior for existing non-grid journals and recordings; a version field without the corresponding implementation is insufficient. Configuration frozen from an old battle must not silently execute newly changed weapon/spell behavior. Introduce grid rules for new battles during a staged rollout, then cover every current encounter before completion.

18. **3D, 2D, and accessible interaction.** Render entities from authoritative tile positions. Show legal destinations, paths, remaining Movement, legal aim choices, full footprints, and eligible recipients. During targeting, clicking an entity selects its tile while inspection remains available. Keep planning separate from committing: selecting a spell, inspecting targets, hovering, or changing direction must not spend resources; provide explicit Cast and End Turn controls. Clear or revalidate pending choices after movement or authoritative state changes. Derive world centering, ground size, picking, and camera framing from actual width/height. Extend the Cards fallback with usable 2D tile controls, including empty-tile targeting. Support mouse, touch, keyboard, and reduced motion. Animations follow recorded paths and outcomes; they neither decide arrival nor advance combat. Reconnect, skip, seek, and reduced motion reach the same authoritative positions and resources.

### Initial footprint presets

All spatial presets use the same resolver and can be replaced by custom offset data. Names below identify the initial definitions; they do not introduce separate shape-specific execution algorithms.

| Preset | Footprint definition |
| --- | --- |
| single | The anchor tile only. |
| plus | The anchor and its four orthogonal neighboring tiles. |
| frontThree | Three tiles in the row immediately north of the caster: one forward-left, one forward, one forward-right; rotate for the chosen direction. |
| lineTwo | The first and second tiles directly north of the caster; rotate for the chosen direction. |
| lineThree | The first, second, and third tiles directly north of the caster; rotate for the chosen direction. |
| ringOne | The eight tiles surrounding the anchor, including diagonal neighbors and excluding the anchor. |

Directional lines affect every eligible enemy on their listed cells. Actors and terrain do not stop them. Movement remains orthogonal even when an attack footprint contains diagonal offsets.

### Initial spell assignments

This table is the accepted starting catalogue. All ranges are inclusive and measured in tiles. Tile aiming uses the named preset at the selected center; caster aiming uses it at the caster; directional aiming uses the rotated caster-relative pattern. Existing spell damage formulas, mana costs, cooldowns, tiers, effect chances, and durations remain unchanged except for the explicitly described conversion behavior and the new Basic Attack profiles.

| Spell type | Aiming and footprint | Recipients and retained behavior |
| --- | --- | --- |
| basic-attack | Equipped weapon profile | Enemies; weapon supplies damage and scaling too. |
| fireball | Tile, range 1–3, single | One enemy; explicitly remains single-target. |
| single-heal | Tile, range 0–3, single | One ally, including self; retain healing formula. |
| crude-strike | Tile, range 1–1, single | One enemy; retain Agility debuff chance. |
| festering-blow | Direction, frontThree | Covered enemies; local cleave replaces global reach. Retain vulnerability effect. |
| cinder-wisp | Tile, range 1–3, single | One enemy; ranged magical attack. |
| vital-strike | Tile, range 1–1, single | One enemy; caster still heals from damage dealt outside the offensive footprint. |
| splinter-shot | Tile, range 1–4, single | One enemy; retain armor debuff chance. |
| cinderbrand | Tile, range 1–3, single | One enemy; applied burn follows the entity. |
| precise-thrust | Direction, lineTwo | Every covered enemy; gains a second possible victim. |
| soulflare | Tile, range 1–3, single | One enemy; preserve caster healing from damage dealt. |
| charred-chains | Tile, range 1–3, plus | Covered enemies; applied vulnerability follows its recipients. |
| crushing-blow | Tile, range 1–1, single | One enemy; retain stun behavior. |
| stone-bark | Caster, single | Self armor buff; preserve executable self-only targeting. |
| rootgrasp | Tile, range 1–3, plus | Covered enemies; retain stun, including its action-prevention behavior. |
| verdant-smite | Tile, range 1–3, single | One enemy; retain armor debuff. |
| natures-embrace | Global | All allies, including caster; party-wide healing. |
| lightning-surge | Global | All enemies; retain damage and existing stun-roll scope. |
| stunning-strike | Tile, range 1–1, single | One enemy; retain stun chance. |
| staggering-jab | Tile, range 1–1, single | One enemy; retain stun chance. |
| battle-roar | Tile, range 1–2, single | One enemy; status-only stun attempt. |
| torrent-spiral | Caster, ringOne | Enemies in the eight surrounding cells; retain physical damage and existing vulnerability effect. |
| tidepiercer-thrust | Direction, lineThree | Every covered enemy; preserve per-target defense-ignoring proc. |
| ocean-blessing | Tile, range 0–3, single | One ally, including self; retain stronger single-target healing. |
| aqua-wave | Direction, frontThree | Covered enemies; Agility debuff does not automatically reduce Movement. |
| tidal-pulse | Tile, range 1–3, plus | Covered enemies; no artificial three-target cap. Retain Agility debuff. |
| stream-of-life | Caster, single | Automatic self healing. |
| rupture | Tile, range 1–1, single | One enemy; applied bleed follows the entity. |
| storm-pulse | Global candidate pool | Up to three distinct random eligible enemies, without replacement. |
| volt-lash | Global candidate pool | Up to four sequential random strikes; repeats allowed, pool refreshed each strike, stop when empty. |
| final-verdict | Tile, range 1–1, single | One enemy; retain current health-threshold damage calculation and damage pipeline. |
| aegis-wall | Global | All allies, including caster; existing shield behavior, not a physical obstacle. |
| bulwark-bash | Tile, range 1–1, single | One enemy; retain guaranteed stun subject to existing effect rules. |
| earthshatter | Global | All enemies; retain cast-level stun roll and bonus requiring two successful applications. |
| deflecting-stance | Tile, range 0–2, single | One ally, including self; partner targeting remains available. |
| bladestorm-rhythm | Tile, range 1–1, single | One enemy attacked twice with separate rolls and a liveness check between hits. |
| iron-will | Tile, range 0–3, single | One ally, including self; retain cleanse, defenses, and recipient-health-based conditional healing. |
| arcane-channeling | Global at cast time | Capture original eligible enemy identities; delayed discharge filters those identities for survival and current eligibility. |
| fleetfoot-gambit | Tile, range 0–3, single | One ally, including self; retain extra-action scheduling and grant fresh Movement on that activation. |

For Storm Pulse, preview all possible recipients without drawing its random outcome. Preserve its current physical damage. For Volt Lash, resolve global candidates through the shared targeting interface afresh for each strike; do not merely filter an initial list or deduplicate deliberate repeat hits. Record actual strike order separately from potential candidates. Its initial behavior is random strikes, not proximity-based chaining.

For Arcane Channeling, preserve the existing charge lifecycle and captured identities. A later global re-selection would be a behavior change. Movement does not dodge its discharge. The discharge is not an additional paid cast or an extra activation; it still occurs at the existing lifecycle boundary and preserves normal turn processing.

Update descriptions to match the configured footprint and actual execution. In particular, Stone Bark is self-only, Tidal Pulse has no independent three-enemy cap, Rootgrasp applies stun, Agility is the actual attribute behind existing “DEX” descriptions, and Earthshatter's stun-roll scope is cast-level. Retain Final Verdict's existing damage-pipeline calculation at its health threshold; do not turn it into an unconditional defense-bypassing execution as part of this feature.

### Initial weapon values

These are accepted provisional defaults, deliberately editable for the later tier/scaling pass. The base range is rolled using existing combat behavior, then current modified attribute contributions are added before the existing damage pipeline.

| Profile | Aiming | Damage |
| --- | --- | --- |
| Iron Sword | Tile, range 1–1, single enemy | Physical, base 0–15 + 0.25 × Strength |
| Oakwarden Staff | Tile, range 1–3, single enemy | Magical, base 0–15 + 0.25 × Intelligence |
| Unarmed | Tile, range 1–1, single enemy | Physical, base 0–8 + 0.10 × Strength |
| Enemy default Basic Attack | Tile, range 1–1, single enemy | Physical, base 0–15, no attribute scaling |

Enemy-specific attack profiles may override the fallback through the same configuration. No new spear, bow, or axe equipment is required; those were examples of future extensibility. Existing non-weapon equipment must continue to function, and the Movement attribute must participate correctly in the ordinary modifier and serialization model.

## Testing Decisions

1. **Primary test seam: committed battle commands and observable outcomes.** Prefer the existing authoritative command interface exercised through the real battle engine and Durable Object integration harness. Submit movement, cast, and end-turn requests and assert resulting public state, resources, activation, emitted outcomes, committed journal, and recovered state. This is the principal seam for geometry, ownership, turn behavior, and persistence together. Avoid mocks of combat rules, private-method assertions, snapshots of internal containers, and tests that simply reproduce the implementation's calculations.

2. **Use existing higher-level integration prior art.** The maintained battle suite already exercises real server commands, candidate journal commits, frozen-build reconstruction, mounted client battle hooks, authored dungeon use cases, spell/passive/enemy registries, and seeded encounter sweeps. Extend those harnesses. Use the existing presentation reducer and mounted client seam for visible state; reserve focused public spatial-query tests for geometry invariants that cannot be clearly expressed through command scenarios. Browser checks cover actual tile input, camera framing, accessibility, and rendered feedback. No new test framework or separate fake combat engine is required.

3. **Configurable-board behavior.** Exercise the default board and at least one larger rectangular board such as 11 × 9. Verify both axes, edge/corner clipping, tile-to-world and picking alignment, invalid dimensions/layout rejection, enough valid starting cells, death freeing occupancy, team changes without movement, stable retry layouts, and longer AI approaches. Ensure the larger board does not automatically scale Movement or spell range, while global targeting includes its eligible occupants.

4. **Movement and activation behavior.** Cover orthogonal shortest legal paths, blocked routes, allied/enemy occupancy, occupied destinations, path-cost accounting, repeated move commands sharing one budget, modifier-driven Movement, fresh allowance on extra actions, and rejection when over budget or non-actionable. Assert that movement preserves turn clocks and resource state; casting or passing performs the appropriate lifecycle exactly once. A skipped stun/charge activation grants no voluntary movement. Test explicit passing when no cast is legal.

5. **Targeting behavior.** Exercise single, plus, all directional rotations, lineTwo, lineThree, ringOne, caster, and global modes using real occupants. Cover empty anchors with eligible outer victims, rejection of an immediate attack with no eligible enemy, anchor-only range with footprint spill beyond that range, min/max range, board clipping, self-inclusive allies, friendly-fire filtering, and duplicate offsets. Changing a configured footprint must change previews and committed recipients consistently. Preview and inspection must leave state and combat RNG unchanged.

6. **Catalogue, weapon, and special-effect behavior.** Include all 39 initial spell assignments in registry-driven coverage and retain existing spell/passive/enemy sweeps. Assert Fireball is single-target at range 1–3; complete line footprints hit all listed eligible occupants. Verify Sword, Staff, unarmed, and enemy fallback reach and configured damage/scaling through resulting combat state, including modified and multiple contributing attributes. Preserve secondary caster healing, optional-proc no-op casts, Earthshatter's chance scope and application threshold, Bladestorm's repeated rolls and death checks, and effect attachment after movement. Test Storm Pulse's distinct sampling and Volt Lash's repeat-permitted fresh pools without asserting one unjustified random victim in a preview.

7. **Delayed and extra-action behavior.** Compare Arcane Channeling's cast-time identities with discharge after movement, death, and team changes; a newly eligible enemy must not be silently added by re-running global selection. Confirm costs are paid only for the original cast and normal charge lifecycle still runs. Exercise Fleetfoot Gambit's existing extra-action scheduling and the extra activation's fresh Movement allowance.

8. **Command rejection, idempotency, and persistence failures.** Through existing integration seams, test wrong owners, inactive actors, stale revisions, malformed or mismatched aim payloads, duplicate accepted commands, blocked/out-of-bounds moves, unaffordable casts, and failure to persist an accepted candidate. Compare state and subsequent RNG outcomes before/after rejection. Every successful mutation advances authoritative freshness, including a quiet end turn. Failure or retry must not duplicate moves, effects, payment, completion, or rewards.

9. **Recovery and legacy compatibility.** For representative sequences and seeded encounter sweeps, compare uninterrupted execution with recovery after every accepted command, including partial movement, passing, random multi-hit casts, delayed discharge, and extra actions. Change persistent equipment or authoring definitions after a battle starts and verify its captured profiles/layout remain consistent. Test actual supported old-format fixtures alongside new grid journals and replays; changing a version label alone must not make tests pass. Keep existing dungeon progression/resource carry-over integration checks.

10. **Presentation and interaction parity.** Through the mounted client/presentation seams and browser checks, verify movement/aim previews against resolved positions and victims, actor-to-tile selection, empty-tile aiming, cardinal direction choice, Cast/End Turn behavior, ownership gating, and pending-choice invalidation after state updates. Exercise solo and two-owner battles in 3D and the 2D fallback, including larger rectangular boards, mouse/touch/keyboard, reduced motion, reconnect during animation, and replay seek/skip. Geometry previews are exact; stochastic target previews must identify possibilities rather than promise a result.

11. **Completion evidence.** Run the maintained battle rules, integration, registry and authored-encounter sweeps, and the relevant game/client/server and test-harness type checks after migration. Use deterministic seeds and record the failing command prefix when diagnosing a sweep failure. Include playable solo melee, solo ranged, and cooperative mixed-loadout encounters to check that AI, movement, and presentation permit completion. Address regressions rather than silently skipping old tests. Local harnesses do not prove real authenticated multi-client deployment behavior; complete the project's applicable release checks without claiming evidence from an unrun environment.

## Out of Scope

- A proper rebalance of spell tiers, scaling, costs, or the entire collection. Use the accepted initial defaults and retain configurability for later tuning.
- New spear, bow, or axe equipment, new boss content, new spells, or a proximity-based chain-lightning redesign. Configurable larger arenas and reusable attack profiles must support future content.
- Resizing a battlefield during an active battle, procedural layout generation, and a player-controlled deployment phase.
- Multi-tile entities, diagonal movement, persistent facing, backstabs, line of sight, cover, elevation, weighted terrain, opportunity attacks, and a shared move/cast action-point system.
- Movement after casting, new push/pull/teleport abilities, persistent ground hazards, new revival rules, movement-only root mechanics, or mandatory combat timers/objectives.
- Fully deterministic enemy-intent puzzles, exact future-action telegraphs for every enemy, combat rewind, and previews that expose or consume future combat RNG.
- Redesigning invitations, readiness, host leadership, character ownership, party size, concurrent dungeon participation, disconnected-owner handling, rewards, or dungeon progression.
- Building a visual spell editor, general conditional-expression language, or replacing the game engine/rendering stack.

The full current catalogue, current encounters, cooperative play, both battle presentations, and recovery/replay are explicitly in scope. Completing only a geometry helper, visual overlay, prototype, or isolated encounter is not sufficient.

## Further Notes

- This specification synthesizes the approved discussion and is intended for direct implementation without another design interview. Seven by seven is only the default; Fireball is explicitly single-target. Numerical weapon defaults are provisional but usable, and later tier/scaling work is not an implementation prerequisite.
- Testing follows the previously proposed and approved command/recovery/presentation approach. The implementation may refine internal interfaces without changing the externally observable rules specified here.
- Stage implementation through one integrated encounter if useful, then finish the complete conversion. Optional experiments in the earlier research do not add requirements beyond this specification.
- Coordinate presentation work with [Build a playable Three.js battle view with explicit Cast controls](https://github.com/ChristianSchneeweiss/game/issues/1) and preserve the consent and ownership decisions in [Add persistent friends and invitations for concurrent two-player dungeon runs](https://github.com/ChristianSchneeweiss/game/issues/2). These related issues are context, not an instruction to reassign ownership or infer new consent.
- This publication is a design deliverable. No grid implementation, combat benchmark, or balance experiment has been completed by preparing the specification.
