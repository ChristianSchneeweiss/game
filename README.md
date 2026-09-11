# Shards of Affinity

A desktop, turn-based dungeon RPG. Prepare one or two heroes, combine collected spells and equipment, choose weighted routes, and carry surviving health and mana through each expedition. Battles use a 3D miniature presentation with accessible Cards and saved-event replay.

The production migration is implemented locally on `codex/production-v1`. **It has not been deployed or qualified for release.** See the [remaining release checklist](docs/release-checklist.md) and [candidate evidence](docs/release-evidence.md).

## Start developing

Use **Node 22.19.0 and Bun 1.4.0**, then follow the [setup guide](docs/production-setup.md) for isolated authentication and services.

```sh
nvm use
bun run check:toolchain
bun install --frozen-lockfile
bun run typecheck:all
bun run test:release
bun run build:client
```

`build:client` produces a static production-mode artifact in `apps/client/dist` without retrieving production secrets. A runnable preview also needs a matching development Clerk publishable key and API. The [release runbook](docs/production-release.md) covers local runtime configuration, disposable PostgreSQL proof, staging, migrations, backup restoration, and rollback. `release:check` includes the real PostgreSQL rehearsal and requires its dedicated local target.

The original battle runner intentionally retains three historical resimulation failures. The release verifier accepts only their exact signatures; all other failures fail the gate. Complete TypeScript coverage similarly prints and checks four explicitly accepted diagnostics in protected historical tests. Application types remain clean. All 34 historical test/fixture files are immutable.

## Architecture and current behavior

| Area | Responsibility |
| --- | --- |
| `apps/game` | Deterministic combat rules, spells, effects, items, dungeon definitions, and saved route/run contracts. |
| `apps/server` | Authenticated commands, PostgreSQL transactions and inventory, frozen battle builds, Durable Object sessions, completion workflows. |
| `apps/client` | Preparation, route maps, live command selection, display-only animation/replay, inventory, and recovery UI. |

- [Domain vocabulary](CONTEXT.md) distinguishes combat rounds from dungeon waves and selection from inspection.
- [Persistence and module boundaries](docs/production-architecture.md) explains run commands, lock order, frozen builds, and version compatibility.
- [Client session and presentation boundaries](docs/production-client.md) explains connection recovery, uncertain commands, Cards controls, and resource ownership.
- [Permission and abuse review](docs/production-security-review.md) records fixes, rights, limits, and unresolved release decisions.
- [Current equipment](docs/equipment-milestone.md), [dungeon runs](docs/dungeon-run-milestone.md), and [weighted routes](docs/branching-dungeon-milestone.md) document the implemented player loop.
- [Enemy models and licenses](docs/enemy-models/README.md) records the 22-enemy/16-model mapping, provenance, animation fallbacks, and validation caveats.

The stack is React 19/Vite, TanStack Router/Query, tRPC, Three.js, Hono/Cloudflare Workers, Drizzle/PostgreSQL, and Clerk. Wallet/token features, a credited gold economy, mobile qualification, audio, and new content systems remain outside this release scope.

## Documentation

The [documentation index](docs/README.md) collects current guides. Completed plans have been retired; dated audit findings, prototype research and presentation evidence are in the [archive](docs/archive/README.md). The release checklist is the active source for remaining work.
