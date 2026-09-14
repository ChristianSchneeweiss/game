# Tactical grid feasibility for Shards of Affinity

The approved implementation specification is published as [Convert all battles to configurable tactical grids with movement and tile targeting](https://github.com/ChristianSchneeweiss/game/issues/3), labelled `ready-for-agent`. It consolidates the decisions below; historical research recommendations do not override that specification.

**A battlefield with movement, range, and tile-shaped spells is feasible in the current codebase. It is a substantial combat feature, with good opportunities to reuse the existing spell effects and presentation assets.** The strongest reason to build it is to make spell builds interact with positioning: moving to line up several enemies, choosing between safety and melee reach, or helping a partner set up a stronger cast.

The agreed first version uses an encounter-configured arena, defaulting to 7 × 7 square tiles, four-direction movement, a separate movement allowance before one cast, and a short vocabulary of targeting shapes. Larger or rectangular arenas use the same rules. The equipped weapon determines Basic Attack's range and behavior. Keep the existing initiative queue, mana, cooldowns, and spell collection. Validate the gameplay in one encounter before converting the entire spell catalogue.

The technical confidence is high for geometry and pathfinding, moderate for integration, and unproven for gameplay quality. The significant work is in turn state, enemy decision-making, recovery and replay, and encounter balance. A successful prototype needs to demonstrate interesting decisions, not merely moving miniatures.

## Scope and evidence

This assessment covers movement, positioning, and tile targeting in the existing game. It assumes the present one- or two-character party model and individual turns, including cooperative ownership. Those are documented product rules, not assumptions about a larger squad game.[^1]

Local evidence was inspected on September 14, 2026, at checkout `fdb9914d57edadbd73f9a655d098df328f13860d`, with pre-existing working-tree changes outside the combat files cited here. Repository findings describe implementation; proposed rules and effort ranges are engineering judgments. No integrated grid implementation, combat benchmark, or player study was performed for this assessment.

The accompanying interactive sketch illustrates movement reach and spell footprints. It does not simulate turns, enemy behavior, costs, or the existing combat formulas.

## What the current architecture makes possible

The game already separates several concerns that a tactical grid needs. The battle manager owns the living participants and turn order; spell classes apply effects to entity lists; the server validates commands; and the client reduces resolved events into presentation frames. This means spatial targeting can become the layer that calculates an affected entity list, while much of the effect execution stays in place.[^2][^3][^4]

That reuse has a boundary. The existing spell entry point validates an exact count of selected allies and enemies. A spatial area instead affects whichever eligible entities occupy its tiles. Adding a coordinate field and passing a shorter target list through the old validator would reject valid areas or retain the wrong selection semantics.[^3]

| Area | Observed implementation | Consequence for a grid |
| --- | --- | --- |
| Combat positions | `Entity` has no tile position; the battle interface has no board. | Introduce authoritative board state and actor positions. |
| Targeting | `TargetType` contains enemy and ally counts. Legal targets are filtered by team and liveness. | Add legal anchors, shape resolution, and range rules. |
| Effect application | Base damage/status spells receive `Entity[]`; damage is applied through shared modules. | Reuse many effects after spatial resolution; audit custom spells. |
| Turn progression | A successful server cast calls `postTurn`, prepares the next turn, and advances bots. | Movement must preserve the active turn; casting or passing closes it. |
| Enemy behavior | The base enemy chooses the first affordable, ready spell, then randomly selects eligible targets. | Evaluate positions and legal casts; handle approach and pass actions. |
| Commands and recovery | Cast commands contain `targetIds`; reconstruction accepts only casts. | Persist and replay movement and end-turn commands too. |
| Visual positions | `formation()` derives 3D positions from team and participant order. | Render authoritative positions through a tile-to-world transform. |
| Recorded presentation | Timeline frames track resources, effects, and cues, without spatial state. | Record positions, paths, and aimed/affected tiles explicitly. |

These findings are supported by the battle types, target helpers, command driver, base enemy, protocol, reconstruction, formation, and timeline sources.[^2][^3][^4][^5][^6][^7]

The current presentation’s “melee” category is visual metadata. It does not enforce attack reach. Basic Attack and Fireball currently both select one enemy through the same nonspatial targeting contract. Weapon-dependent Basic Attack profiles would introduce reach and behavior distinctions that are absent from that contract.[^7][^8]

## Agreed initial scope

The destination is a complete conversion of the current battle system to an **encounter-configured grid, defaulting to 7 × 7**, including movement, positioning, and tile targeting. Board width and height are data, allowing larger boss arenas and rectangular layouts without changing combat code. The design must cover all existing spells, equipped-weapon Basic Attacks, enemies and encounters, cooperative play, battle controls and presentation, recovery, and replays. A disposable prototype or one integrated encounter alone does not complete this effort. Implementation can be staged, but the agreed scope is the full conversion.

**The weapon a character has equipped determines their Basic Attack's range, shape, damage type, and attribute scaling.** Basic Attack remains a spell in the combat system, with its attack profile supplied by the equipped weapon. The profile must support additional scaling contributions and future conditional behavior without scattering weapon-specific decisions through targeting, combat commands, and presentation.

This records the design direction; the grid and weapon-dependent attacks are not implemented yet. The current discussion must settle the remaining system decisions and define the conversion before implementation. Earlier prototype recommendations and estimates below remain research context, not a narrower destination. Initial spell assignments and numerical weapon defaults are recorded in the [spell and weapon conversion table](tactical-grid-spell-conversion.md).

**Movement spending:** A dedicated Movement stat starts at 3 and can be modified by equipment, passives, and effects, independently of Agility. Players may spend the available steps across several moves before casting. The allowance refreshes each actionable turn, including extra actions; the earlier single-path restriction is superseded.

**Tile aiming and valid attacks:** Range limits the chosen center tile; the full footprint expands from that center and may extend beyond the aiming range. An immediate damage attack requires at least one eligible enemy in its footprint before confirmation. The selected center or direction tile may be empty.

**Global spells:** Explicit all-enemy and party-wide targeting remains available for higher-level spells. The agreed initial assignments retain Lightning Surge, Earthshatter, and Arcane Channeling as global attacks; Storm Pulse and Volt Lash use global candidate pools with random victim selection; Nature's Embrace and Aegis Wall remain party-wide support. These assignments are configurable independently of tier.

**Encounter starts and enemy information:** Use authored fixed hero slots and enemy starting formations, stable when retrying the same encounter. Show enemies' possible movement and attack reach; enemies choose their actual action on their turn. Exact threatened areas are reserved for specific charged attacks rather than promised for every enemy action.

**Spell authoring requirement:** A spell's affected tiles must be a simple, typed addition to its configuration that can be edited later in one place. The agreed authoring format is coordinate offsets with reusable presets for common shapes. Footprint definitions are data consumed by shared targeting logic. Changing a footprint must update legal targeting, previews, and resolution consistently. Directional footprints are authored once facing north and rotated by the shared resolver to the direction selected for that cast. The proposed TypeScript representation below must support the agreed behavior and initial content defaults.

**Initial content defaults:** Use the [spell and weapon conversion table](tactical-grid-spell-conversion.md) as the starting configuration, with **Fireball targeting one enemy on a single tile at range 1–3**. The other recommended assignments and provisional weapon values are accepted for the initial conversion. A proper tier and scaling pass is deferred; changing those values later must remain straightforward. Full battle-system conversion remains the destination.

## Initial rules

Use **7 × 7 as the default board size**, with width and height configurable per encounter. For example, a boss encounter could specify 11 × 9; that is an illustrative size, not a mandatory boss preset. Resolve the dimensions when creating the battle and retain them for its lifetime, recovery, and replays. With one or two heroes, starting distances and occupied cells need tuning so that larger arenas do not become several turns of walking before useful action.

| Rule | Initial recommendation | Reason |
| --- | --- | --- |
| Board dimensions | Encounter-configured width and height; default 7 × 7 | Allows larger boss arenas and rectangular encounters through data. |
| Movement | Dedicated Movement stat, base 3, modified by equipment, passives, and effects; refresh each actionable turn, including extra actions | Makes repositioning independently tunable from initiative. |
| Turn end | Casting ends the activation; an explicit End Turn allows a pass | Preserves the existing one-cast cadence and permits movement-only turns. |
| Movement spending | Several moves may spend the available allowance before casting | Lets players inspect targeting between moves. |
| Initiative | Keep the existing agility-ordered queue | Isolates the grid’s effect on the game. |
| Occupancy | One living actor per cell; all living actors block movement | Gives the first version a predictable collision rule. |
| Diagonals | No diagonal movement; attack footprints follow the spell or weapon profile | Keeps movement readable while allowing distinct attack shapes. |
| Basic Attack | Equipped weapon determines range, targeting shape, and attack behavior | Gives weapon choice a direct role in positioning and combat decisions. |
| Spell distance | Manhattan distance from caster to chosen anchor | Matches four-direction counting on a square board. |
| Area shapes | Single tile, plus, short line, front sweep, self; explicit global targeting for selected higher-level spells | Supports positional builds and powerful all-target spells. |
| Facing | Choose a direction for directional casts | Avoids a separate facing action or backstab system. |
| Friendly fire | Enemy-damage masks ignore allies by default | Reduces accidental harm in a two-owner party. |
| Terrain | Flat, with at most a few visibly blocked movement cells | Supports navigation without adding a cover system. |
| Line of sight | Omit initially and state that spells ignore obstacles | Prevents hidden corner and occlusion rules. |
| Character size | One tile even for visually large enemies | Defers multi-cell collision and hit deduplication. |

In this version, blockers should look like obstacles that can be attacked over, not tall walls that appear to provide protection. Otherwise the presentation would teach a rule the engine does not implement. If walls are essential to the intended fantasy, line-of-sight rules belong in the first playable slice and the estimate should increase.

Use an activation identity for each occurrence in the turn queue. Extra actions already insert repeated entity IDs into that queue. A repeated ID is a new activation, whereas a movement command is still part of the existing activation. Each actionable activation receives a fresh movement allowance, including extra actions. Playtesting must check the resulting value of extra-action effects.[^9]

An activation skipped by existing stun or charge restrictions allows no voluntary movement. Preserve the existing charge lifecycle until a charged spell is explicitly migrated. Movement must not become a way to bypass an effect that currently prevents acting. A future root that prevents movement while allowing casts would be a separate effect rule.

A dedicated Movement stat, initially based at three and modified by equipment, passives, and effects, is agreed. It is independent of agility: agility already determines initiative, so adding automatic movement scaling would alter two sources of advantage at once.[^2]

### Why movement before casting

There are three sensible action economies, but their consequences differ.

| Model | Benefit | Cost |
| --- | --- | --- |
| Move **or** cast | Smallest change to the existing turn structure | Approaching can consume whole turns; ranged builds gain a strong advantage. |
| Move, then cast | Frequent attacks with meaningful positioning; closest fit to the current cadence | Cannot retreat after attacking; still needs explicit movement state. |
| Shared action points, with move/cast combinations | More freedom and build variety | Rebalances every action, increases planning time, and enables more kiting combinations. |

Move-then-cast is the recommended experiment. It preserves the opportunity to use collected spells on most turns. It is also restrictive enough to make committing to melee matter. If testers consistently want post-cast movement, evaluate that as a separate change rather than introducing it alongside every other grid rule.

## How the spell shapes should work

Treat **where a spell may be aimed**, **which cells its shape covers**, and **which occupants it affects** as three separate rules. This is the most important targeting distinction.

The shared targeting module should handle translation, rotation, board clipping, and occupant lookup for every configured footprint. Common shapes may have reusable data presets, and individual spells must also support custom footprints without requiring a new shape-specific resolver. The same geometry contract should be usable by equipped-weapon Basic Attack profiles.

For a caster at `(cx, cy)` and anchor at `(ax, ay)`, an initial range rule is `abs(ax - cx) + abs(ay - cy) <= range`. Movement uses a shortest traversable path instead: an obstacle may make a nearby-looking cell unreachable within three steps. Graph search and geometric distance answer different questions.[^10]

### Spell authoring and proposed typing

Author footprints as relative coordinate offsets, either inline on a spell or through a reusable preset. A custom footprint uses the same resolver as a preset. An example of the agreed format is:

```ts
type TileOffset = readonly [dx: number, dy: number];
type TilePattern = readonly TileOffset[];

const AREAS = {
  single: [[0, 0]],
  plus: [
    [0, -1],
    [-1, 0], [0, 0], [1, 0],
    [0, 1],
  ],
  // Directional pattern: three tiles in front, authored facing north.
  frontThree: [[-1, -1], [0, -1], [1, -1]],
} as const satisfies Record<string, TilePattern>;

// In the spell's targeting configuration:
// affectedTiles: AREAS.plus
// or affectedTiles: [[0, 0], [1, 0]]
```

The following is a proposed TypeScript representation of the agreed targeting modes. It is a design sketch, not implemented code:

```ts
type SpatialTargeting = { affectedTiles: TilePattern } & (
  | { aim: "tile"; range: { min: number; max: number } }
  | { aim: "direction" }
  | { aim: "caster" }
);

type SpellTargeting = {
  affects: "enemies" | "allies" | "everyone";
} & (SpatialTargeting | { aim: "global" });
```

Tile aiming centers the offsets on the selected tile, with range measured only to that center. Caster aiming centers offsets on the caster without rotation or an aiming step, and allies/everyone include the caster when covered. The proposed representation for global targeting is `targeting: { aim: "global", affects: "enemies" }`, with no tile offsets, range, or tile-selection step. It selects all eligible living candidates on the board; ordinary global spells affect them all, while special random attacks select recipients during execution. Use `affects: "allies"` for a party-wide spell. Global reach is explicit per spell, not an automatic consequence of its tier.

**Agreed directional convention:** `aim: "direction"` centers the footprint on the caster. Authors write offsets facing north: positive `dx` is right, positive `dy` is down, and north is `(0, -1)`. The chosen direction is separate cast input, not a change to the spell configuration. The shared resolver rotates the footprint to north, east, south, or west before translating it to board coordinates. Developers configure one footprint, never four rotated copies or per-spell rotation code.

For example, a directional spell using `affectedTiles: AREAS.frontThree` covers `[1,-1], [1,0], [1,1]` relative to the caster when aimed east, and `[-1,-1], [-1,0], [-1,1]` when aimed west. Its three-tile width stays the same. Selecting an adjacent tile can choose the direction even when that tile is empty; the full footprint determines affected enemies. Preview and cast resolution use the same geometry. This establishes the configuration convention, not a final cleave profile for a particular weapon.

This targeting configuration replaces the old count-based `targetType` for grid spells. Runtime validation must check finite integer coordinates and valid range bounds, and repeated offsets must never cause accidental duplicate hits. The conversion table specifies the initial piercing and delayed-resolution behavior beyond the spatial footprint.

The footprint defines potential recipients. Ordinary area spells affect every eligible occupant; Storm Pulse selects up to three distinct random candidates, while Volt Lash can deliberately strike a recipient repeatedly. The accepted initial spell defaults preserve those mechanics. The implementation keeps those choices in spell execution, consuming candidates from the shared targeting module and recording actual outcomes separately. Deduplicate footprint candidates, not deliberate repeated strikes. Full details are in the conversion table.

### Single tile and plus area

A single-target ranged spell selects a tile containing an eligible target within range. A plus spell selects an anchor and covers the offsets `(0,0)`, `(1,0)`, `(-1,0)`, `(0,1)`, and `(0,-1)`. Clip the footprint at board boundaries; do not wrap it to the other side.

The anchor can be empty. For example, enemies at D3, C4, E4, and D5 can all be hit by aiming at empty D4. Forcing selection of an enemy as the center would prevent this arrangement and remove a useful positional decision.

Apply range to the anchor, then expand the area. Consequently, a plus with anchor range 3 can hit a cell 4 steps from the caster. This is the agreed rule: board edges clip the footprint, but the aiming-range limit does not.

For immediate damage attacks, the agreed rule requires at least one eligible enemy in the footprint before committing. An empty anchor is legal; a footprint containing no valid victims is not. Self spells must remain an explicit targeting kind. The current base spell substitutes the caster when the target array is empty, which would be unsafe if empty spatial results were passed into it unchanged.[^3]

### Weapon-dependent Basic Attack, front sweep, and line

Basic Attack resolves through the equipped weapon's attack profile. That profile defines its reach, legal aim cells or directions, affected footprint, and hit behavior. An adjacent single-target strike is one possible melee profile, not a universal Basic Attack rule.

The agreed starting identities are Iron Sword as an adjacent physical strike scaling with Strength, Oakwarden Staff as a ranged magical attack scaling with Intelligence, and an adjacent physical unarmed fallback. The conversion table supplies accepted provisional damage values, scaling coefficients, ranges, and fallback profiles. Spears reaching along a short line, bows firing at a distant target, and axes sweeping the front row remain illustrative future weapon options, not additional equipment required by this conversion.

The proposed profile type keeps targeting and damage in one editable definition while allowing several attributes to contribute:

```ts
type AttributeScaling = {
  attribute: AllAttributeKeys;
  factor: number;
};

type WeaponAttackProfile = {
  targeting: SpellTargeting;
  damage: {
    type: DamageType;
    base: { min: number; max: number };
    scaling: readonly AttributeScaling[];
  };
};
```

`AllAttributeKeys` and `DamageType` refer to the existing game types. The initial formula adds rolled base damage to the sum of current attribute values multiplied by their scaling factors, then uses the existing damage pipeline. An empty scaling list is valid. A future hybrid weapon can add a second scaling term without changing the shared calculation. The formula and provisional coefficients in the conversion table are accepted starting defaults; the type remains a design sketch, and the implementation and later balance pass are still ahead.

Future conditions should have one shared evaluation point in the weapon attack module and read explicit combat inputs. Add typed, serializable conditions when a concrete weapon needs them; do not require arbitrary callbacks in saved profiles or a general expression language for the first two weapons. Conditions must define when they are evaluated, especially for multiple recipients. The effective targeting profile must be resolved identically for previews and authoritative execution, and executable behavior changes remain covered by battle rule versioning.

Use the same effective weapon profile and spatial resolver for previews, authoritative validation, and AI. Weapon attacks follow the initial obstacle policy too; a ranged weapon does not implicitly introduce line of sight. Resolve the weapon profile from the battle's frozen equipment/build and preserve enough profile data and rule versioning for recovery and replay. Changing equipment outside an active battle must not silently change that battle's Basic Attack. If an actor has no equipped weapon, it needs an explicit fallback profile; enemies likewise need a defined profile when they do not use player equipment.

A front sweep chooses north, east, south, or west and affects the three cells one row forward. Its two outer cells are diagonally offset from the caster. Describe that as “three tiles in front,” distinct from a single adjacent strike.

The sweep should rotate from the chosen direction. It should not depend on the actor’s team, camera angle, or last animation. No persistent facing is needed. For a north-facing sweep the offsets are `(-1,-1)`, `(0,-1)`, `(1,-1)`; rotate those offsets for the other directions.

A short line covers its configured cells in the chosen direction. The accepted initial line presets hit every eligible enemy on those cells, without stopping at the first actor. In the initial no-line-of-sight model, terrain does not truncate spell geometry; later obstacle and projectile rules must be explicit.

### All spells can have spatial definitions without identical interactions

Self buffs can resolve the caster's tile automatically. A party-wide blessing or all-enemy spell can use the agreed explicit global selector. A future chain spell can select one initial target and then resolve hops by proximity. There is little benefit in making a player click their own tile for every self buff.

Spatial definitions should therefore support a small set of distinct target modes. Avoid converting every existing spell to “select a tile, collect all occupants” if that changes its intended behavior unnecessarily.

## Gameplay opportunities and risks

Positioning could make the existing collection system more expressive. A short-range bruiser could build around front sweeps; a caster could seek cluster damage; a support character could choose whether to stay near a partner. Eventually, push, pull, teleport, and persistent ground effects could make one spell set up another. Those are future opportunities, not capabilities already provided by adding coordinates.

The strongest design test is whether **the best tile changes with the situation**. If every melee character always walks toward the nearest enemy and every ranged character always walks away, the grid adds input without much strategy. A compact board, varied enemy reach, and formations that reward different attack shapes give the experiment a better chance.

### Threats need to be readable

Movement becomes more deliberate when players can understand what a destination exposes them to. Initially show enemy reach and the actor order. An enemy’s threat area should account for its possible move plus attack where appropriate; current attack range alone can suggest false safety.

Exact future attack telegraphs are a further feature. Showing a fixed danger area is a promise that the enemy will honor that plan. It requires recording the intended action and defining how displacement, death, control, and blocked movement affect it. A threat preview that means “this enemy could reach these cells” should look and read differently from “this enemy will attack these cells.”

### Melee, kiting, and battle duration

Range changes relative spell value even when damage numbers stay constant. Melee gains an approach cost; long-range spells gain safer uptime; area attacks depend on enemy clustering. Free movement after attacking would strengthen hit-and-retreat loops further. Move-then-cast limits that loop but does not eliminate kiting by itself.

Test solo melee, solo ranged, two melee heroes, and mixed melee/support parties. Include enemies with approach tools or enough reach to contest safe firing positions. Avoid narrow chokepoints where the first ally prevents the second from contributing. If solid allied occupancy proves frustrating, allowing passage through allies while forbidding occupied destinations is a focused follow-up experiment.

Passing also advances effect and recovery clocks. Repeatedly avoiding contact to regenerate resources or wait out cooldowns may become attractive. Measure this before adding a timer; pressure can come from enemy behavior, board size, objectives, or a deliberately chosen battle-length limit. A hard timer would itself change the dungeon’s resource game.

### Spell balance needs a catalogue pass

The spell type schema currently enumerates **39 spells**. Fireball remains single-target in the agreed initial conversion. Other assignments change target capacity: Aqua Wave gains a front sweep, while Torrent Spiral and Rootgrasp move from global targeting to local areas. Lightning Surge remains global. These changes need to be visible in descriptions and considered during later balance tuning.[^8][^11]

Keep existing spell costs and damage formulas as the accepted initial baseline. During the later tier and scaling pass, compare useful hits per cast and opportunities to use each spell. A five-cell footprint does not imply five targets, and it may rarely hit more than one on a sparse battlefield.

Weapon-dependent Basic Attack also belongs in this balance pass. Greater reach increases attack uptime, while a sweep or piercing profile can increase targets and secondary-effect triggers. Compare those advantages through the same Basic Attack action across weapon loadouts.

Existing multi-target effects also have meaningful sequencing. The damage module processes targets in order, and the damage-plus-effect base distinguishes a shared cast chance from a per-target chance. Earthshatter has a follow-up conditional on successful effect applications. Changing target counts or ordering can change secondary effects and random draws, even if the primary damage formula is reused.[^12]

### Delayed spells, deaths, and control

Arcane Channeling captures selected entities and later resolves surviving legal members. The accepted initial conversion preserves this behavior with global selection at cast time: store original entity identities, then filter for survival and current eligibility at discharge. Moving to another tile does not dodge this spell. Future ground-targeted charges can instead store original tiles, but that is a distinct spell rule, not part of this initial conversion.[^13]

Dead entities need an occupancy rule. Initially free their cell. If revival can occur, specify whether it succeeds on the original cell only or chooses a deterministic free replacement. A corpse display must not silently remain a movement blocker.

Mind control changes team affiliation in the current engine. It should change target eligibility without teleporting the actor into a new team formation. This is another reason to store battle positions independently from the visual formation function.[^9]

## Relevant tactical-game precedents

These examples demonstrate viable design patterns, not evidence that the same rules will preserve this game’s pacing. The first-party sources are particularly useful because they explain constraints and tradeoffs as well as features.

| Precedent | Primary-source evidence | Application to this proposal |
| --- | --- | --- |
| Into the Breach | Its developer postmortem connects telegraphed attacks with defensive objectives and survival limits, and describes attack restrictions motivated by readability. | Design enemy intent, movement counterplay, and pressure together. |
| Tactical Breach Wizards | The developer describes spell combinations and free rewinds; its level designer emphasizes small maps, explicit mechanics, and a clear concept for each encounter. | Make a few shapes interact well, and give prototype encounters specific tactical questions. |
| Krosmaster Blast | Ankama’s rules use two-character teams, separate movement and spell resources, orthogonal movement, range, and line of sight. | Small parties can support spatial spell combat; movement and casting do not have to compete for one action. |

Matthew Davis’s **Into the Breach** postmortem describes deterministic resolution during the player turn, telegraphed enemy attacks, and a design that moved toward defending vulnerable objects. It also explains UI-driven restrictions on attack geometry and warns that puzzle difficulty can cross sharply into impossibility.[^18] The transferable lesson is that exact enemy intent and the reason to hold ground belong together. If every attack threatens only the tile the hero just left, unrestricted movement can make survival trivial. Unlike that precedent, Shards of Affinity has existing random spell effects and a health/resource-focused dungeon loop; importing a fully deterministic puzzle model would be an additional redesign.

**Tactical Breach Wizards** provides a close thematic precedent for spatial spell combinations. Its official description emphasizes combining abilities and experimenting through rewinds. Steve Lee’s level-design presentation emphasizes small maps focused on a situation, consistent mechanics, and encounters with a clear concept.[^19] For this project, “line up a plus while keeping the healer safe” is a more useful encounter brief than “make a larger arena.” Rewinds are not required for the initial grid: truthful footprint and reach previews provide a smaller first step. Full outcome previews would need to handle this engine’s RNG and effects without leaking or consuming future rolls.

**Krosmaster Blast** is unusually relevant to party size: its official rules give each side two characters and separate movement points from spell action points. It permits interleaving those actions, counts movement and range orthogonally, and adds line-of-sight and tackle rules. A five-turn-per-player limit with territory scoring supplies pressure to engage.[^20] These are useful examples of separable design choices. The recommendation here borrows the separation of movement and casting but chooses move-then-cast for simplicity; it does not assume that a competitive board game’s scoring or tackle penalties fit a solo dungeon run.

## Implementation boundaries

Use the shared game package for the rules. Neither React nor Three.js should decide whether a move or cast is legal. Integer tile coordinates represent simulation state; world coordinates represent how that state is shown. Square-grid relationships and the separation between grid and display coordinates are well-established techniques.[^14]

### Board state

Add a battle-owned board containing dimensions, blocked cells, starting placements, and an explicit rules version. Maintain a position for each actor and one authoritative occupancy interpretation. A map keyed by entity ID would keep persistent character builds separate from transient encounter placement; storing positions directly on battle entities is also viable if every serializer understands the distinction.

Board dimensions are part of encounter authoring, with a shared default rather than a combat constant:

```ts
type BoardSize = Readonly<{ width: number; height: number }>;

const DEFAULT_BOARD_SIZE: BoardSize = { width: 7, height: 7 };

// Example field on a boss encounter definition:
// board: { width: 11, height: 9 }
```

An encounter may omit this field to use the default. The resolved battle state must always contain explicit dimensions. Validate positive integer dimensions and ensure authored blockers and starting positions are in bounds, with enough distinct free starting cells for the participants. Reject invalid authored layouts instead of silently clamping their coordinates. Derive bounds from `0 <= x < width` and `0 <= y < height`. Movement, pathfinding, footprint clipping, global target queries, AI, board picking, camera framing, and the 2D fallback all consume those dimensions; none assumes indices 0–6 or an array of 49 cells.

Spell offsets and ranges stay measured in tiles, and Movement remains an entity stat. Neither scales automatically with the board dimensions. Global spells use the actual battlefield's eligible recipients. Encounter layout and enemy placement can account for the longer travel distances on a larger board. Dimensions may differ between encounters; resizing an arena during an active battle is not part of this design change.

Add activation state such as `activationId`, `actorId`, the movement allowance granted for that activation, and movement already spent. Every accepted movement path consumes the same remaining budget; another move command does not grant a new allowance. Each new actionable activation grants a fresh allowance, including extra actions. Store enough information to reconstruct the exact remaining movement after a reconnect.

Resolve dimensions and starting positions once for a battle. Persist the concrete dimensions, layout, and placements, or an immutable versioned recipe sufficient to reproduce them. Do not regenerate an old battle from the latest encounter layout or rearrange actors when a roster is presented in a different order. A retry of the same encounter uses its saved layout version, including dimensions.

### Shared spatial queries

A small module should expose reachable destinations and paths, legal cast anchors/directions, and a resolved footprint plus ordered affected entity IDs. The same rules should serve server validation, AI, and client previews. Queries must be read-only and must not consume combat randomness.

For the proposed equal-cost orthogonal board, breadth-first search is enough to find reachable cells and shortest paths. Weighted terrain would justify Dijkstra’s algorithm; A* is useful for a route to a particular destination. None of these needs a physics engine or a navigation mesh. Godot’s official grid-navigation API illustrates the same separation of solid points, diagonal policy, and costs, although this TypeScript project does not need to adopt Godot.[^10][^15]

The default 7 × 7 board has 49 cells; an illustrative 11 × 9 board has 99. These counts are examples, not implementation limits. There are at most 25 cells within three Manhattan steps on an unbounded unobstructed grid, including the origin. Larger arenas and increased Movement can increase pathfinding and AI work, so validation should include a larger rectangular encounter, catching swapped axes and checking AI approach behavior when attacks are not yet in range. These are geometry bounds, not measured frame-rate or server-latency results.

### Cast resolution and effect execution

Replace count-based target validation for spatial spells with validation of a cast intent. A representative intent contains the caster, spell, tile anchor or direction, and expected battle revision. The server computes the affected entities; it should not trust a client-provided victim list.

Keep self, entity selection, tile area, and directional targeting explicit. After validation, pass the resolved entities to existing damage/healing/status implementations where their semantics fit. Custom delayed or multi-hit spells need individual review. Define one deterministic recipient order for new spatial casts so equivalent inputs consume random draws and trigger reactions consistently. Preserve the recorded selection order for legacy casts; globally sorting old targets could change their recovered outcomes.

Area damage is not necessarily simultaneous simply because all tiles illuminate together. The present damage module iterates targets. Preserve sequential effect execution initially, using the recipient order defined for the relevant rules version; simultaneous resolution would be a separate change to reactions, deaths, and resource effects.[^12]

### Commands, persistence, and revisions

Introduce commands for movement and ending a turn alongside spatial casts. A destination is sufficient for the initial movement command if the server chooses a deterministic shortest path; the acknowledgement/event must expose that resolved path. If ground hazards later make route choice meaningful, accept an explicit path intent and validate every step.

The existing Durable Object reconstructs a candidate battle, applies the command, persists the accepted journal, and only then swaps in the candidate state. Extend this boundary to all three command types. Movement should not use a side channel that bypasses command ownership or recovery.[^6]

Current revisions use `bm.events.length`. With an End Turn command that produces no effect event, game state could change without that value changing. Introduce an authoritative command/state revision that advances on every committed mutation, or guarantee explicit activation events for all such changes. Keep replay event position and command freshness conceptually separate.[^4][^6]

A command must validate the owner, active activation, expected revision, bounds, occupancy, movement availability, path, and spell eligibility before spending resources. An invalid command changes neither RNG nor state. An uncertain connection should synchronize committed state; it must not move the character twice by automatically resending a command without idempotent handling.

Do not fire upkeep, end-step, or cooldown progression on every subcommand. Movement stays inside the activation; those lifecycle effects belong at the existing activation/round boundaries. The prepared-turn guard helps, but it must be integrated with the new activation identity.[^2][^4]

### Enemy decisions

The current base enemy can choose an affordable spell without checking spatial opportunity. That assumption must change. At minimum, each enemy should evaluate casts from its current tile and legal reachable destinations, choose a useful move/cast pair, or approach a useful future attack position. If none exists, it must pass safely.[^5]

A simple deterministic utility rule can consider expected damage, useful healing or control, exposure after moving, and movement cost. Prefer fewer steps when benefits tie. Do not use the live combat RNG to simulate previews; use expected values or an isolated state. Keep tie-breaking stable for reconstruction.

Path toward a cell from which an attack can work, not the occupied enemy cell itself. Consider blockers when measuring approach progress. A bot that has no target this turn should continue the battle rather than throw, cast at an empty set, or loop forever.

### Presentation and accessibility

The current 3D actors and arena art can be retained in principle. Replace formation positions with a tile-to-world transform; add a board selection surface, path preview, target footprint, and a more top-down camera if required. Board centering, ground dimensions, picking bounds, and camera framing must derive from the actual board width and height. The 2D fallback must also keep larger rectangular boards legible and navigable. Three.js already supports camera-based picking and filtered intersection tests.[^7][^16]

Actor meshes currently have their own click proxies. Tile selection must cooperate with those proxies so clicking an actor during targeting selects its tile, while inspection remains available. Decoration should not determine walkability. Walkability comes from board data, even when scenery appears over it.

Movement needs an authoritative start, path, and destination in presentation frames. Animate between recorded tile positions; never let an animation decide arrival or consume movement. Reduced motion should jump or simplify motion while preserving identical combat state.

The Cards fallback is part of the existing battle UI. It will need a usable 2D grid or equivalent coordinate-based controls; a list of entity cards cannot express empty-tile area selection or movement destinations. Test mouse, touch, keyboard, and reconnect during animation, with a clear distinction between a planned action and committed state.[^7]

### Saved battles and rollout

Current frozen builds save spell configuration but restore behavior through current constructors and methods. A saved configuration alone does not freeze the executable rules. Existing journals and recordings should therefore remain on explicit legacy behavior, while new grid battles carry a distinct rules and journal version.[^6]

Update the starting-build codec as well as the TypeScript interfaces. It validates the serialized spell fields explicitly; adding a field only in memory is insufficient. Store board and starting positions with the battle snapshot, and add movement/activation/spatial-cast event data for recorded presentation.[^6]

Visual replay and server recovery are different compatibility obligations. Visual replay should consume saved outcomes and spatial events. Server recovery re-executes accepted commands and therefore depends on compatible rules, RNG sequencing, and deterministic AI. A grid release must address both.

The simplest rollout is to enable the new rules for newly created, explicitly selected encounters and preserve existing attempts until they finish. A version number needs a corresponding supported code path; merely tagging old data does not make a breaking rule change safe.

## Prototype and delivery plan

### First experiment: one real tactical encounter

Build one flat board with one hero, then simulate a second hero locally. Include at least two contrasting equipped-weapon profiles for Basic Attack, such as adjacent melee and ranged single-target, alongside a plus area, front sweep, self defense, and a heal. Compare weapon loadouts across prototype battles. Include a melee enemy, a ranged enemy, and a deliberately clustered formation. Use existing miniature assets and minimal effects so the experiment answers a combat question.

The first session should exercise moving into range, centering an area on an empty tile, choosing a sweep direction, passing when blocked, and killing a blocker. An enemy should visibly choose whether to attack, approach, or pass. The subsequent integrated slice adds two real owners, authoritative persistence, and reconnecting after movement. Those integration requirements are outside the initial 2–5-day local experiment. A visual tile overlay alone cannot validate the gameplay proposal.

After basic combat works, add one positional consequence such as a clearly scheduled ground attack or a push. Test whether it creates a new plan. Persistent hazards, cover, large units, elevation, opportunity attacks, and full action points can wait for evidence that they solve a real limitation.

### Evidence to collect

| Question | Observation |
| --- | --- |
| Does movement change decisions? | Record cases where players choose a tile for area alignment, safety, support, or setup. |
| Are melee builds productive? | Count turns with no meaningful cast because of distance or allied blocking. |
| Is the grid slowing the game? | Compare decision time, action count, and total battle duration with comparable existing encounters. |
| Do spell builds remain central? | Observe whether spell combinations explain success beyond simple approach/retreat. |
| Are shapes understandable? | Ask players to predict affected entities before confirmation; compare with resolution. |
| Is there a dominant exploit? | Try repeated retreat, corner camping, cooldown waiting, and regeneration stalling. |
| Does cooperation improve? | Observe setup for a partner and cases of accidental obstruction. |

Treat the prototype as promising if different situations reward different destinations, players can predict outcomes, and both solo and cooperative builds can contribute consistently. Reduce or revise the movement layer if it mainly creates approach turns or compulsory clicks. These are proposed evaluation criteria, not findings from completed playtests.

### Effort and uncertainty

The following estimates assume one engineer familiar with this repository, existing assets, a narrow flat-board scope, and normal test/debug time. They are planning ranges rather than measured delivery forecasts.

| Stage | Incremental effort | Included |
| --- | --- | --- |
| Disposable gameplay prototype | 2–5 engineer-days | Local board, movement, a few shapes, simple bots, basic interaction. |
| Integrated playable slice | A further 10–20 engineer-days | Shared rules, authoritative commands, one encounter, recovery, replay, cooperative ownership, 2D and 3D controls, targeted tests. |
| Broader game conversion | A further 15–30 engineer-days | Catalogue and encounter conversion, AI tuning, compatibility, accessibility, balance iterations, release qualification. |

That is roughly **27–55 engineer-days for the broader conversion**, or about **6–11 working weeks** for one person. It is not a commitment that the feature takes that long: preserving more legacy behavior, introducing complex terrain, or requiring extensive content redesign could exceed the range. The appropriate next investment is the 2–5 day gameplay experiment, followed by a revised estimate using actual integration findings.

Algorithm implementation is unlikely to dominate these estimates. UI clarity, old-battle compatibility, bot competence, and playtesting are the larger uncertainties. Parallel implementation can shorten elapsed time after the targeting and activation contracts are fixed, but cannot remove the dependency on validating the gameplay.

### Required verification for an integrated version

Geometry tests should cover boundary clipping, rotated sweeps, empty anchors, diagonal exclusions, and the distinction between range and footprint. Movement tests should include blocked routes, occupied destinations, dead-actor occupancy, and deterministic path ties.

Weapon-profile checks should verify that equipping different weapons changes Basic Attack's legal range and behavior, that preview and resolution match, and that unarmed/enemy fallback profiles work. Recovery must preserve the attack profile captured for the battle even if the persistent character's equipment changes later.

Turn and command tests should cover movement without a clock tick, casting or passing with exactly one end step, extra-action activations, stun/charge restrictions, wrong-owner commands, stale revisions, repeated submissions, and rejection without RNG changes. Run the existing battle rules and spell/enemy sweeps after the command model supports spatial scenarios.

Recovery tests should compare uninterrupted execution with reconstruction after every accepted command. Include disconnect after movement, failed journal persistence, delayed attacks, and old-format battles. Presentation tests should compare previewed cells with resolved event cells, and verify that seek/skip/reduced motion reach the same positions.

No integrated feature checks were run during this research because production combat code was not changed. The existing test scripts and suites provide useful places to add the above coverage, rather than a need for a new testing framework.[^17]

## Recommendation

Proceed toward the agreed full battle-system conversion with encounter-configured board dimensions and a 7 × 7 default, using one playable encounter as an early integration stage. Include a larger rectangular encounter in validation so fixed-size assumptions are caught. The feature fits the game's spell-build identity and the current architecture offers useful reuse. Use playtesting to refine whether placement creates satisfying spell choices for a one- or two-character party.

Implement the grid as authoritative combat state, resolve tiles into affected entities, and preserve the existing effect machinery where appropriate. Treat activation state, no-target AI, and recovery as core parts of the feature. Converting all 39 spells and every encounter should follow a successful playable slice, not precede it.

## Sources

Local sources are first-party repository files inspected at the checkout stated above. External pages were accessed September 14, 2026. Proposed mechanics, board size, evaluation criteria, and delivery estimates are analysis rather than claims made by these sources.

[^1]: Shards of Affinity, [domain model](/Users/christianschneeweiss/Documents/business/loot-game/game/CONTEXT.md:1), definitions of Party, Spell, Legal target, Cast, Battle, and Combat round; local source.
[^2]: Shards of Affinity, [entity contract](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/game/src/entity-types.ts:57), [battle contract](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/game/src/battle-types.ts:12), and [battle manager](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/game/src/bm.ts:307), including preTurn, postTurn, and initiative calculation; local source.
[^3]: Shards of Affinity, [spell contracts](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/game/src/types.ts:37), [target selection](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/game/src/spells/base/targets.ts:5), and [BaseSpell](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/game/src/spells/base/base.spell.ts:29); local source.
[^4]: Shards of Affinity, [server battle commands](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/server/src/battle/commands.ts:16), especially castBattleSpell and advanceBots; local source.
[^5]: Shards of Affinity, [BaseEnemy action and target choice](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/game/src/enemies/base/base.enemy.ts:102); local source.
[^6]: Shards of Affinity, [battle protocol](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/server/src/battle/protocol.ts:13), [reconstruction](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/server/src/battle/reconstruct-battle.ts:9), [command commit boundary](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/server/src/durable-objects/battle-ws.ts:241), [starting builds](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/server/src/battle/starting-builds.ts:10), [build codec](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/server/src/battle/starting-build-codec.ts:70), and [persistence architecture](/Users/christianschneeweiss/Documents/business/loot-game/game/docs/production-architecture.md:1); local sources.
[^7]: Shards of Affinity, [visual formation](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/client/src/routes/battle/-presentation/battle-scene.tsx:88), [BattleActor](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/client/src/routes/battle/-presentation/battle-actor.tsx:29), [3D battle controls](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/client/src/routes/battle/-presentation/battle-view-3d.tsx:62), [timeline reducer](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/client/src/routes/battle/-presentation/timeline.ts:8), and [event schemas](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/game/src/timeline-events.ts:24); local sources.
[^8]: Shards of Affinity, [Basic Attack](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/game/src/spells/basic-attack.ts:4), [Fireball](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/game/src/spells/fireball.ts:4), [Torrent Spiral](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/game/src/spells/torrent-spiral.ts:7), and [Rootgrasp](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/game/src/spells/rootgrasp.ts:7); local sources.
[^9]: Shards of Affinity, [ExtraActionEffect](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/game/src/effect/extra-action.effect.ts:6) and [MindControlEffect](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/game/src/effect/mind-control.effect.ts:4); local sources.
[^10]: Amit Patel, Red Blob Games, [Introduction to the A* Algorithm](https://www.redblobgames.com/pathfinding/a-star/introduction.html), first published May 26, 2014; page states last modification June 5, 2026. Sections on breadth-first search, Dijkstra, heuristic search, and algorithm selection.
[^11]: Shards of Affinity, [spell type catalogue](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/game/src/spells/base/spell-types.ts:3), 39 literal spell types, and [Lightning Surge](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/game/src/spells/lightning-surge.ts:7); local sources.
[^12]: Shards of Affinity, [damage application](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/game/src/modules/damage.module.ts:38), [damage-plus-effect base](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/game/src/spells/base/damage+effect.spell.ts:36), [Earthshatter](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/game/src/spells/earthshatter.ts:8), and [Bladestorm Rhythm](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/game/src/spells/bladestorm-rythm.ts:27); local sources.
[^13]: Shards of Affinity, [Arcane Channeling](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/game/src/spells/arcane-channeling.ts:25), [ChargeEffect](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/game/src/effect/charge.effect.ts:6), and [survivingTargets](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/game/src/spells/base/targets.ts:28); local sources.
[^14]: Amit Patel, Red Blob Games, [Grid parts and relationships](https://www.redblobgames.com/grids/parts/), January 2006 / May 2021; square-grid coordinates and relationships.
[^15]: Godot Engine, [AStarGrid2D](https://docs.godotengine.org/en/stable/classes/class_astargrid2d.html), stable documentation, undated; grid navigation, solid cells, movement costs, and diagonal policies. Used as an implementation precedent, not a dependency recommendation.
[^16]: Three.js, [Raycaster](https://threejs.org/docs/pages/Raycaster.html), current official documentation, undated; camera-based picking, layers, and intersection data.
[^17]: Shards of Affinity, [test and verification scripts](/Users/christianschneeweiss/Documents/business/loot-game/game/package.json:22) and [battle test directory](/Users/christianschneeweiss/Documents/business/loot-game/game/tests/battle/README.md:1); local sources. Existing release documents distinguish local evidence from remaining staging/production qualification.
[^18]: Matthew Davis, Subset Games, [Into the Breach Design Postmortem](https://media.gdcvault.com/gdc2019/presentations/Into%20the%20Breach%20Postmortem%20Final.pdf), GDC 2019. One-based PDF pages 14, 18–22, 27, 31–36, and 47. [Official session](https://www.gdcvault.com/play/1025772/-Into-the-Breach-Design). Historical account of the original game, not an exhaustive current weapon reference.
[^19]: Suspicious Developments, [Tactical Breach Wizards](https://store.steampowered.com/app/1043810/Tactical_Breach_Wizards/), official product description, undated; game released August 22, 2024. Steve Lee, [The Unusual Level Design of Tactical Breach Wizards](https://media.gdcvault.com/gdc2025/Slides/Lee_Steve_TheUnusualLevel.pdf), GDC 2025, one-based PDF pages 16, 22, 33, 36, 92–94, and 98. [Official session](https://gdcvault.com/play/1035209/Level-Design-Summit-The-Unusual). Developer/publisher and level-designer primary sources.
[^20]: Ankama, [Krosmaster Blast — Rules](https://staticns.ankama.com/downloads/blast/kblast-rules.en.pdf), undated English rulebook, printed pages 2 and 6–11. Publisher-authored rules; used as a historical design precedent.
