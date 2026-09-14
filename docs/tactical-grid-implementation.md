# Tactical combat implementation

[Issue #3](https://github.com/ChristianSchneeweiss/game/issues/3) is implemented locally for newly created battles across all 25 authored encounters and all 39 registered spells. Existing battles without grid metadata continue through the legacy command and spell paths. This work has not been deployed.

## Playing

Each actionable activation grants Movement, defaulting to 3. Select a destination to preview its shortest orthogonal path, then confirm **Move**. Several moves share the same allowance. Casting ends the activation; **End Turn** passes before or after moving. Stun and charge prevent voluntary actions. Equipment, passive modifiers and effects can change Movement independently of Agility.

Select a spell, choose a tile or direction if needed, then confirm **Cast**. An area may be centered on an empty tile if its footprint contains an eligible recipient. Range measures Manhattan distance to the center; the full pattern clips only at board edges. Living entities and marked obstacles block movement. Attacks pass through obstacles and intervening actors.

The 3D presentation supports tile picking, actor selection and recorded movement paths. **Tile controls and threat preview** expands the accessible grid; Cards shows the grid directly. Arrow keys navigate its cells, and Enter or touch selects. Directional actor selection chooses a legal orientation containing that actor. Selecting or inspecting never commits an action.

Live battles keep the battlefield and action controls within the viewport, with a side dock on desktop and a compact dock below the board on phones. Compact overhead health labels leave tiles available for movement. Entity details open in an inspector dialog. Selecting a spell shows its reach, valid aims and reachable positions from which an out-of-range spell could be cast. Selecting a blue position prepares a move for confirmation. The legend reserves its space so selecting, switching or cancelling a spell never resizes the battlefield.

Threat displays distinguish possible movement/attack reach from captured recipients of a charged attack. Random attacks show possible recipients. Arcane Channeling follows surviving, still-eligible original recipients even if they move. Playback, seeking and skipping consume recorded outcomes rather than executing combat.

## Authoring and boundaries

| Module | Responsibility |
| --- | --- |
| [`tactical/types.ts`](../apps/game/src/tactical/types.ts) | Discriminated aiming/selection contracts, weapon profiles, layout and runtime validation. |
| [`tactical/catalogue.ts`](../apps/game/src/tactical/catalogue.ts) | All 39 spell assignments, six footprint presets and four initial weapon profiles. |
| [`tactical/encounters.ts`](../apps/game/src/tactical/encounters.ts) | Fixed party/enemy slots for all encounters; default 7 × 7, with an 11 × 9 Storm finale. |
| [`tactical/queries.ts`](../apps/game/src/tactical/queries.ts) | Deterministic paths, legal aims, footprint expansion and recipient eligibility shared by commands, previews and AI. |
| [`tactical/ai.ts`](../apps/game/src/tactical/ai.ts) | Useful cast/move selection and obstacle-aware approach to a future attack position; safe passing. |
| [`bm.ts`](../apps/game/src/bm.ts) | Activation identity, movement expenditure, cast/pass boundaries, lifecycle and spatial events. |
| [`battle/commands.ts`](../apps/server/src/battle/commands.ts) | Owner, activation and revision validation; player commands and automatic enemy turns. |
| [`battle-ws.ts`](../apps/server/src/durable-objects/battle-ws.ts) | Isolated candidate reconstruction, journal persistence before publication, accepted-command idempotency. |

Edit the catalogue or an encounter's `battlefields` entry to change future battles. Footprints use integer `[x, y]` offsets, with positive y downward. Directional shapes are authored facing north. Width and height are independent; omitted dimensions use the shared default. Invalid or overlapping starting slots reject, including unused cooperative slots in solo play.

Basic Attack uses the captured weapon profile: Iron Sword has adjacent physical reach, Oakwarden Staff has range 1–3 magical reach, and unarmed/enemy fallbacks are explicit. Scaling is an additive list of current modified attributes. Other spells retain their existing formulas. The AI's damage estimate reuses those formulas and current defenses without invoking effect hooks or drawing combat randomness; it remains a heuristic rather than a promised outcome.

New snapshots use the version-2 build envelope with explicit dimensions, blocked cells, positions, layout version, spell targeting and weapon profiles. Recovery rejects incomplete or unknown versions. A retry reuses its captured layout; external equipment/catalogue edits cannot change an active battle's captured configuration. Version 1 and pre-version snapshots continue through legacy rules. Future executable-rule changes must introduce a supported version path rather than silently changing the meaning of an existing version.

Movement, spatial casts and passes carry a request ID, expected revision, activation ID and actor ID. A repeated accepted identity acknowledges the original command; a changed payload or owner rejects. Failed persistence discards the candidate and its random draws. Reconnection restores the committed board and exact remaining allowance. No SQL migration is required: the existing JSON snapshot stores the additive envelope.

## Verification — 14 September 2026

- All 39 spells are covered by the tactical engine tests, including random selection, delayed discharge, extra actions, secondary effects, modified weapon scaling and legacy behavior.
- The encounter sweep completes 75 fights: every wave with solo melee, solo ranged and two-owner mixed loadouts. Each accepted command is compared with an independent restored engine and the presentation reducer. Opening waves additionally reconstruct the entire serialized command prefix after every command.
- Durable Object tests cover wrong owners, stale activations/revisions, duplicate identities, malformed selection, failed movement/cast persistence, frozen catalogue changes, repeated recovery and delayed/random spells. Existing dungeon progression tests now consume actual frozen grids.
- Browser verification used the real shared rules and production presentation components in a disposable local harness: 11 × 9 canvas picking; three separately confirmed moves sharing one allowance; keyboard navigation; empty-center Rootgrasp; owner handoff and passing; exact reconnect movement; 7 × 7 touch controls; directional actor selection; normal/reduced-motion replay, keyboard seeking and skipping. No uncaught browser errors were observed.
- Live layout checks covered desktop, tablet and phone viewports, including spell details, movement preview/confirmation, an actionable target, inspector focus restoration and a long command error. Controls remained visible without page scrolling. Selecting, switching and cancelling spells preserved the canvas position and dimensions at desktop, narrow and phone sizes.
- Application and complete test type checks pass under the project's policy of four explicit historical diagnostics. The static client build and private-artifact scan pass. All 34 protected historical files remain byte-identical.
- The full release regression verifier passes with 830 passing tests and only its three explicitly accepted historical resimulation failures across 51 files. The 26 verifier self-tests and migration checks pass.
- A fresh disposable PostgreSQL 16.14 rehearsal passed migrations, transaction rollback, backup restoration and all 28 run/social/abandonment concurrency scenarios. Its databases and container were removed afterward.
- React Doctor reports zero errors and six complexity/size warnings, with a score of 77/100. The remaining warnings concern existing component complexity and the size of the battle view component.

Run the targeted suites with `bun tests/battle/run.ts tactical` and `bun tests/battle/run.ts rules/spell-guidance`, or the complete policy-aware gate with `bun run test:release`. Use the pinned Node 22.19.0 and Bun 1.4.0. The browser harness substitutes local owners and command transport; it does not qualify real Clerk multi-account sessions or deployed Cloudflare networking. Those remain deployment verification, alongside the existing release checklist. Spell tiers and balance remain the accepted provisional baseline.
