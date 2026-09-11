# Plan 008: Turn the playable prototype into a maintainable first release

**Status:** Local candidate implemented; release qualification incomplete — see [current evidence](008-production-evidence.md). **Priority:** P1 · **Effort:** L, several focused changes · **Risk:** high around persisted combat and rewards.

**Planned on 11 September 2026 against `017644e13311973702a86969dacd70f5fb41b6b2` on `prototype`, plus the 22 uncommitted files in [the prototype manifest](008-prototype-manifest.json).** Those files contain the newest dungeon routes and loot balance. Checking out the commit alone loses that work.

This is the implementation handoff for **Shards of Affinity**, a small-party, turn-based dungeon RPG built around collecting spells and combining character builds. The user wants to move beyond prototyping through refactoring, cleanup, review, and release preparation. Preserve the working game and its visual direction while making its behavior, persistence, operations, and ownership boundaries reliable enough for a first release.

This document records the implementation scope; current results and incomplete release gates are in the evidence document above. The original handoff preparation did not refactor or deploy the game. “First release” here means a production-capable version of the current desktop game loop. Broader content, mobile qualification, monetization, and a new economy are separate product work.

## Start here

1. Read this plan and the repository's applicable instructions. Use CodeGraph for structural questions; use direct reads for files in its staleness notices. The shared vocabulary is in `CONTEXT.md`: a **combat round** traverses the turn queue; a **dungeon wave** is an authored encounter. A legal target, selected target, and inspected actor are different concepts.
2. Preserve the complete working tree before starting an isolated checkout. Run the manifest verification below. Include both the committed prototype and every listed uncommitted file, including SQL, tests, and documentation. The manifest contains hashes, not file contents; transfer requires the actual files.
3. Capture a reproducible baseline, then execute phases A–G. Treat the gates as dependencies. Keep changes small enough to review and run relevant checks after each behavior change or module extraction.
4. Maintain a short progress/evidence document under `plans/008-production-evidence.md`: phase status, tested commit, commands/results, decisions, review findings, and remaining release blockers. Update the index when the implementation is complete.

The previous repair plans **001–007 are complete**. They corrected 26 audited combat/persistence findings and the critical-damage defect. Their descriptions and old failing baselines are historical evidence, not a new backlog. Read `plans/verification-results.md` when changing those contracts.

### Transfer and drift check

From the repository root:

```sh
git status --short
git log -8 --oneline
git diff --stat 017644e..HEAD -- apps scripts tests docs plans package.json bun.lock
python3 - <<'PY'
import hashlib, json
from pathlib import Path
manifest = json.loads(Path('plans/008-prototype-manifest.json').read_text())
bad = []
for entry in manifest['files']:
    path = Path(entry['path'])
    if not path.exists() or hashlib.sha256(path.read_bytes()).hexdigest() != entry['sha256']:
        bad.append(str(path))
assert not bad, f'Missing or changed prototype files: {bad}'
print(f"Verified {len(manifest['files'])} prototype files")
PY
```

Expected at transfer: `Verified 22 prototype files`. Later intentional edits will invalidate these hashes; retain the manifest as the historical transfer record. If code has advanced, reconcile the changed behavior and evidence before refactoring it. A missing route implementation must be recovered before work continues on that area.

Use a `codex/production-v1` branch, or the operator's requested branch. Ensure a baseline checkpoint contains the whole prototype before creating a separate worktree from it. Preserve unrelated work. Use focused commits, for example `♻️ Separate dungeon commands from run queries` or `🔒 Enforce battle access at the transport boundary`. Follow the operator's existing authorization for committing, pushing, PRs, and deployment; this handoff itself is not release authorization.

## Behavior and design to preserve

### Player loop

- All six dungeon entries lead to shared preparation: Avalanche Lair has 2 waves, Crypt 4, Ashen 4, Nature 5, Storm 5, and Tides 5. A party contains one or two characters; owners may differ. Preserve each dungeon's own configuration and party limit.
- Preparation shows party resources, passives, four equipped spell slots, owned spells, and equipment. Basic Attack is separate and consumes no slot. Empty spell slots are visible but deliberately do not prevent entering with an incomplete build. An empty party is rejected. Party selection survives refresh through the URL.
- Spell and equipment changes are real persisted operations. Entry waits for pending changes. Gear preview is reversible until equipped and shows base-plus-equipment attributes without invoking combat hooks or mutating roster state.
- A run carries surviving HP/MP between waves, exposes the active battle after reload, and records progression once. Victory provides survivor XP and owned rewards; defeat keeps the failed wave and fallen party and offers preparation for a fresh run. A new run starts with refreshed resources.
- The user explicitly selects a spell and legal targets, then presses **Cast**. Acting is allowed only for the owned character on its turn. An account owning both characters can control both. Battle starts are allowed for the dungeon creator or the owner of a participating character; preserve this confirmed cooperative rule.
- 3D is the live battle presentation, with the Cards fallback and recorded replay available. Replays use their saved starting builds, including old spells and equipment, even after current loadouts change.
- Result pages wait for durable completion before showing XP and loot. Claiming rewards creates real owned inventory entries, and retries do not duplicate them. Gold is not currently credited to a wallet; the UI deliberately does not promise a credited gold balance.

