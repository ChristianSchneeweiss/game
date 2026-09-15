# Item system: maintainability assessment

Research date: 15 September 2026. Reviewed [the proposal](./design.md) against
current repository code and first-party documentation using Exa.

This assessment preceded the user's additions of assigned tiers without required
Might for materials and consumables, extensions to existing per-enemy item drops,
and equipped battle consumables. The [current design](./design.md) records those
additions and their remaining gameplay decisions.

## Verdict

**The catalog and inventory direction is reasonable and maintainable.** Keep
the three item kinds, character-independent definitions, existing equipment
runtime, and one inventory module hiding copies and quantities. Tighten a few
contracts before implementation. Battle consumption remains a later design
decision; its recovery protocol is not complete enough to implement yet.

This is an architectural judgment, not a measured maintainability result. The
external sources establish language and persistence behavior; the choice of
module interfaces and two tables is a judgment about this repository.

| Decision | Assessment | Qualification |
| --- | --- | --- |
| Definitions separate from owned items and runtime equipment | Keep | Extend the existing equipment catalog; consolidate its remaining exception. |
| Discriminated union of three kinds | Keep | Narrow equipment-only runtime validation as well as TypeScript types. |
| Quantity stacks for consumables and materials | Keep initially | Copies of one type must be interchangeable. |
| Existing equipment table plus a stack table | Reasonable local tradeoff | This preserves existing ownership; it is not a universal inventory schema. |
| Small inventory mutation interface | Keep | Specify duplicate costs, batch failure, and transaction ownership. |
| Reserved encounter supplies | Plausible later choice | Simplifies battle-time spending; initialization and settlement still need recovery. |

## 1. Definition separation has a concrete benefit here

