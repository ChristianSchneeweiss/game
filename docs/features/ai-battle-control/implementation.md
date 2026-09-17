# Commander (AI battle control) implementation

Implemented and checked locally on 2026-09-17 against [the accepted spec](spec.md).

## Configuration and use

- Server environment: `OPENROUTER_API_KEY`; optional `BATTLE_AI_MODEL` defaults to
  `z-ai/glm-5.3-flash`. The key was supplied through Doppler's `game-server/dev`
  configuration for the live measurements below.
- Apply `apps/server/migrations/manual/20260917_ai_control.sql` through the existing
  migration runner before running the updated server against an older database.
  The fresh schema, migration manifest, and production migration sequence include it.
- The character sheet's **Commander** tab sits beside Stats, Spells, and Equipment.
  It shows control, private orders, and supplies together and saves defaults for
  future encounters. Battle controls edit only
  that battle, allow prompt changes during a decision, and offer immediate takeover.
  Private settings are returned only to their owner.
- Battle settings live behind the compact **Commander** button beside **Inspect**
  (also available in Cards). Its party panel uses Manual/Commander switches with collapsible
  orders and supplies. An active Commander character exposes **Take over** directly in the toolbar.
- An enemy opts in with `aiEnabled: true` and optional `aiPrompt` in its existing
  `BaseEnemy` constructor parameters. These values are frozen in each battle build.
  Existing enemies retain their current deterministic behavior.

The selector is one file, `apps/server/src/battle/ai-selector.ts`. It returns a
strictly validated complete plan. The battle driver validates movement and the
follow-up action together on a disposable reconstruction, persists the accepted
plan, then publishes it. Recovery replays those recorded selections. Alarms keep
unresolved AI activations recoverable without a connected owner.

There is a five-second complete-response deadline, cancellation on takeover or
control changes, and no failed-activation repair/retry loop. Player failure is
recorded as manual control with a reason. Enemy failure records the deterministic
fallback selection. Neither response can commit after its activation or control
version changes.

## Live GLM measurements

Endpoint: `POST https://openrouter.ai/api/v1/chat/completions`.
Settings: `stream: false`, `max_tokens: 1024`,
`provider: { require_parameters: true }`, strict `response_format: json_schema`,
`reasoning: { effort: "low", exclude: true }`, five-second abort signal.

The model's API metadata advertised **mandatory reasoning**, with `low`, `high`,
and `max` efforts. Low is used; excluding reasoning text does not disable reasoning
or its billing. Compatible routes advertised structured output support. See
[model](https://openrouter.ai/z-ai/glm-5.3-flash),
[structured output](https://openrouter.ai/docs/guides/features/structured-outputs),
and [reasoning controls](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens).

Synthetic encounters used the real game engine: one character with five spells
and an equipped healing potion, versus one, two, or three goblins. The third
snapshot included movement already spent. Snapshot bytes exclude protocol,
behavior prompt, and JSON schema; reported input tokens include the full request.

| Enemies | Snapshot bytes | Complete response ms | Provider | Input tokens | Output tokens, including reasoning | Reasoning tokens | Reported cost USD | Legal plan |
| ------- | -------------: | -------------------: | -------- | -----------: | ---------------------------------: | ---------------: | ----------------: | ---------- |
| 1       |          4,455 |                2,420 | Together |        1,677 |                                 74 |               42 |       0.000288550 | Yes        |
| 2       |          5,062 |                2,546 | NextBit  |        2,621 |                                 37 |                8 |       0.000484764 | Yes        |
| 3       |          5,540 |                3,059 | NextBit  |        2,769 |                                 55 |               26 |       0.000522204 | Yes        |

All three selected a legal global Volt Lash without movement. Total reported
usage: 7,067 input tokens, 166 output tokens (76 reasoning), USD 0.001295518.
These three samples establish compatibility, not reliable five-second latency
or tactical quality across larger encounters. Different routed providers can
report different token counts and prices. Timed-out requests may still incur
provider charges even when no usage response arrives.

Reproduce deliberately (paid calls, excluded from automated tests):

```sh
cd apps/server
doppler run --project game-server --config dev -- bun ../../scripts/measure-battle-ai.ts
```

## Verification

- All 28 new engine, real API/Durable Object, React session, and PostgreSQL migration
  tests pass. They cover all plan forms, atomic rejection/RNG preservation,
  independent concurrent runs, ownership/privacy, cancellation and late responses,
  full-body timeout, provider failures, storage failure, recovery, single-use
  consumables, offline consecutive actors, Fleetfoot's extra activation, and settlement.
- Existing manual/tactical recovery and client session regression checks pass.
- The full battle run passed 71 of 72 test files before the final two new test
  files were added. The three failures in `live-recordings.test.ts` also occur on
  an untouched `HEAD` archive: `live-six-entity`, `live-milestone-2`, and
  `live-milestone-3` fail the existing revision check. Those fixtures were not changed.
- Application and battle typechecks pass. Complete repository type coverage
  passes with the project's four explicitly allowed protected-test diagnostics.
- The production client build passes with the pinned Node 22.19.0 / Bun 1.4.0
  toolchain. Vite still reports the existing large-chunk warnings.
- Migration/schema consistency passes. The actual migration SQL was exercised
  against disposable PGlite PostgreSQL, preserving existing character values and
  setting manual defaults. No remote database migration was applied.
- The normal character and battle components were exercised in the existing
  development harness: saved defaults/private prompt, enabling, prompt save during
  a wait, consumable permission, keyboard takeover, Cards/3D control surfaces,
  and 390px width. Mounted session tests cover failure/reconnection and account
  switching; controlled provider integration tests cover enemy activation.
- React Doctor reports no errors and two complexity warnings in the existing
  battle presentation components (score 85). No new framework or provider SDK was added.
