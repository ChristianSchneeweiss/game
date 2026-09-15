# Documentation

The current local candidate is implemented; staging and production release qualification remain incomplete. Start with the active checklist and use the evidence for demonstrated results and limits.

## Current development and release

| Document | Purpose |
| --- | --- |
| [Setup and commands](production-setup.md) | Pinned runtimes, isolated development, checks and historical exception policy. |
| [Release checklist](release-checklist.md) | Remaining candidate, staging, browser and promotion requirements. |
| [Release evidence](release-evidence.md) | Candidate identity, local results, decisions and retained reports. |
| [Release, migration and recovery runbook](production-release.md) | Target preflight, backups, cutover, deployment and rollback. |
| [Persistence and module boundaries](production-architecture.md) | Run commands, transaction order and saved-data compatibility. |
| [Client sessions and presentation](production-client.md) | Connection/command ownership, private query lifetimes and Cards controls. |
| [Security and operations review](production-security-review.md) | Findings, remediations, permission baseline and dependency dispositions. |
| [Browser qualification](production-browser.md) | Observed flows, device-specific measurements and remaining live proof. |
| [Manual database migrations](../apps/server/migrations/manual/README.md) | Exact historical migration preflights and ordering. |

## Domain and feature references

These feature milestones document implementation and evidence at their recorded dates; the release checklist and evidence determine current qualification status.

| Document | Purpose |
| --- | --- |
| [Domain model](../CONTEXT.md) | Shared game vocabulary and behavior distinctions. |
| [Tactical grid implementation](tactical-grid-implementation.md) | Local implementation checkpoint, movement, tile targeting, catalogue/layout authoring, versioned recovery, verification and remaining deployment qualification. |
| [Tactical grid specification](tactical-grid-spec.md) | Accepted decisions for [Convert all battles to configurable tactical grids with movement and tile targeting](https://github.com/ChristianSchneeweiss/game/issues/3). |
| [Tactical grid spell and weapon defaults](tactical-grid-spell-conversion.md) | Implemented initial assignments; tier/scaling redesign remains deferred. |
| [Might and tier research](tier-budget-research.md) | Power valuation, special-effect budgets, and the agreed Might terminology. |
| [Might calibration](might-calibration.md) | Exponential promotion thresholds, first reference proposal, and reproducible combat probes. |
| [Might specification](might-spec.md) | Approved Might model and Library implementation scope, published as [issue #4](https://github.com/ChristianSchneeweiss/game/issues/4). |
| [Tactical grid feasibility](tactical-grid-feasibility.md) | Historical research and design discussion preceding the completed specification and local implementation. |
| [Friends specification](friends-spec.md) | [Issue #2](https://github.com/ChristianSchneeweiss/game/issues/2): user stories, implementation decisions, and testing boundaries. |
| [Friends implementation](friends-implementation.md) | Player controls, consent and concurrency boundaries, migrations, automated verification, and pending browser walkthrough. |
| [Friends design](friends-design.md) | Agreed interaction rules and codebase foundations behind the friends specification. |
| [Equipment milestone](equipment-milestone.md) | Gear ownership, attributes, appearance and frozen builds. |
| [Dungeon-run milestone](dungeon-run-milestone.md) | Preparation, full-run progression, results and restart. |
| [Branching dungeon milestone](branching-dungeon-milestone.md) | Persisted routes, room decisions, balance and compatibility. |
| [Forest encounter milestone](forest-encounter-milestone.md) | Forest arena, actors and effects. |
| [Biome encounter milestone](biome-encounter-milestone.md) | Encounter presentation and biome verification. |
| [Enemy model documentation](enemy-models/README.md) | Provenance, conversion, licenses, animation gaps and placement/validation evidence. |

## Historical material

[Archive index](archive/README.md) preserves prototype specifications, rendering milestones and earlier battle-audit findings. Historical limits and open items are not the current release checklist. The protected [battle test README](../tests/battle/README.md) retains its original baseline; current accepted exceptions and results are documented above.