**Evidence.** Unity documents shared authored data stored independently of
runtime game objects and referenced by multiple instances. That supports the
separation pattern, without prescribing this game's storage or TypeScript
model. [Unity: ScriptableObject](https://docs.unity3d.com/Manual/class-ScriptableObject.html)

The existing factory already reads `EQUIPMENT_DEFINITIONS` for ordinary gear,
then combines it with the owned ID and holder to construct runtime equipment.
`int-armor` takes a separate path.
[item-factory.ts:7](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/game/src/items/equipment/item-factory.ts:7)
The catalog explicitly excludes that type, whose class owns its display data
and modifiers.
[equipment-catalog.ts:126](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/game/src/items/equipment/equipment-catalog.ts:126),
[int-armor.ts:8](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/game/src/items/equipment/int-armor.ts:8)

**Recommendation.** Build on this catalog and make it the canonical source for
equipment metadata too. A second complete metadata registry would reduce
locality: a rename or balance change could require editing two definitions.
The useful seam is lookup without a holder, followed by equipment construction
when a holder actually exists. Ordinary materials need only a definition.

## 2. The union fits the present kinds; inheritance can stay within equipment

**Evidence.** TypeScript narrows a union when its members share a literal
discriminant, and `never` enables exhaustive checks. Its documentation contrasts
this with one object containing loosely related optional fields.
[TypeScript: discriminated unions](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions)

Here, `Equipment` already has battle interaction and lifecycle hooks, holder
lookup, and stat application. Those responsibilities exist independently of
the proposed inventory categories.
[equipment.ts:29](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/game/src/items/equipment/equipment.ts:29)
The current `ItemTypeSchema` contains equipment IDs, and saved starting builds
use it to decode equipped entries.
[item-types.ts:4](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/game/src/items/item-types.ts:4),
[starting-build-codec.ts:95](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/server/src/battle/starting-build-codec.ts:95)

**Recommendation.** Use the union for definitions and inventory reads. Keep
equipment's existing specialized runtime behavior. Narrow both equipment types
and their runtime decoders before broadening `ItemTypeSchema`; changing only
TypeScript types would leave saved-input validation accepting other kinds.
Derive or validate the type sets against the canonical definitions to avoid
independently maintained lists drifting apart.

The sources do not establish that unions always outperform inheritance. The
judgment here follows the three explicit categories and the existing hooks.
Add no common runtime item superclass or effect framework for hypothetical uses.

## 3. Stacking is an interchangeability rule

**Evidence.** Owned equipment currently has an ID, type, owner, and equipped
character reference, with no quantity field.
[schema.ts:97](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/server/src/db/schema.ts:97)
The proposal chooses one stack per owner and type for the two new kinds.
[Design: persistence recommendation](./design.md#persistence-recommendation)

**Recommendation.** Keep that simple representation, but state its assumption:
all copies of a stackable type have the same relevant properties. An item kind
describes its use; interchangeability determines whether copies can share a
quantity. A future individually rolled material or expiring potion could break
the assumption. That is a reason to revisit storage when such an item is
requested, not to add generalized stack keys or unique copies now.

Keeping `equipment_stats` and adding stacks avoids changing existing equipped
references. This is the local reason for two tables. One catalog and one
inventory interface do not require one physical table. The reviewed external
sources do not prove either table layout intrinsically more maintainable.

## 4. The inventory interface needs an explicit failure contract

**Evidence.** PostgreSQL's Read Committed behavior makes concurrent row updates
wait and then re-evaluate their condition against the updated row. Ordinary
reads take snapshots; merely placing a read and later write inside a transaction
does not by itself protect a stock check. `SELECT FOR UPDATE` locks the row and
returns its updated version after waiting.
[PostgreSQL: Read Committed](https://www.postgresql.org/docs/current/transaction-iso.html#XACT-READ-COMMITTED)

**Recommendation.** Keep ownership, quantity checks, and concurrency handling
inside `grantItems` and `spendItems`. Before implementation, define:

- Duplicate entries for one item type are combined before stock validation.
- Every quantity is a positive integer within the supported storage range.
- Batch spending locks relevant rows in a consistent order and validates the
  complete batch before mutation, or otherwise guarantees equivalent atomicity.
- Failure leaves the whole batch unchanged. Document whether failure requires
  the surrounding transaction to abort; a caught JavaScript exception alone
  does not establish that guarantee. Use an internal savepoint if the interface
  must allow the caller to catch a later failure and still commit safely.
- Retrying a gameplay command cannot grant or spend twice. Its request identity
  belongs to that command's transaction or recovery protocol; low-level stock
  methods need not invent a second independent workflow.

These clarify the proposal's existing all-or-nothing promise. They are future
implementation requirements, not bugs in an implemented inventory module.

## 5. Replay requires stable behavior as well as saved quantities

**Evidence.** The game reconstructs battles by applying saved commands, and it
rebuilds a candidate battle during ordinary command handling before saving the
journal and adopting the candidate.
[reconstruct-battle.ts:16](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/server/src/battle/reconstruct-battle.ts:16),
[battle-ws.ts:292](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/server/src/durable-objects/battle-ws.ts:292)
Starting builds preserve equipment modifiers but recreate equipment through the
current factory. The decoder understands versioned envelopes.
[starting-builds.ts:50](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/server/src/battle/starting-builds.ts:50),
[starting-builds.ts:95](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/server/src/battle/starting-builds.ts:95),
[starting-build-codec.ts:116](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/server/src/battle/starting-build-codec.ts:116)

Temporal's documentation explains why replay reuses recorded external outcomes
and requires deterministic decisions. Its versioning guidance separately
addresses changed code by retaining compatible execution paths or deployments.
[Temporal: replay](https://docs.temporal.io/workflows),
[Temporal: versioning](https://docs.temporal.io/develop/typescript/workflows/versioning)

**Recommendation.** Before battle consumables ship, make the recorded rules
version select compatible behavior for retained battles. Freeze required effect
inputs and stock; test recorded battles after catalog and handler changes.
An envelope version or saved potion amount alone does not preserve the meaning
of a subsequently changed handler. Use compatible rule paths or a deployment
policy that waits for affected battles to finish. Temporal is evidence for the
constraint, not a recommendation to add Temporal to this game.

## 6. Reservations move cross-store work; they do not remove it

**Evidence.** Cloudflare documents Durable Object storage as private to the
object. Its transactions cover that storage; synchronous transactions cannot
include asynchronous external operations.
[Cloudflare: storage transactions](https://developers.cloudflare.com/durable-objects/api/storage-api/#transaction)
The repository already atomically stores battle journals with delivery
obligations and alarms, then checkpoints external stages for retry.
[battle-delivery.ts:17](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/server/src/battle/battle-delivery.ts:17),
[battle-delivery.ts:48](/Users/christianschneeweiss/Documents/business/loot-game/game/apps/server/src/battle/battle-delivery.ts:48)

**Recommendation.** Reuse that recovery pattern when battle supply is designed.
Postgres stock and the journal need an explicit protocol. Reserving supplies can
keep each battle use local, but reservation, battle initialization, unused-stock
return, and abandonment still need durable identities and retryable settlement.
This supports a conditional preference for reserved supplies, not a claim that
the complete protocol is already solved or necessarily simpler in every game.

## Implementation scope supported by this review

Proceed with the catalog and inventory foundation after incorporating the
contracts above. Keep effects, targeting, action costs, and supply selection for
the first real consumable. Avoid placeholder effect handlers and a general
`useItem` context with unrelated optional fields. Test inventory behavior through
its interface; add battle recovery and historical replay tests with battle use.

## Method and limits

- Exa discovery: seven targeted searches requesting 35 result slots in total.
  This is a discovery count, not 35 independently reviewed primary sources.
- Six distinct primary documentation pages were successfully fetched and read:
  Unity, TypeScript, PostgreSQL, Cloudflare, and two Temporal pages linked above.
  Repeated fetches and URL fragments count as the same page.
- Epic's official Lyra inventory/equipment page returned HTTP 403. Secondary
  Lyra summaries and forum answers were excluded from the supporting evidence.
- Local facts come from the current working tree; linked lines may move after
  edits. No implementation, concurrency experiment, or gameplay test was run.
- Confidence is high in the cited language/replay/storage constraints and
  moderate in the maintainability judgment. First consumable requirements may
  change the preferred use interface or supply policy.
