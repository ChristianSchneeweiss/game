# Production candidate setup and local release checks

Run commands from the repository root. The complete prototype was preserved in `976ddac` on `codex/production-v1`. The [release evidence](evidence.md) identifies the tested candidate; the [release checklist](checklist.md) tracks remaining qualification.

## Toolchain and installation

Use **Node 22.19.0 and Bun 1.4.0**. `.nvmrc`, `.node-version`, `.bun-version`, and `package.json` record these versions. A shell started inside a subdirectory can select a different Node through local shell configuration; run the root toolchain check before builds and release checks.

```sh
nvm install 22.19.0
nvm use
bun --version
bun run check:toolchain
bun install --frozen-lockfile
git diff --exit-code -- bun.lock
```

Install Bun 1.4.0 using the [official installation instructions](https://bun.sh/docs/installation) if it is unavailable. A frozen install must succeed without regenerating `bun.lock`. CI uses the same version files and a complete Git checkout, including the historical commit needed by the protected-file check.

## Checks and artifacts

| Command | Contract |
| --- | --- |
| `bun run release:check` | Toolchain, protected files, complete types, verifier self-tests, disposable PostgreSQL proof, the complete isolated battle suite, static client build, and diff hygiene. Requires the local database described in `production-release.md`. |
| `bun run typecheck` | Application client/server types. |
| `bun run typecheck:battle` | Original protected test-typecheck configuration. |
| `bun run typecheck:all` | Both existing checks plus `tsconfig.battle-all.json` through the complete diagnostic verifier. |
| `bun run test:release:verifier` | Mutation tests for unexpected failures, missing results, altered signatures, and complete-type diagnostics. |
| `bun run test:battle` | Original runner; final local candidate check exits **1** with 606 passing tests and the three historical failures across 36 files. |
| `bun run test:release` | Runs that unmodified isolated runner, retains raw stdout/stderr and exit code, verifies each file/result/summary, and reports the three exact exceptions. |
| `bun run check:protected` | Compares all 34 historical files byte-for-byte with `3835a6098bd0081e5ac942ae78557a1edf4ae51c`, including fixtures, runner, and original config. |
| `bun run check:migrations` | Verifies generated current/audited SQL and checksums of the unchanged manual migrations. |
| `bun run test:database` | Proves fresh/upgrade/rollback/backup restoration and eight use-case concurrency scenarios on a dedicated local PostgreSQL instance. |
| `bun run build:client` | Production-mode Vite build to ignored `apps/client/dist`, without Doppler or deployment. |
| `bun run build:client:verify` | Neutral build with synthetic private sentinels, followed by the release artifact scanner. |
| `bun run release:artifact` | Rejects development fixtures, private sentinel values, and blocked production content in the built artifact. |

The full regression log is retained in a newly created temporary directory, printed by `test:release`. Set `RELEASE_ARTIFACT_DIR` to select a stable evidence directory; it contains `battle.log` and `battle-exit-code.txt`. CI uploads the directory even when the regression gate fails. The original process's nonzero exit remains recorded; only the explicit verifier determines whether it is the accepted baseline.

`scripts/release-battle-baseline.json` records the 26 transferred test files and their minimum test counts. Every discovered additional battle test must also produce a complete result. Removal, skipping, malformed or truncated output, unexpected error summaries, and additional failures fail the gate. Add new regression files freely; changes to the historical policy require explicit review.

The only accepted failing runtime assertions are in `tests/battle/live-recordings.test.ts`, named `<recording>: authenticated browser recording agrees with persisted results and frozen-build restoration`, for `live-six-entity`, `live-milestone-2`, and `live-milestone-3`. Each must fail with exactly `The battle changed. Choose your spell again.`, through `currentSpell` → `castBattleSpell` → the protected call at `live-recordings.test.ts:72:7`. A differently failing assertion with the same name is rejected. Source excerpts, exception counts, stack signatures, file totals, and runner exit are checked together.

Complete type coverage also reveals four pre-existing diagnostics in protected tests that the original config excluded. The operator explicitly accepted those four diagnostics on 11 September 2026 while requiring the historical files to remain unchanged. `scripts/typecheck-complete.ts` keeps their exact locations, TypeScript codes, source spans, and full messages visible, and rejects extra, missing, duplicate, or changed diagnostics. This policy does not make raw `tsc --noEmit -p tsconfig.battle-all.json` clean. Application and original test typechecks must remain clean.

The successful fault-injection tests print closed structured retry diagnostics. Only the reviewed event names and safe field types are accepted; arbitrary text, raw exception blocks, and unknown fields fail the verifier. The known Three.js CommonJS deprecation is visible. The existing Vite large-chunk warning remains a measured bundle concern, not proof of a runtime failure or an automatically accepted new warning.

## Static builds, development, and target inventory

`build:client` does not load the production secret wrapper. Vite still reads its normal local `.env` files and inherited `VITE_*` variables; review those public values before creating an artifact. CI supplies only a synthetic `VITE_CLERK_PUBLISHABLE_KEY` for compilation. It is not an authentication-enabled preview. For a runnable isolated preview, supply the matching development Clerk publishable key and verified local API/WS services.

`bun run deploy` is the Cloudflare Workers Builds entry point. It builds the client into `apps/server/dist` from the build environment, then deploys with Wrangler using Cloudflare's build credentials. It does not require Doppler or upload a local secrets file. Wrangler's `--keep-vars` retains dashboard-managed runtime variables; existing Worker secrets remain in Cloudflare.

Set `VITE_CLERK_PUBLISHABLE_KEY` to the intended production Clerk publishable key in the `game` Worker's **build variables** before deploying. The build rejects a missing or blank key before compiling assets or deploying. Build variables and runtime variables are separate: `DATABASE_URL`, `CLERK_SECRET_KEY`, and `CLERK_PUBLISHABLE_KEY` must remain configured on the Worker for runtime use. See [Cloudflare's build configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/).