### Weighted route choices and current balance

Forks appear after victories except the last wave. The number and identity of offers are rolled once when the run starts, saved, and remain stable through reloads and reconnects. Each fork has **2 paths with weight 60, 3 with weight 30, or 4 with weight 10**. All future offers are currently visible on the map; preserve that information policy during cleanup.

| Room | Rarity | Relative selection weight | Current effect |
| --- | --- | ---: | --- |
| Patrol | Common | 60 | Continue into the usual next encounter. |
| Resting shrine | Uncommon | 30 | Choose 30% maximum HP or 40% maximum MP recovery, capped at each survivor's maximum. |
| Treasure cache | Uncommon | 12 | Take one E-grade gear item, or gamble for one D-grade item at 50%; failure removes 15% maximum HP from survivors, leaving at least 1 HP. |
| Elite encounter | Rare | 8 | Next enemies gain 40% HP and 25% strength, intelligence, and vitality. Winning gives a fixed 50% chance of one extra D-grade item per participant owner. |
| Ancient vault | Epic | 0.5 | One D-grade item per participant owner; appears at most once on the entire generated map. |

Room weights are relative, not percentages. Offers within a fork are sampled without replacement. `oncePerRun` limits appearance even if that room is never chosen. The catalog supports `legendary` rarity and weight zero for disabled entries; there is no implemented legendary encounter or legendary equipment yet. New mechanics need server effects and presentation, not just a catalog entry.

Treasure and elite bonus rolls are deterministic per run/fork and cannot be rerolled by retries. Elite reward odds are saved when chosen; old decisions without the optional odds field retain their earlier guaranteed bonus. Elite enhancement happens once on fresh enemy instances before the battle snapshot is frozen. Shrine/trap changes affect run resources; ordinary recovery never revives fallen heroes. Choosing and starting the next battle use the same run lock.

The user explicitly requested varied path counts and reduced loot. Preserve the reduced route rewards through refactoring. Ordinary enemy drops were not reduced. A seeded comparison estimated about 46% less extra route equipment under a reward-maximizing, all-victories strategy; that is a balance model, not measured player behavior. Avoid expanding loot or silently changing difficulty while cleaning code.

### Equipment and art

| Item | Slot | Current benefit | Current acquisition |
| --- | --- | --- | --- |
| Iron Sword | Weapon | +6 strength | Moss-Covered Golem, 20%; route rewards can also supply gear. |
| Iron Cuirass | Armor | +12 armor | Elder Treant, guaranteed. |
| Oakwarden Staff | Weapon | +8 intelligence | Hollowed Oakwarden, guaranteed. |
| Int Armor | Armor | +10 intelligence | Existing goblin drop. |

The forest final boss also guarantees Nature's Embrace. Equipment operations validate item and character ownership, serialize slot replacement, and require removing a worn item before moving it to another character. Repeated previews must preserve cached geometry/textures and dispose only instance-owned fittings/materials.

Keep the approved desktop direction: stylized dark-fantasy miniatures, stable elevated camera, party on the left, enemies on the right, readable DOM controls, restrained effects, clear HP/MP and turn/target states. Preserve the forest, crypt, ashen, storm, and tides arenas plus the original court fallback. Arena selection comes from enemy identity, not an invented map position. Keep speed controls, reduced motion, visual skipping, and keyboard targeting. Audio and bespoke models for every enemy remain deferred.

The asset pipeline covers 22 enemy types with 16 GLBs, including reused licensed bases and two original procedural models. Preserve provenance, license copies, source hashes, clip mappings, placement measurements, and documented stand-ins. Model files total about 7.05 MB. The previous validator report has 0 errors and 41 warnings; review those specific warnings rather than describing the imports as universally clean. Some missing hit/cast/death motions intentionally use documented procedural or stock fallbacks.

## Current architecture and intended boundaries

| Area | Current entry points | Refactoring goal |
| --- | --- | --- |
| Shared combat | `apps/game/src/bm.ts`, `base-entity.ts`, `effect/`, `spells/`, `passive-skills/` | Pure game semantics and deterministic state transitions; definitions declare behavior, shared modules own resolution rules. |
| Commands and recovery | `apps/server/src/battle/{commands,protocol,reconstruct-battle,starting-builds,result,battle-delivery}.ts` | Small, typed command/result contracts and one recovery path used by live execution and cold reconstruction. |
| Durable transport | `apps/server/src/durable-objects/battle-ws.ts`, `battle-chat.do.ts`, `workflows/battle-done.workflow.ts`, `game-usecases/bm-storage.ts` | Transport/session lifecycle separated from command execution, storage commitment, and completion delivery. |
| Run orchestration | `apps/server/src/game-usecases/{dungeon-manager,dungeon-run,dungeon-route}.ts`, `routers/dungeon-router.ts`, `db/schema.ts` | Explicit run commands, read models, transactions, and transition checks with one owner for each mutation. |
| Builds and inventory | `apps/server/src/game-usecases/{character,entity-factory,loot-manager}.ts`, `routers/character-router.ts` | Ownership, slot rules, claim idempotency, and snapshot construction behind clear use-case interfaces. |
| Client battle session | `apps/client/src/routes/battle/-hooks/use-battle.ts`, `-battle-render.tsx`, `$id.tsx` | Separate connection/revision handling, spell/target selection, and pending command state from rendering. |
| Playback | `apps/client/src/routes/battle/-presentation/{timeline,use-playback,action-history,recorded-battle}.ts*` | A pure event-to-display adapter and a separate animation clock, with no game-rule execution. |
| 3D view | `apps/client/src/routes/battle/-presentation/{battle-scene,battle-view-3d,miniature}.tsx`, `hero-equipment.ts`, `miniature-appearance.ts`, `enemy-adornments.ts` | Separate scene composition, actors, DOM labels, effects, and resource ownership without proliferating pass-through components. |
| Expedition UI | `apps/client/src/features/expedition/`, `routes/dungeons/`, `routes/battle/finished.$id.tsx` | Shared run-state selectors and focused preparation/map/result components; the server determines legal progression. |
| Route definitions | `apps/game/src/dungeons/{route,route-catalog,types}.ts` | Typed weighted catalog, persisted offer/decision contracts, pure calculations, and explicit version handling. |

