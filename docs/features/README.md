# Features

[All documentation](../README.md)

Implementation records describe the player experience and verification at their
recorded dates. Use the [release checklist](../production/checklist.md) for
remaining release qualification.

## Library and balance

- [Game library](library.md): catalogue navigation, content details, Might,
  filtering and local balance previews.
- [Might and balance](../might/README.md): the valuation model, current
  assessments and supporting research.

## Friends and shared runs

Read the [implementation](friends/implementation.md) for player controls,
consent, concurrency, migrations and verification. The
[specification](friends/spec.md) preserves the accepted requirements, and the
[design notes](friends/design.md) explain the interaction rules.
The [shared-run decision](../adr/0001-shared-run-consent-and-leadership.md)
records the rationale for explicit consent and host leadership.

## Tactical grids

Read the [implementation](tactical-grid/implementation.md) for movement, tile
targeting, layout authoring, saved-battle recovery and verification. The
[specification](tactical-grid/spec.md) defines the accepted rules; the
[spell and weapon defaults](tactical-grid/spell-conversion.md) record the initial
assignments.

## Player-loop and presentation milestones

| Document | Scope |
| --- | --- |
| [Equipment](equipment-milestone.md) | Gear ownership, attributes, appearance and frozen builds. |
| [Equipment and passive expansion](content-expansion.md) | Eight items, six passives, dungeon sources and build combinations. |
| [Equipment tiers](equipment-tiers.md) | E–S coverage in all nine slots, 49 more items, shared loadout controls and future tier distribution. |
| [Dungeon runs](dungeon-run-milestone.md) | Preparation, full-run progression, results and restart. |
| [Branching dungeon routes](branching-dungeon-milestone.md) | Persisted routes, room decisions, balance and compatibility. |
| [Forest encounters](forest-encounter-milestone.md) | Forest arena, actors and effects. |
| [Biome encounters](biome-encounter-milestone.md) | Encounter presentation and biome verification. |
| [Enemy models](../enemy-models/README.md) | Mapping, provenance, licenses, animation gaps and validation. |
