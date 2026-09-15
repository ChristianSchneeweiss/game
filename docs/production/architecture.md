# Production candidate: persistence and module boundaries

This records the production migration from complete prototype checkpoint `976ddac`. See [release evidence](evidence.md) for demonstrated results and the [release checklist](checklist.md) for remaining qualification.

## Run commands and read models

`dungeon-attempt.ts` owns starting an attempt. Its transaction locks the run, authorizes the creator or a participating character's owner, validates the saved route and current wave, locks the party's character rows, then creates the attempt and frozen starting snapshot together. Routers translate validated inputs into this use case; they do not reproduce its progression rules.

`dungeon-route.ts` owns saved path decisions, route resource effects, and route rewards. It uses the same run lock as starting an attempt. A retry with the same choice returns the saved result; a conflicting choice fails. All future offers and deterministic treasure/elite rolls retain the prototype policy. Version-one calculations remain fixed; old elite decisions without saved odds preserve their earlier guaranteed bonus.

`dungeon-manager.ts` retains entry, configuration, attempt completion, and run removal. Completion checks that the result contains exactly the saved party before changing anything. The completion marker, survivor XP, owned loot, carried resources, and progression commit together under the attempt identity. Duplicate delivery cannot grant a second result. Removal requires the creator and rejects active battles or incomplete attempts so an outstanding completion obligation cannot be discarded.

`dungeon-access.ts` centralizes party lookup and creator/participant access. `dungeon-queries.ts` reconstructs the saved run and attempts; it preserves party order from persisted `characterData`, independent of join order. `dungeon-run.ts` creates the authorized player read model and battle context under one read-only, repeatable-read transaction, keeping run state, attempt history, and claimable rewards in the same database snapshot.

`dungeonRunPhase` in the shared game derives six phases: prepared, fighting, awaiting-choice, ready, complete, and defeated. The client maps these into its existing labels. No additional persisted status column competes with round, active attempt, resources, route decision, or completion data.

## Build changes and transaction order

Multi-character operations acquire row locks through `character-locks.ts`, using PostgreSQL `ORDER BY id FOR UPDATE`. JavaScript locale sorting is deliberately absent from lock acquisition: mixed-case identifiers can sort differently from the database collation.

Run mutations acquire the run row before character rows; build mutations acquire character rows before their spell/passive/equipment rows. Passive transfers lock both source and destination characters in the database's order. Unequip rereads an item's assignment under lock and rejects an intervening move. Attempt creation therefore freezes one complete loadout before or after a concurrent replacement. Completion locks surviving characters before XP updates so it cannot overwrite a concurrent build/stat change.

Rewards remain owned inventory operations. Claiming a bundle uses its existing transactional claim marker and inserts its items together; a retry cannot duplicate them. Gold rolls are retained as result metadata and are not advertised as a credited wallet balance.

## Saved-data compatibility and recovery

`route-state.ts` accepts null/absent routes as historical linear runs, validates version-one offers and decisions, and rejects unknown versions before a route mutation. Version-one offers are persisted once; reading, reconnecting, and rendering never reroll them.

`starting-build-codec.ts` validates saved actor kinds, IDs, attributes, spells, passives, and gear before reconstruction. It preserves SuperJSON's representation of infinite target counts. New database snapshots add `version: 1` beside the existing `json`/`meta` envelope, which old SuperJSON readers still understand. Unmarked snapshots remain valid legacy data; unknown versions fail without consulting current roster state. The four protected recordings were independently decoded during review.

The Durable Object reads frozen builds and the version-one command journal through the existing reconstruction path. Command validation and execution stay separate from transport shape/rate checks. Journal/state commitment precedes acknowledgement. Reconnect synchronizes the committed revision and does not resend an uncertain command. Completion delivery remains recoverable through its pending marker and alarm/workflow retry; real Cloudflare scheduling and cold-start behavior still require staging proof.

Clerk credentials now come from runtime bindings; setup clears the old persisted value. This is an operational rollback constraint: drain attempts and require clients to reconnect through the old setup when reverting to the previous binary. Do not promise continuity for old warm sockets that relied on stored credentials. Follow the [release runbook](release.md).

## Verification ownership

New integration coverage exercises phase derivation, legacy/future route and build versions, malformed completion rollback, safe removal, ownership, transport input, and consistent character lock order. Real PostgreSQL rehearsal adds independent-session contention, migration preflight/rollback, and full backup restoration. Historical tests and fixtures remain byte-identical; new regressions have separate paths.

No combat formula, authored encounter, route weight, drop probability, asset, or saved-event result was intentionally changed by this migration. Existing cooperative party entry and spectator/replay behavior remain the accepted baseline. Unlimited manual spell grants are development/testing only; starter and earned loot are unchanged. The [permissions report](security-review.md#local-remediation-results) records these boundaries and the remaining runtime verification.