Current hotspots are modest but combine responsibilities: `use-battle.ts` is 270 lines, `battle-scene.tsx` 516, `battle-ws.ts` 402, `dungeon-manager.ts` 360, and `bm.ts` 403 at handoff. Line count alone is not a reason to split them. Extract modules that hide a complete responsibility and reduce what callers need to know. A renamed wrapper or a new folder around the same tangled state is not completion.

Useful current excerpts for identifying the right contracts:

```ts
// apps/game/src/dungeons/route-catalog.ts
export const routePathCounts = [
  { count: 2, weight: 60 },
  { count: 3, weight: 30 },
  { count: 4, weight: 10 },
] as const;

// apps/server/src/game-usecases/dungeon-route.ts: chooseDungeonPath
return db.transaction(async (tx) => {
  const [record] = await tx
    .select()
    .from(TB_dungeonData)
    .where(eq(TB_dungeonData.id, dungeonId))
    .for("update");
  // Party authorization, same-choice retries, stage and offer validation,
  // resource changes, loot writes and the saved decision share this transaction.
});
```

Match existing TypeScript strictness, named exports, TanStack Query/tRPC data access, Drizzle transactions, Zod boundary validation, and `TRPCError` error codes. `chooseDungeonPath` is a concrete transaction/validation exemplar. Prefer pure typed helpers for calculations and selectors; React components should express state and interaction. Keep Three.js resources inside the client. Use the domain terms in `CONTEXT.md` when naming extracted modules.

### Contracts every refactor must retain

- An invalid command has no turn/resource/RNG consequences. A valid action that happens to have no effect still has an explicit accepted outcome.
- The server owns turns, targets, costs, effects, and winners. Client inspection, descriptions, rendering, seeking, and skipping do not execute combat rules or consume RNG.
- Journal/state commitment precedes acknowledgement. Uncertain delivery cannot produce a second action. Cold recovery resumes pending completion, including after workflow creation or database failures.
- Completion, XP, drops, and progression are keyed by attempt identity and applied atomically once. Fresh attempts use frozen builds/resources; current inventory must not rewrite a saved battle.
- Effect provenance, actual applied damage/healing, death, and ordering stay consistent across live state, saved events, and playback. Ordinary healing does not revive; multi-hit attacks recheck eligibility after a target dies.
- DOT/HOT duration uses the affected character's turns, including blocked opportunities. A tick settled at round end is credited to the next holder end step. Final Verdict executes at or below 10% HP.
- Recorded playback and old command resimulation are distinct. Saved events still render their original result; a corrected engine need not reproduce obsolete combat rules.

## Verification baseline and commands

Fresh handoff checks on 11 September 2026:

| Check | Observed result |
| --- | --- |
| `bun run test:battle` | **560 pass, 3 fail**, 25/26 files pass; exit 1. Only the three historical cases below fail. |
| `bun run typecheck` | Client and server pass. |
| `bun run typecheck:battle` | Pass for the current config's included paths. |
| Protected historical files compared with `3835a60` | **34 files identical**, including tests/recordings and the original harness files. |
| Latest route-focused run before handoff | 32 tests pass across four files; included again in the fresh full run. |
| Latest production-mode Vite build before handoff | Pass with a large-chunk warning; static build only, no deployment. |
| Latest local React Doctor before handoff | 29 findings, unchanged by route work. No fresh whole-repo security or maintainability audit is implied. |

The three accepted failures in `tests/battle/live-recordings.test.ts` are the tests named `<recording>: authenticated browser recording agrees with persisted results and frozen-build restoration`, for `live-six-entity`, `live-milestone-2`, and `live-milestone-3`. They assert obsolete frozen-command resimulation behavior. The user accepted those differences and required the files present under `tests/` in `3835a60` to remain byte-for-byte unchanged. **Do not rewrite those fixtures, invert assertions, add skips, or restore an obsolete engine to make the suite green.** New regression files may be added; later tests should continue to verify current behavior.

