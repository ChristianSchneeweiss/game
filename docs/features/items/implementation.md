# Item inventory foundation — implementation

Implemented [issue #6](https://github.com/ChristianSchneeweiss/game/issues/6)
against [the agreed specification](./spec.md).

## Delivered behavior

- One owner-free catalog resolves equipment, consumables, and materials. Each
  definition provides its name, description, kind, and tier. Consumables also
  describe their supported use contexts.
- Equipment retains its existing runtime behavior, individual copy IDs,
  character assignments, and Might calculations. Equipment-only types, schemas,
  factories, and saved-build validation reject stackable items.
- Account inventory reads combine equipment copies and stack quantities with
  canonical metadata. Character preparation retains its narrow equipment read,
  including for accounts without a character.
- Trusted transactional grants create separate gear copies or add to stacks.
  Stack spending checks the complete batch and removes depleted stacks. Invalid
  types, malformed quantities, insufficient stock, and integer overflow fail.
- Existing enemy loot supports item quantities and all three kinds. Missing
  quantities remain one for legacy rewards. Entry ordering, independent random
  draws, explicit probabilities, and existing tier-based defaults are preserved.
- Locked reward claims grant the full mixed reward and consume its claim record
  in one transaction. Failures roll back; duplicate claims cannot duplicate stock.
- Inventory, reward summaries, and Library display the shared definitions,
  quantities, and tiers. Consumables and materials have no numeric Might or
  Unrated label. Inventory includes kind filters, search, sorting, equipment
  assignment information, mobile details, and loading/error/empty states.

## Transaction and migration details

`apps/server/src/game-usecases/inventory.ts` owns storage rules. Mutations lock
the existing owner row with `FOR NO KEY UPDATE` before reading stock. This also
serializes concurrent first-stack creation without interfering with foreign-key
key-share checks. The lock lasts only for the surrounding transaction; it does
not reserve an account or restrict participation in concurrent runs. Callers
must propagate mutation failures so the enclosing gameplay operation rolls back.

The additive migration is
`apps/server/migrations/manual/20260915_item_stacks.sql`. It creates an
owner/type-unique stack table with an owner foreign key and positive integer
quantity. Existing equipment storage is unchanged. Fresh-install SQL, migration
checksums, the upgrade sequence, and rehearsal coverage include the new table.

The migration was exercised only against disposable databases. It has not been
applied to a shared development or production database.

## Validation

All checks below passed on 2026-09-15:

- **17 relevant battle test files**, covering inventory integration, equipment
  compatibility, Library and inventory controls, rewards, dungeon flows, item
  validation, and content presentation.
- **Real PostgreSQL 18.6 rehearsal:** fresh and upgraded schemas agree; interrupted
  migration rollback and retry, preserved legacy equipment/loot, constraints, and
  backup/restore all pass. Independent connections contend on first-stack grants,
  additive grants, final-item spending, duplicate mixed claims, and unrelated
  mixed claims. Each scenario observed two waiting database connections.
- **Eight browser checks** through `scripts/check-items-browser.mjs`, including
  keyboard navigation, mobile dialog focus, use-context metadata, widths from
  320–1440 pixels, Library navigation/filtering, reward claim refresh, and
  loading/error/empty states. No page errors occurred.
- `bun run typecheck:all`, including the existing complete-coverage baseline of
  four historical diagnostics; current application and battle-test checks pass.
- `bun run check:protected` (34 historical files unchanged),
  `bun run check:migrations`, and `git diff --check`.
- React Doctor reported no issues in the changed code.
- Production Vite build with the pinned Node 22.19.0 runtime. Test material and
  consumable identifiers and names are absent from the generated assets.

The new focused suites are `integration/inventory`, `integration/item-controls`,
and `rules/items`, run through `bun tests/battle/run.ts`. The database proof uses
the existing `scripts/database-rehearsal.ts` disposable-database workflow.
Browser checks use the sanctum preview with `?state=items`; the script supports
`SANCTUM_URL`, `PLAYWRIGHT_MODULE`, `CHROMIUM_PATH`, and `ITEMS_OUTPUT` overrides.

## Deferred by the specification

The subsequent [consumable gameplay and content phase](./consumables.md) now
implements the first items, battle supplies and outside-battle use. The notes
below record the foundation's original delivery boundary.

Production material/consumable definitions remain empty. Isolated test and
development fixtures demonstrate authoring through claim and display without
adding live content or balance changes. Consumable effects, use commands,
loadout controls, carried quantities, action costs, and battle allocation remain
for the subsequent gameplay phase. Materials and consumables expose no active
Use or gear-equipping action in this foundation.
