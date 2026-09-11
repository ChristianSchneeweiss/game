# Documentation archive

These documents preserve dated research, decisions and verification. Their proposed work and reported defects describe the original snapshot; they are not an active backlog. Use the [release checklist](../release-checklist.md) and [current documentation](../README.md) for today's status.

## Completed battle repairs

The [original audit](battle-audit/README.md) records all 26 findings. The [repair verification](battle-audit/verification-results.md) records their completed regression checks and the accepted historical replay differences. Maintained coverage lives in [tests/battle](../../tests/battle/README.md); the old standalone audit scripts and raw logs were removed.

Plans 001–007 are complete. The production handoff (008) is implemented locally; its remaining qualification work is consolidated in the release checklist. The obsolete plans, transfer manifest and audit scripts remain recoverable from Git commit `396d798`, for example:

```sh
git show 396d798:plans/008-production-handoff.md
git show 396d798:plans/battle-audit/flow-checks.test.ts
```

`plans/battle-audit/README.md` is only a compatibility link for the immutable historical test README. No executable audit harness remains under `plans/`.

## Prototype research and presentation evidence

- [Game overview](prototype/game-overview.md) and [content catalog](prototype/game-content-catalog.md): 9 September source snapshots.
- [3D research](prototype/threejs-research.md), [decisions](prototype/threejs-prototype-decisions.md), [handoff](prototype/threejs-prototype-handoff.md) and [specification](prototype/threejs-battle-prototype-spec.md): original design and implementation scope.
- [Prototype usage and delivery](prototype/threejs-battle-prototype.md), [initial evidence](prototype/threejs-evidence/README.md), [milestone 2](prototype/threejs-milestone-2/README.md) and [milestone 3](prototype/threejs-milestone-3/README.md): dated screenshots and measurements.
- [Enemy model alternatives](prototype/enemy-model-alternatives.md): earlier research, superseded by the [current model mapping and provenance](../enemy-models/README.md).