The existing runner runs test files in separate Bun processes because mocks/browser globals otherwise leak. Keep that isolation. PGlite tests use real PostgreSQL semantics and fault injection but serialize one connection; they do not prove concurrent production lock behavior or real Cloudflare scheduling. Existing browser checks used authenticated local sessions; local record IDs are not portable fixtures.

Commands from the root, unless a working directory is specified:

| Purpose | Command | Expected |
| --- | --- | --- |
| Reproduce dependencies | `bun install --frozen-lockfile` | Exit 0 with unchanged lockfile. Use when preparing the implementation environment, not as an incidental audit step. |
| Application types | `bun run typecheck` | Exit 0. |
| Included test types | `bun run typecheck:battle` | Exit 0. |
| All battle tests | `bun run test:battle` | All current behavior tests pass; only the three precisely named historical assertions fail. |
| Rules | `bun run test:battle:rules` | Exit 0. |
| Integration | `bun run test:battle:integration` | Exit 0. |
| Content sweeps | `bun run test:battle:sweep` | Exit 0. |
| Run/route feedback | `bun tests/battle/run.ts dungeon` | Exit 0. |
| Equipment feedback | `bun tests/battle/run.ts equipment` | Exit 0. |
| Durability feedback | `bun tests/battle/run.ts integration/durable` | Exit 0. |
| Diff hygiene | `git diff --check` | Exit 0. |
| Client/server development | `bun run dev:client` / `bun run dev:server` | Client 3001, Worker 3000, with an explicitly verified development configuration. |
| Frontend build without the production-secret wrapper | In `apps/client`: `node ../../node_modules/vite/bin/vite.js build --outDir /tmp/loot-v1-build --emptyOutDir` | Exit 0; assets only in the specified temporary directory. Supply reviewed nonsecret public configuration for a runnable preview. |

Use a supported Node runtime. This machine's default shell sometimes selected Node 10, while successful Vite/Wrangler runs used Node **22.19.0**; Bun is **1.4.0** here, while the server package declares **1.2.23**. Phase A must choose and document one reproducible toolchain rather than rely on PATH accidents. Inspect installed CLI help before adopting new flags.

There is currently no repository-wide lint script or checked-in CI workflow. The existing test TypeScript config includes `rules/`, `sweeps/`, `integration/`, `support/`, and `run.ts`; it does **not** cover every top-level presentation test or recording script. Add an additional typecheck configuration outside protected historical files to close that gap.

**Environment caveat:** `build:client` uses Doppler `prd`, and root `deploy` builds then deploys with production credentials. `db:push:prod` is a direct schema push. These are not harmless validation aliases. The current Wrangler KV binding sets `experimental_remote: true`, so a local Worker is not evidence that every service is local. Read configuration without printing secret values; establish explicit isolation before integration work.

## Implementation phases

### A. Establish a reproducible baseline and release gates

**Scope:** root scripts/configuration, a new CI workflow, new verification helpers, new test-typecheck configuration, setup documentation, and the evidence document.

1. Record the transferred prototype commit and manifest result. Capture the full test/type/build baseline, local React diagnostics, and screenshots of preparation, a two/four-choice map, live combat, results, and replay before changing behavior.
2. Pin/document the supported Node and Bun versions and make install, typecheck, test, lint/check, and static build commands reproducible. Separate environment-neutral builds from secret injection and deployment. Inventory actual development, staging, and production bindings; document variable names only.
3. Add CI with a frozen install, complete types, test gates, and a production-mode asset build using safe public test configuration. Run the original full suite and retain its raw output. Add a narrow verifier that accepts only the three known assertions with the expected failure signatures; any new failure, missing test file, changed protected file, or unrecognized output fails CI. Unit-test that verifier with unexpected-failure and missing-result cases. Never convert all exit-code-1 results to success.
4. Put the byte-identity check for the 34 historical files into the verification gate. Use `git ls-tree -r --name-only 3835a60 -- tests` and compare the contents from that commit to the current files; this allows adding genuinely new tests. Ensure CI fetches the historical commit needed by this check.
5. Add complete type coverage for top-level battle tests and recording helpers through a new config/script. Preserve the original protected runner/configuration. Establish an incremental lint/React diagnostic baseline with individually explained exceptions instead of broad suppressions.

**Gate:** all typechecks/builds exit 0; the new regression verifier passes on the current baseline and rejects injected extra failures; protected files match; CI reports the historical exceptions visibly. Record exact new command names in the evidence and setup docs. No feature refactor starts before this baseline is reproducible.

### B. Refactor battle sessions and presentation without changing results

**Scope:** shared combat only where a concrete seam is needed; server `battle/` and `durable-objects/battle-ws.ts`; client battle hooks, playback, and scene composition; new regression tests.