For a local deployment that loads Doppler `prd` and uploads its secrets, use `bun run deploy:doppler`. `build:client:production` also retains its existing Doppler `prd` build to `apps/server/dist`. Neither deployment command is part of local release checks or GitHub's validation workflow. Running a build is not release authorization.

Current variable and binding names, without secret values:

| Area | Names | Isolation status at handoff |
| --- | --- | --- |
| Browser | `VITE_CLERK_PUBLISHABLE_KEY` | Must point to the intended Clerk instance; compiled into public assets. |
| Server authentication/database | `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `DATABASE_URL` | Existing Doppler-driven commands; target-specific values must be verified before starting services or writing data. |
| Durable Objects | `BATTLE_WEBSOCKET`, `BATTLE_CHAT` | Declared in the root Wrangler configuration. Separate staging/production bindings are not established by a local check. |
| Workflow | `BATTLE_DONE_WORKFLOW` | Declared in Wrangler; real scheduling/retry verification remains a staging gate. |
| KV | `GAME` | Root Wrangler configuration enables `experimental_remote`; verify or replace it for an isolated local target before starting Wrangler. |
| Worker/assets | `CF_VERSION_METADATA`, `assets.directory` | Root config has a shared custom domain and serves `apps/server/dist`; the neutral client output is separate. |
| Telemetry | Client/server Sentry initialization | Handoff code used embedded DSNs; telemetry environment isolation/redaction is a separate production review requirement. |

`bun dev`, `bun run dev:client`, and `bun run dev:server` use the existing Doppler configuration and root Wrangler bindings, on ports 3001 and 3000. For isolated development, use `bun run dev:isolated`, or start each service with `bun run dev:client:local` and `bun run dev:server:local`. These opt-in commands use the guarded local starter and separate `wrangler.local.jsonc`. Fill a regular ignored `apps/server/.dev.vars` file from the blank example with a dedicated synthetic local database and Clerk test keys. The starter rejects shared database URLs and the existing `game` database; the Worker always receives `--local`. The client proxies `/trpc` and `/api` (including WebSockets) to that server. See [the release runbook](release.md) for the complete isolation and migration procedure.

## Release boundary

These commands prove local types, current regression behavior under a precise historical policy, protected-file identity, asset compilation, and migration/backup restoration plus eight contended use-case scenarios on the dedicated local PostgreSQL version recorded in the proof. They do not establish Cloudflare cold-start/workflow/alarm recovery, authenticated multi-account browser flows, the actual deployment database version, or a deployed release. Follow the [release checklist](checklist.md) and [release runbook](release.md) for those remaining gates, and record actual evidence against the final candidate commit.

The checked-in workflow uses [checkout](https://github.com/actions/checkout) with full history, [setup-node](https://github.com/actions/setup-node) and [setup-bun](https://github.com/oven-sh/setup-bun) with version files, and [upload-artifact](https://github.com/actions/upload-artifact) to retain the raw evidence. Its first remote run must be inspected after the operator authorizes publishing the branch; merely adding the workflow does not demonstrate CI success.
