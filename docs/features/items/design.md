# Equipment, consumables, and materials

Design proposal, 15 September 2026. This document proposes the item model and
module interfaces; it does not record an implemented feature.

The [foundation spec](spec.md), published as
[issue #6](https://github.com/ChristianSchneeweiss/game/issues/6), defines the
implementation scope. These design notes also retain the later consumable-use
direction and its outstanding gameplay choices.

The [maintainability assessment](research.md) checks this proposal against
primary sources and records contracts to clarify before implementation.

## Scope

The requested item kinds are equipment, consumables usable in or outside battle,
and materials covering the remaining items. All item kinds have tiers. Materials
have an assigned tier without Might; consumables also have an assigned tier and
do not require Might. Consumable Might assessments can be considered later.

Extend the existing per-enemy loot functionality to award the new item kinds.
Consumables must be equipped for battle and may be used directly from inventory
outside battle when their definition allows that context. Consumable effects,
battle action costs, and exact loadout rules remain to be decided. The storage,
stacking, and module choices below are recommendations.

## Recommended model

Use one catalog of item definitions, with three explicit kinds:

| Kind | Ownership representation | Behavior |
| --- | --- | --- |
| `equipment` | Individually identified copies | Equip a particular copy on a character; apply its equipment rules in battle. |
| `consumable` | Quantity per owner and item type, with a separate consumable loadout | Equip for battle; use directly from inventory outside battle. Spend a quantity when an allowed use succeeds, within the definition's supported contexts. |
| `material` | Quantity per owner and item type | Hold and award the item. Other features may spend it later; it has no direct Use or Equip action. |

Materials are an explicitly authored kind. An unknown item type is invalid;
it must never silently become a material. A material being spent by another
feature does not make it a consumable: consumables have their own use behavior.

Keep these three identities distinct:

- **Item kind:** `equipment`, `consumable`, or `material`.
- **Item type:** a stable catalog identifier, such as the existing `iron-sword`.
- **Owned copy:** the existing unique ID for one piece of equipment. Identical
  consumables and materials instead share a stack identified by owner and type.

An item definition exists independently of ownership or a character. Its shared
metadata includes its type, kind, name, description, and tier. Presentation
metadata can be resolved from this definition without constructing a combat object.

The definition is a discriminated union: checking `kind` determines which fields
exist. Equipment has a gear slot and equipment-specific rules. Consumables use
their own loadout slots; being equippable does not make a consumable equipment.
Consumables have authored use definitions for battle, outside battle, or both.
Each supported context must have an actual implementation; a consumable cannot
declare no usable context. Materials need neither set of fields.

### Tiers and drop rates

Use **tier** consistently for the existing E–S scale. Equipment keeps its existing
Might-based grading. Material definitions simply assign a tier; no Might,
assessment, or quality-to-power formula is needed. Consumable definitions also
assign a tier. Might is optional future balance work for consumables and is not
a prerequisite for defining, displaying, dropping, equipping, or using them.
Do not add a placeholder assessment framework for them in the foundation.

Inventory and Library presentation must show the authored tier of materials and
consumables even without Might. Their absence of Might does not erase that tier,
mark it Unrated, or imply zero power. Keep the existing Might behavior for
equipment and other currently assessed content.

Enemy-specific drop rates are already supported:

- `BaseEnemy` accepts authored `loot.items` and appends the existing equipment
  drops for that enemy.
- Each `ITEM` entry stores `dropRate` beside `data.itemType`.
- `LootManager.drop` independently rolls each entry with `rng() < dropRate`.
- Existing convenience helpers can supply tier-based default rates; an enemy's
  explicit entry still owns its actual chance.

Extend this functionality rather than introduce another drop system. Widen item
reward identifiers to include consumables and materials, add quantity with a
backward-compatible default of one, and extend claiming to grant equipment copies
or stack quantities as appropriate. Keep the current per-entry rolls and authored
enemy chances. Validate chances in the supported 0–1 range and quantities as
positive integers.

Generalize the equipment-only default item-drop helper where useful: obtain tier
from the shared catalog rather than constructing equipment with a fake holder.
Keep existing tier-based defaults and explicit enemy rates intact. A global
`dropRate` field on every item definition is unnecessary; tier may inform a
default chance without fixing an item's chance across all enemies.

### Equipped consumables: gameplay recommendation

Make consumables a preparation choice alongside spells and gear. A starting
proposal is two dedicated consumable slots per character, each holding one item
type and a limited quantity. The slot count and quantity caps need playtesting;
they are not accepted balance values. A healing potion, mana potion, and status
remedy then compete for places in a loadout.

Keep gear slots separate from consumable slots. Lock battle supplies when the
encounter starts, permit loadout changes during preparation, and consume actual
reserved stock when used. Inventory stack size and equipped quantity limits are
different concepts: owning 100 potions should not automatically permit 100 uses
in one battle. Reserving selected quantities is recommended, with the existing
cross-store recovery requirements still applying.

Confirmed: outside-battle use is direct from inventory, with no equipping step.
The definition must still allow that context. Battle action cost remains open.

Limited equipped recovery/utility choices have a first-party precedent in
[Grinding Gear Games' original flask design rationale](https://www.pathofexile.com/forum/view-thread/55111/page/1).
Those flasks are refillable, so this is evidence for loadout tradeoffs rather
than a proposal to replace disposable consumables. Their later
[balance manifesto](https://www.pathofexile.com/forum/view-thread/3147157)
also describes how repeated low-cost use undermined those decisions. For this
game, limit battle quantities and tune action cost so consumables remain tactical
options rather than an obligatory repeated action. These are design judgments;
the sources do not establish an ideal slot count for this game.

## Existing code and the seam to change

The current model uses broad names for equipment-specific responsibilities:

- `apps/game/src/items/item-types.ts` contains equipment identifiers only.
- `apps/game/src/items/equipment/item-factory.ts` takes a holder and always
  returns `Equipment`.
- `apps/game/src/items/equipment/equipment.ts` owns stat modifiers and combat
  lifecycle hooks. `BaseItem` also combines owned identity and display metadata.
- `apps/server/src/db/schema.ts` stores owned equipment in `equipment_stats`,
  with an `equipped_by` character reference and no quantity.
- `apps/server/src/game-usecases/loot-manager.ts` turns every `ITEM` reward into
  a new equipment row.
- `apps/game/src/utils/loot.ts` already provides tier-based default chances, but
  its equipment-drop helper requires constructing equipment to read its tier.
- `apps/client/src/routes/items/index.tsx` displays the equipment collection.

The seam belongs between catalog definitions, owned inventory, and activated
equipment behavior. A catalog lookup must not require a holder. Creating runtime
equipment may continue to require one.

Introduce a narrow `EquipmentType` before expanding the current `ItemType` to
all catalog identifiers. Equipment slots, enemy loadouts, character builds,
equipment visuals, and saved equipment decoding must accept `EquipmentType`.
Rename `itemFactory` to `createEquipment` and keep its return type `Equipment`.
This lets TypeScript catch accidental attempts to equip a material.

Retain equipment's runtime implementation, including special equipment hooks.
Consumables and materials do not need to inherit those hooks or acquire empty
methods to satisfy them. They also do not need runtime classes merely to appear
in inventory. Shared display data comes from the catalog rather than a parallel
set of equipment names and descriptions.

## Modules and interfaces

### Item catalog

The catalog owns definition lookup, kind-specific validation, and the equipment,
consumable, and material type sets. Its ordinary read interface is
`getItemDefinition(itemType)`.

Keep authored definitions grouped by kind inside its implementation. Equipment
runtime construction reads the same equipment definition used by inventory.
Adding a plain material should mean adding its definition and any reward source,
without editing battle or equipment code.

### Inventory

The inventory module owns account ownership, representation of copies and stacks,
and quantity changes. Its small server-side interface is conceptually:

```ts
readInventory(db, userId)
grantItems(tx, userId, grants)
spendItems(tx, userId, costs)
```

These are design sketches, not client-callable grants or arbitrary spending
endpoints. Authenticated gameplay commands supply the owner and derive grants or
costs from server-known rules. `tx` is the existing database transaction, allowing
loot claiming or an outside-battle effect to commit with the quantity change.

`grantItems` accepts item types and positive integer quantities. It creates that
many equipment copies or increases the matching stack. `spendItems` initially
accepts stackable types only, rejects insufficient stock, and applies a batch
completely or not at all. No caller needs to choose a table or implement its own
read-then-decrement sequence.

`readInventory` returns a union of equipment copies and stack entries. Equipment
entries retain their equipped character reference. Stack entries expose quantity.
Consumable loadout allocations are separate from the shared stack: one stack may
supply multiple characters or encounters, and a single `equippedBy` on that stack
would misrepresent ownership. Inventory reads distinguish available and reserved
quantities when reservations are implemented, and join entries with catalog metadata.

This is the main deep module: removing it would spread ownership checks, stack
merging, quantity validation, and concurrent spending rules across reward and
item-use callers. Keep those rules local to its implementation.

### Consumable use

Use is a gameplay command, separate from the low-level stock operation. A caller
submits the item type, intended target/context, and a request identity. The use
module resolves the definition and validates ownership, quantity, supported
context, equipped availability where required, and the target before committing
an effect and spending the item.

Expose a committed use operation rather than a caller-driven sequence of
`canUse`, `applyEffect`, and `decrement`. A preview can report availability, but
committing must validate again. Invalid use changes neither stock nor gameplay
state. Retrying an accepted request must not spend or apply the effect again.

The pure game-rule implementation can return an outcome for a supplied state;
it must not read the database. Existing battle command handling may apply it to
the candidate battle that is discarded if validation or journal storage fails.
Do not refactor the whole battle engine into immutable state for this feature.

Battle and outside-battle use have different persistence paths. Keep their
integration explicit instead of introducing one enormous context object with
optional database, battle, character, and dungeon fields. Define the concrete
effect and target interfaces when the first consumables are chosen.

Existing equipment commands remain responsible for equipping and unequipping
owned equipment copies. Consumable loadout commands assign item types and
quantities to dedicated slots without invoking equipment's stat lifecycle hooks.

## Persistence recommendation

Keep `equipment_stats` and existing equipment IDs. Narrow its TypeScript type
to `EquipmentType`. Add `item_stack` with an owner, stackable item type, and
positive integer quantity, unique on `(user_id, type)`. Remove a depleted stack.
Concurrent grants and spends must serialize correctly and never create negative
stock. Initially use one unbounded logical stack per type; bag capacity and stack
caps are separate gameplay choices.

The inventory module hides these two representations. Two tables preserve the
real difference between individual gear and interchangeable quantities without
requiring every consumer to understand it. A unified table would add mixed
quantity/equipping constraints and migrate existing equipment for little present
benefit.

For rewards, retain the existing `ITEM` category. An item reward gains quantity;
old saved rewards without quantity mean one. Keep random drop selection separate
from inventory mutation, and grant claimed items inside the existing locked loot
claim transaction. Equipment quantities produce distinct owned copies.

## Battle and dungeon integration constraints

Two existing properties make consumption more than a new inventory button:

1. A character may participate in multiple dungeon runs concurrently. Between
   encounters, current health and mana belong to that run's `characterData`.
   A restorative use there must identify the dungeon and character and commit
   against that run's current state. Character progression items may need a
   different target when those effects are specified.
2. `reconstructBattle` replays saved commands. Battle use must reproduce its
   effect and remaining battle stock without reading or spending live inventory.
   Rebuilding the candidate battle happens during normal command processing,
   so an inventory write inside rule evaluation would spend repeatedly.

Postgres inventory and the battle Durable Object's journal do not share one
transaction. A plain inventory decrement followed by appending a battle command
is insufficient: failure between the writes could lose an item or duplicate use.

Battle use requires equipped consumables. The stock policy behind that loadout
still needs to be chosen:

| Policy | Design consequence |
| --- | --- |
| Reserve equipped quantities for an encounter (recommended) | Inventory reserves stock before battle. Frozen battle supply and journaled uses are self-contained. Initialization, settlement, and returns must be retryable; unused stock returns exactly once after completion or abandonment. |
| Equip item types and draw from shared inventory during battle | Consumption needs a durable per-request reservation/commit protocol across inventory and the journal, including recovery of interrupted requests. Snapshotting the shared count alone permits overspending across runs. An additional per-battle use limit would still be needed for the recommended gameplay. |

Equipping is now part of the requested direction. Selected encounter supplies
are the recommendation for making that choice meaningful while bounding battle
uses. The item catalog and ordinary inventory do not depend on the final slot
count or action cost.

When battle use is implemented, record its accepted command and include the
necessary supply and rule data in versioned starting state/journal data. Old
battles restore with no consumable supply. Keep effect resolution and stock
spending deterministic under the recorded rules. Block an outside-battle use
from racing encounter start or modifying a run's resources during its active
battle; it must participate in the existing run locking/readiness rules.

## Delivery sequence

1. **Separate item definitions from equipment runtime.** Narrow equipment-only
   consumers and establish the three-kind catalog and tier metadata. Materials
   and consumables use assigned tiers without requiring Might. Preserve existing
   equipment IDs and behavior.
2. **Add owned stacks and shared inventory reads/mutations.** Extend the existing
   enemy item rewards to all three kinds with quantity, and route claims through
   the inventory module. Preserve authored enemy chances and existing defaults.
   Present the collection with Equipment, Consumables, and Materials filters; keep gear
   loadouts restricted to equipment. Design dedicated consumable loadout
   controls. An item can be displayed before its use controls are introduced.
3. **Choose and implement the first consumable uses.** Specify their targets,
   effects, allowed contexts, and battle action costs. Specify consumable slots,
   equipped quantity limits, and outside-battle target rules. Implement
   outside-battle transaction handling and the chosen battle supply/recovery policy.

The design does not introduce crafting, trading, bags, subclasses per material,
a generic effect scripting language, or a replacement battle engine.

## Verification through the interfaces

Implementation should demonstrate:

- Definition lookup needs no character; equipment-only paths reject other kinds.
- Materials and consumables display their assigned tier without a Might value.
- The existing enemy loot path can drop and grant every item kind, retaining
  authored probabilities, tier-based defaults, and independent rolls per entry.
- Consumable slots accept consumables only, gear slots accept equipment only,
  and battle use rejects items outside the frozen consumable loadout.
- Awarding two identical swords produces two copies; awarding stackable items
  merges quantities. Invalid quantities and insufficient stock change nothing.
- Concurrent spending of the last available item succeeds once. Another player's
  inventory cannot be spent, and failed loot claims do not partially grant items.
- Existing saved equipment, loot without quantities, and battle recordings remain
  readable and preserve their behavior.
- Committed consumable use spends and applies its effect once. Rejected use,
  repeated requests, battle recovery, and concurrent runs preserve that invariant.
- Run-targeted uses affect only the selected run and serialize with encounter
  start. Battle supply initialization, completion, and abandonment recover from
  interrupted writes without losing or duplicating stock.

The last two groups become executable tests with the first consumables and the
selected battle supply policy. No gameplay tests were run for this design-only
document.