1. Trace one cast from client selection through transport, command validation, durable commitment, response, and display. Mark each state owner and lifetime. Keep the existing command/recovery modules when they already provide a good boundary.
2. Separate the `useBattle` connection/revision lifecycle from selection state and presentation catch-up. Model disconnected, synchronizing, ready, and submitting states explicitly where that simplifies transitions. There must be one rule for enabling Cast, based on authoritative ownership/turn/targets and pending state.
3. Extract responsibilities from `BattleWebsocket` only after characterization coverage exists. Keep journal transaction, completion obligation, and recovery scheduling cohesive; splitting them into independently called helpers must not weaken atomicity. Avoid callback chains that obscure when an action becomes committed.
4. Split scene composition from actor/label interaction and owned animation behavior. Preserve `timeline.ts` as an event adapter and `use-playback.ts` as presentation timing. Consolidate genuinely duplicated timing/appearance decisions around typed registries, retaining generic fallbacks and existing impact timing.
5. Remove stale derived state, unstable effect dependencies, accidental rerender work, and obsolete implementations exposed by these extractions. Validate each deletion against imports and runtime entry points. Prefer existing domain modules over a new generalized engine or event framework.

**Tests:** add focused files using `tests/battle/integration/client.test.tsx`, `integration/durable.test.ts`, `session.test.tsx`, and `playback.test.tsx` as patterns. Cover late target responses, two same-revision commands, disconnect during submission, uncertain acknowledgement, cold recovery, shortened/replaced histories, context loss, view switching, and recorded seeking that cannot submit commands. Extend existing coverage only where a real gap exists.

**Gate:** relevant focused tests, application types, and the full regression gate pass; identical frozen current-rule scenarios produce the same results before and after. In an authenticated browser, cast, reject a stale action, reconnect, switch Cards/3D, and skip visuals without an extra command or lost decision.

### C. Refactor dungeon, equipment, and reward persistence

**Scope:** `game-usecases/{dungeon-manager,dungeon-run,dungeon-route,character,entity-factory,loot-manager}.ts`, their routers, shared route/build types, expedition UI selectors, and new regression files.

1. Separate run reads from transactional commands such as enter, choose path, begin attempt, and apply completion. Name explicit states and legal transitions: prepared, fighting, awaiting choice, ready for next wave, complete, and defeated. Derive them consistently from persisted data; avoid adding another independently maintained status field unless its migration and invariants justify it.
2. Centralize participant authorization and run transition validation where the contracts truly match. Keep creator/participant start permission separate from per-character cast/equip permission and per-owner loot access. Keep router validation thin and use-case validation authoritative.
3. Retain one transaction boundary for each run mutation and document lock order across run, attempt, character, equipment, and reward rows. Preserve uniqueness/idempotency and add independent PostgreSQL-connection tests for overlapping starts, choose-vs-start, duplicate completion, duplicate claims, and competing slot updates. Include actual rollback/failure injection.
4. Make saved route/build/journal versions explicit at deserialization. Offers currently snapshot identity/name/kind/rarity/actions, while many numerical effects come from live rules; elite odds are saved only when chosen. Decide and document the compatibility contract before changing balance again. Prefer preserving the terms presented to an existing run through a versioned ruleset or sufficient snapshot data. Add tests for old linear runs, current route v1, legacy elite decisions, and future unknown versions. Unknown state must fail clearly instead of silently being reinterpreted.
5. Consolidate shared run-state and equipment-display calculations used by preparation, map, departure, and results. Persisted rewards remain the source of truth; optimistic UI cannot invent loot or a new route outcome. Ensure loading, denied access, mutation failure, completion pending, and another participant changing the run all have recoverable UI states.

**Tests:** add files alongside the existing `integration/dungeon-run.test.ts`, `integration/dungeon-route.test.ts`, and `integration/equipment-build.test.ts`. Cover multi-owner behavior and inspect affected rows after failed operations. Keep the existing deterministic route-distribution and full-run tests.

**Gate:** `bun tests/battle/run.ts dungeon`, `bun tests/battle/run.ts equipment`, types, and the full regression gate pass; the independent PostgreSQL concurrency suite proves one accepted transition and no duplicated rewards. Reloaded maps, resources, and frozen gear agree with the original state.

### D. Complete security, data, and operational review

**Scope:** application entry points, Clerk/context/procedure boundaries, all exposed routers and WebSockets including chat, serialization, Worker bindings, database access, and release configuration.

These are review targets, not a completed vulnerability audit. Record evidence and a reproducer before labeling a behavior defective.

| Review target | Evidence to start from | Required conclusion/check |
| --- | --- | --- |
| Identity and membership | `apps/server/src/index.ts`, `lib/context.ts`, `lib/trpc.ts`, routers, both Durable Objects | Authentication is not sufficient for every resource. Build a creator/participant/outsider/spectator matrix for reads and mutations, including raw IDs and direct reconnects. |
| WebSocket trust boundary | `index.ts` obtains Clerk identity and overwrites the forwarded `userId` query parameter | Preserve verified identity propagation; do not misreport the internal query parameter alone as user impersonation. Test the actual upstream route and downstream membership/action checks. |
| Cooperative party assembly | `routers/dungeon-router.ts`, `game-usecases/dungeon-manager.ts` | Establish who may add whose character to a new run. Preserve confirmed participant start rights; record any unresolved consent/entry policy rather than inventing a new invite system during cleanup. |
| Long-lived credentials | `durable-objects/battle-ws.ts` stores a Clerk secret during setup; inspect chat's lifecycle too | Determine whether persistent copies are necessary. Prefer runtime bindings where possible; handle existing stored copies and rotation safely. Report locations/types, never values. |
| Cross-origin and session lifecycle | `index.ts` has broad CORS middleware; battle/chat use WebSocket upgrades | Review allowed origins, expired/revoked sessions, reconnect authorization, and logout behavior against the actual deployment. |
| Abuse and malformed input | tRPC inputs, battle protocol, chat, connection/session maps | Validate payload shape/size, unknown actions, flood/reconnect limits, chat escaping, and cleanup. Bound resource usage with measured limits, not arbitrary client-only checks. |
| Telemetry/privacy | `index.ts` enables Sentry and default PII, and logs errors | Review production/development separation, useful redaction, collection intent, and retention. Do not include credentials, full builds, or chat contents in routine diagnostic events. |
| Dependency/build exposure | `bun.lock`, package scripts, Vite public environment handling, public assets | Audit installed versions and reachable usage; inspect the actual bundle for server secrets, development fixtures, and unintended debug entry points. A version warning alone is not an exploit finding. |

