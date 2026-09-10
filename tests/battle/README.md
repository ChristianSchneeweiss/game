# Battle regression suite

These tests specify shared combat and persistence behavior using the real engine, server commands, mounted client hook, Durable Object methods and dungeon use cases. The named spells are fixtures that expose rule failures. Application fixes should repair the shared behavior and then rerun the catalogs and encounters.

## Run

```sh
bun install --frozen-lockfile
bun run test:battle
bun run typecheck:battle
```

The default command includes all existing battle tests and the new rules, integration tests and sweeps. It runs files in separate Bun processes because module mocks, the simulated browser and WebSocket globals otherwise leak between files. Every selected file runs even after another file fails; any failure produces exit code 1. No known bug is hidden behind `test.failing`, a skip, or an inverted expectation.

For a narrower feedback loop:

```sh
bun run test:battle:rules
bun run test:battle:integration
bun run test:battle:sweep
bun tests/battle/run.ts integration/durable
```

Arguments to `run.ts` are filename substrings. Use `BATTLE_TEST_LOGS=1` to include engine hit logs. Each encounter failure includes its seed and command prefix. Reproduce one fight with:

```sh
BATTLE_SWEEP_SEED=crypt-of-forgotten-echoes-wave1-trial3 bun tests/battle/run.ts sweeps/encounters
```

## Rules and audit coverage

IDs refer to the [original audit](../../plans/battle-audit/README.md). This table maps all 26 findings to maintained tests.

| Shared behavior | Findings | Tests |
| --- | --- | --- |
| Legal casts complete, spend resources once, and publish a result even if an optional proc misses | B01, B02, B05 | [casts](rules/casts.test.ts), [damage reactions](rules/effects.test.ts), [spell/passive matrix](sweeps/passives.test.ts), [mounted client](integration/client.test.tsx) |
| Damage reactions terminate; ordinary healing cannot revive a dead actor | B03, B08 | [damage reactions](rules/effects.test.ts) |
| Effects register for replay, tick for their duration, expire safely, and use modified attributes | B04, B21, B22 | [effect lifecycle](rules/effects.test.ts): DOT/HOT durations 1–3 with both initiative orders, stacked modifiers, regeneration passives |
| Queue changes preserve the next actor, dead actors cannot take turns, and opening upkeep runs | B06, B07, B23 | [turn progression](rules/turns.test.ts), [authored encounters](sweeps/encounters.test.ts) |
| Descriptions are usable outside combat and reads preserve live state/RNG | B14 | [inventory descriptions](rules/casts.test.ts), [spell catalog](sweeps/spells.test.ts), [existing recovery tests](recovery.test.ts) |
| Random targets are living, on the legal team, and sampled without position bias; delayed casts retain surviving targets | B18, B19, B20, B26 | [targeting rules](rules/casts.test.ts): direct and unique sampling, corpse retaliation, delayed target changes; [enemy actions](sweeps/enemy-actions.test.ts) |
| Conditional defense bonuses and penetration affect the resulting combat state | B24, B25 | [authored rule examples](rules/casts.test.ts) |
| Client reconstruction preserves resource payment and damage/healing chronology, including reconnect | B16, B17 | [turn/event rules](rules/turns.test.ts), [mounted client](integration/client.test.tsx), [authored encounters](sweeps/encounters.test.ts) |
| Failed casts or journal commits leave live and recovered resources, effects, turns and RNG consistent | B09 | [Durable Object recovery](integration/durable.test.ts) |
| Completion resumes after database or workflow failure and remains idempotent | B10 | [Durable Object completion](integration/durable.test.ts) |
| Progress follows the completed wave, completion is keyed by battle identity, overlapping starts create one battle, and saved resources carry forward | B11, B12, B13, B15 | [dungeon integration](integration/dungeon.test.ts) |

The critical multiplier test also checks the audit's dormant defect with an explicitly configured positive critical chance. Final Verdict's intended execute threshold and who may start someone else's dungeon remain product decisions; the tests do not invent either rule. Final Verdict still participates in the spell and passive catalogs.

## Harness and scope

- Spell and passive lists come from the live registries. Every spell runs through 16 seeds and four formations (full health, wounded, single opponent, dead participants), plus every individually equipped passive. Enemy action selection covers each registered kit, unavailable earlier spells and depleted mana.
- Every authored dungeon wave runs 12 seeded fights with varied player kits and initiative. Player choices use a separate PRNG. After each accepted command, assertions compare server state with client reconstruction and a second battle restored from frozen starting builds. A fight must finish within 150 player actions. Tests stop a failing fight at its first broken invariant and continue with the other fights.
- Replay comparison canonicalizes opaque effect IDs while preserving their links to events, targets, sources and durations. Extra-action effects may deliberately duplicate an actor in the queue.
- Database tests use [PGlite](https://pglite.dev/docs/), an in-memory PostgreSQL runtime. Drizzle Kit generates DDL directly from the application's schema. Real SQL handles joins, filters, foreign keys, uniqueness and rollback; SQL triggers inject write failures. Each test gets a fresh database and closes it afterward. No database URL or external service is required.
- Durable Object tests replace only Cloudflare runtime services, Clerk's SDK and database-driver construction. Combat resolution, journal handling, finalization, Drizzle queries and result serialization remain real. Storage values are cloned, multi-key writes are atomic, and rehydration runs the actual constructor. Client integration mounts `useBattle` with a local WebSocket transport and rebuilds it for reconnect.
- PGlite serializes queries on one connection. The overlapping-start test reproduces two requests observing an inactive dungeon before either claims it; it does not establish production PostgreSQL lock/isolation correctness. Cloudflare scheduling and real authenticated/network sessions are also outside this local suite.

## Verified baseline — 10 September 2026

On the audited application source at `6f5c94f`, with these tests added:

| Check | Result |
| --- | --- |
| Existing battle tests | 82 pass, 0 fail |
| Entire maintained suite | 333 pass, 184 fail across 19 files |
| Authored encounters | 177 pass, 123 fail across 300 seeded fights and 25 waves |
| Client/server typecheck | Pass |
| Regression harness typecheck | Pass |

The red tests expose unresolved shared behavior; they are the starting point for repairs. Multiple tests can expose the same root cause, so 184 failures does not mean 184 separate bugs. The generic lifecycle tests also show that initiative-dependent lost ticks affect healing over time as well as damage over time.