Add structured diagnostic events around command rejection, recovery, completion retries/failure, transaction conflicts, and asset fallback. Include safe correlation identifiers for run/battle/revision and deployment version. Document how to identify and recover an attempt stuck between battle completion and reward delivery. Health checks should distinguish process availability from essential dependency readiness without exposing configuration.

**Gate:** authorization/abuse regression tests pass; every reviewed entry point has a documented permission policy; demonstrated high-impact access/data-loss defects are fixed; telemetry redaction is verified with synthetic data; remaining risks have evidence and an explicit release disposition. Real Cloudflare staging must verify alarms, cold starts, workflow retry, and reconnect behavior that mocks cannot establish.

### E. Clean and qualify the player experience and asset pipeline

**Scope:** expedition/battle/result UI, shared visual primitives and tokens, asset manifests/build scripts, development preview entry points, and reachable first-release navigation.

1. Remove dead components, stale CSS, unused dependencies, debug logs, and duplicate state after the refactors. Keep development galleries and recordings useful for QA but excluded from production routes/bundles. Inspect build output; a folder named `dev` is not an exclusion guarantee. Preserve licenses and provenance when pruning assets.
2. Keep the established art direction. Consolidate repeated colors/spacing/control states where it improves consistency. Make active turn, selected target, chosen route, reward ownership, and pending mutations legible. Use semantic HTML, visible focus, accessible names, keyboard paths, and reduced motion. Important state must remain readable without color or WebGL.
3. Audit every navigation path exposed in the first release. Character creation/selection, authentication, loading/error/empty states, denied resources, inventory, and direct result/run URLs need an honest path forward. If a visible surface depends on unfinished product scope such as a gold economy, document and contain that surface until its policy is decided.
4. Measure a six-actor scene and the busiest current effects in the production build. Record browser/device/viewport, cold asset load, bytes, p50/p95 frame time, and repeated scene-entry memory/resource counts. Profile and fix observed bottlenecks; preserve lazy 3D loading, independent mixers/skeletons, shared immutable assets, stale-load cancellation, and cleanup. Set an explicit device-specific budget from these measurements and then enforce it.
5. Revalidate changed GLBs and regenerate placement manifests when asset hashes change. Inspect native and fallback attack/cast/hit/death behavior, staff/robe attachment, and repeated dressing/disposal. Confirm missing models and WebGL context loss leave Cards or usable controls available.

**Gate:** focused presentation/asset tests, full types/build, and the regression gate pass; the browser checklist below has evidence at the declared desktop sizes/browsers. There are no new browser errors, inaccessible essential actions, overlapping essential controls, or unbounded resource growth. Record existing warnings and measured limits honestly.

### F. Make migrations and deployment repeatable

**Scope:** database migrations and verification helpers, Wrangler/environment configuration, deployment scripts/CI, and setup/release/recovery documentation.

1. Establish separate development/staging/production databases, Clerk configuration, Durable Object namespaces, workflows, KV, telemetry environment, and assets. Reuse correctly isolated infrastructure if it exists. Verify target identity before writes. Audit the `experimental_remote` KV setting and production-secret build wrapper described above.
2. Reconcile Drizzle's current schema, the old generated migrations, and the two manual migrations. `0000`–`0005` predate the audited schema; blindly replaying them does not establish a safe upgrade. Build a tested fresh-install path and an upgrade path from the actual deployed schema, with migration history/checksums and explicit preflight checks. Retain the existing migration evidence.
3. Rehearse migration failure/rollback on a disposable database and restoration from a backup. Test old linear runs, completed historical attempts, existing route state, and uniqueness constraints. Prepare forward and rollback application compatibility; an old binary must not be served new snapshots or journal formats it cannot interpret.
4. Drain active attempts and pause new starts/completion for any combat/journal/schema cutover that cannot support mixed versions. Apply schema before code that requires it, following the exact migration README. Do not silently replay an active journal with different combat rules.
5. Prepare a staging deployment with synthetic accounts/data and execute the complete end-to-end and failure-recovery checks. Produce a release runbook naming the artifact commit, target bindings, backup, preflight, drain, migration order, deploy, smoke checks, rollback trigger, and recovery steps. A dry-run/build does not count as a deployment.

Existing migration facts:

- `apps/server/migrations/manual/20260910_dungeon_attempts.sql` upgrades the audited attempt schema, validates historical integrity, adds completion/snapshot safeguards, and requires draining active attempts. Its README contains the exact SQL preflight queries and ordering.
- `apps/server/migrations/manual/20260911_dungeon_routes.sql` adds nullable `dungeon_data.route` transactionally; old runs remain linear. It was applied only to the verified local OrbStack `game` database. No production application of either migration has been established by this handoff.
- Equipment and the initial full-run UI did not require a separate migration. Verify actual target schema instead of inferring deployment state from local code.

**Gate:** fresh installation and upgrade tests pass; interrupted migrations leave valid state; backup restoration succeeds; staging proves real runtime behavior; release and rollback commands are concrete and target-specific. Execute production writes/deployment only under the operator's explicit release authorization, after the result is reviewable.

### G. Review, fix findings, and deliver

1. Review the complete diff against the behavior section and captured baseline. Review correctness/security separately from maintainability: an attractive module split can still break recovery or permissions. If independent review agents are available and authorized, assign bounded reviews after the implementation; otherwise perform a separate review pass and state that limit.
2. Review module interfaces, transaction/state ownership, error paths, temporary compatibility branches, unexplained type assertions, circular imports, and shared-resource disposal. Remove unnecessary abstractions and pass-through helpers. Inspect every changed dependency and generated artifact.
3. Fix actionable findings, add a meaningful regression when warranted, and rerun affected tests. Then run the complete release gate once on the final candidate and inspect CI. Keep the three historical exceptions precise and visible.
4. Update setup/architecture/release documentation so a new developer can install, run, test, build, provision an isolated environment, migrate, and troubleshoot without this conversation. Reconcile old prototype documents as historical milestones; several still describe features as deferred that now exist.
5. Deliver focused commits and, when authorized, a reviewable PR with the concrete resulting behavior, evidence, migration/deployment order, and any remaining limitations. Update `plans/README.md` and the evidence document. Report **ready for release**, **released**, or **blocked by a named requirement** accurately.

**Gate:** final types/build/regression checks pass under the documented exception policy; new review findings are resolved or explicitly accepted; all required browser/staging/migration checks have evidence tied to the candidate commit. A deployed release additionally requires successful production smoke checks. Local code completion alone must not be called a production launch.

## Browser acceptance checklist

Automate stable flows where useful using isolated accounts and the real application protocol. Do not substitute DOM state injection or canned battle outcomes for these checks. Record screenshots and identifiers as evidence; use seeded fixtures for repeatability, not shared personal characters as permanent CI fixtures.

| Flow | Required observation |
| --- | --- |
| Preparation | Open all six catalog entries; select one/two heroes; preserve selection after reload; change spells through 0–4 slots; preview/cancel/equip gear; prevent entry while mutations are pending. |
| Ownership | Creator and participant owners can start/choose within policy; outsiders cannot mutate/read private run rewards; users cannot cast/equip for an unowned character. Exercise two browser sessions. |
| Live battle | Correct turn/HP/MP/targets; explicit Cast; rejection leaves state intact; double submission produces one action; disconnect/reconnect resumes the committed state. |
| Presentation | At least six actors remain readable; both 3D and Cards work; reduced motion and Skip visuals preserve state; slow/missing GLBs and context loss retain usable controls. |
| Routes | Show 2/3/4 offers from real saved runs; reload preserves future offers; choose each room type; shrine caps and fallen heroes behave correctly; same/conflicting retries cannot duplicate decisions or loot. |
| Elite/treasure | Inspect fixed winning/losing rolls, actual enhanced starting attributes, defeat without elite bonus, and reward odds preserved for a legacy choice. |
| Completion | Complete one entire five-wave run; carry resources, receive survivor XP, claim per-owner loot once, prepare a changed build, and enter another run. Verify defeat/restart separately. |
| Replay | Reopen an earlier result after changing gear/spells; original snapshots and final saved HP/MP/death remain correct; seeking/view switching cannot affect the active game. |
| Recovery | Delay/fail completion delivery, restart the Durable Object, retry after an uncertain response, and observe eventual one-time completion/rewards. Use real staging runtime for the final check. |
| Release artifact | Direct navigation/reload works through hosted SPA routes and API/WS proxies; development fixtures/secrets are absent; asset URLs/cache behavior work on the actual staging origin. |

Desktop is the accepted scope. Test the primary desktop browser plus at least one other supported engine, and document exact versions/sizes. Current responsive CSS alone does not establish mobile support. The current local preview is `http://127.0.0.1:3001/dungeons/q87wofzc9fpi`, left after one victory at a two-choice fork; it requires the existing local authentication/data and may no longer exist in another environment. The deterministic art preview is `/dev/battle-replay.html?encounter=tides` while the development server is running.

## Scope boundaries and decisions

Routine refactoring, targeted bug fixes, tests, setup/CI, and local verification are the implementation scope. Files under `apps/`, `scripts/`, new test paths, root tool configuration, CI, `docs/`, and `plans/` may change where required by a phase. Document any expansion. Protect the 34 historical test files, existing saved-data contracts, asset licenses, and unrelated work.

Keep these separate from behavior-preserving cleanup: class systems, skill trees, crafting/trading/marketplace, cash/token/wallet functionality, legendary mechanics, combat movement/range/cover, audio, a framework/engine rewrite, bespoke models for all enemies, and expanded onboarding. The plan does not require a large new product surface to qualify the existing loop.

Resolve ordinary implementation choices autonomously. Seek a focused product decision only when evidence cannot establish it and the answer changes user rights or visible behavior—for example consent to add another owner's character, an actual gold wallet, save compatibility after a rules change, or whether an unfinished navigation surface belongs in the first release. Continue independent work while that decision is pending.

Stop the dependent operation and report concrete evidence if:

- The transferred working tree omits route files or conflicts with newer user work.
- A proposed refactor changes combat results, route odds, rewards, ownership rights, or old saved-state interpretation without an intentional specification.
- Migration preflight finds active/inconsistent legacy rows, the target environment cannot be identified, or credentials would point local tests at shared services.
- Passing a check appears to require changing protected historical tests or hiding additional failures.
- A missing authenticated/staging capability prevents final live/runtime verification. Finish unaffected local work, state the missing proof, and retain the corresponding release gate as incomplete.

## Completion criteria

- [x] Complete prototype transferred, including the 22 route/balance files; baseline commit and drift resolution recorded.
- [x] Phases A–G have evidence and explicit results; module boundaries and ownership are understandable without this conversation. Incomplete runtime gates are named in the evidence.
- [x] Types cover application code and all intended tests/recorders; production build succeeds with reviewed warnings. Four exact protected-test diagnostics are explicitly accepted and remain visible.
- [x] Current behavior tests pass; only the exact three historical assertions remain accepted; all 34 protected files are unchanged.
- [ ] PostgreSQL concurrency and Cloudflare staging recovery checks pass beyond the local substitutes.
- [x] Permission and abuse review covers exposed tRPC/HTTP/WS/chat surfaces; demonstrated high-impact application defects are fixed. Remaining dependency and staging dispositions are named separately.
- [ ] Complete player-loop, route, gear, replay, fallback, keyboard, and desktop performance checks have evidence.
- [ ] Fresh install, upgrade, backup restoration, release, and rollback procedures are reproducible; no secret values appear in artifacts.
- [x] Local cleanup and independent review are complete; setup and milestone references accurately distinguish current behavior from historical scope. Fresh React diagnostics remain blocked as documented.
- [ ] The final response names the candidate commit/PR, verification results, unresolved decisions, and actual deployment status.

## Reference map and maintenance notes

Read these when working in the corresponding area; the operative behavior and gates are in this plan.

| Reference | Use |
| --- | --- |
| `CONTEXT.md` | Shared domain vocabulary and distinctions. |
| `plans/README.md`, `plans/verification-results.md`, `plans/battle-audit/README.md` | Completed repairs, evidence, accepted historical exceptions. |
| `docs/dungeon-run-milestone.md` | Full-run flow, preparation, reward/restart browser evidence. |
| `docs/equipment-milestone.md` | Equipment attributes, ownership, frozen appearance, actual rig checks. |
| `docs/branching-dungeon-milestone.md` | Current route implementation, balance rationale, saved decision semantics, tests. |
| `docs/forest-encounter-milestone.md`, `docs/biome-encounter-milestone.md` | Arena/effect behavior and historical rendering measurements. |
| `docs/enemy-models/README.md` and its linked manifests/reports | Provenance, conversion, clip gaps, placement hashes, validation caveats. |
| `docs/threejs-prototype-handoff.md`, `docs/threejs-prototype-decisions.md` | Approved initial desktop/visual intent; original implementation limits are historical. |
| `docs/game-overview.md`, `docs/game-content-catalog.md` | Orientation/catalog inventory; verify mechanics against current code because these predate later repairs. |
| `tests/battle/README.md` | Harness and isolation details; its original red baseline is historical and the file is protected. |
| `apps/server/migrations/manual/README.md` | Exact migration preflight and cutover requirements. |

Future content additions must update typed registries, current-rule tests, visual fallbacks, and acquisition paths together. Balance changes need a saved-run compatibility decision. Asset changes need placement regeneration and ownership/disposal checks. A new persistence version needs recovery and migration coverage. Preserve a small set of deep modules instead of scattering these rules across UI, routers, and engine definitions.

### Copyable executor brief

> Implement `plans/008-production-handoff.md` to turn Shards of Affinity's current playable prototype into a maintainable first release. Start by preserving the complete `prototype` working tree, including the 22 uncommitted files listed in `plans/008-prototype-manifest.json`. Follow phases A–G: establish reproducible checks, refactor battle and dungeon state boundaries, clean the UI/assets, review security and operations, rehearse migrations and staging, fix review findings, and document release readiness. Preserve current gameplay, visual direction, weighted 2–4-path routes, reduced loot, frozen builds, and transaction/recovery guarantees. Keep the 34 historical test files from `3835a60` byte-identical and the three accepted old-resimulation failures visible. Record evidence in `plans/008-production-evidence.md`; continue routine implementation and verification autonomously. Carry out publishing or production changes only when release authorization has been provided. Finish with the candidate changes, checks, remaining blockers, and actual deployment status.
