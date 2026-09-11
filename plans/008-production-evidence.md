# Production migration evidence

Status on 11 September 2026: **local candidate implemented; release qualification incomplete; not deployed**.

## Candidate and baseline

- Branch: `codex/production-v1`. Complete prototype checkpoint: `976ddac`, based on `017644e` plus all 25 working-tree files. All 22 prototype-manifest hashes matched before editing.
- The 34 historical paths from `3835a60` remain byte-identical. The gate compares current files with Git contents.
- Node 22.19.0 and Bun 1.4.0 are pinned. The original client shell sometimes selected Node 10; builds explicitly use the pinned runtime.
- Baseline: 560 passing tests and the three known stale-revision assertions; application and original included-test types passed. Original production entry chunk approximately 1,344 kB; lazy miniature chunk approximately 959 kB.
- Code candidate: **`4ae05e3a56b551137590860e87d7a20c6a7b6d18`**. The complete source tested below is committed there; the following documentation commit changes no application, tool, configuration or test source.
- Focused commits: `af7923f` battle sessions; `6063435` run/build persistence; `5d271c3` server security; `9797e83` player recovery/auth inventory; `4ae05e3` release and migration tooling.

## Phase results

| Phase | Local result | Remaining qualification |
| --- | --- | --- |
| A | Pinned runtimes, complete types, frozen CI install, strict result/protected-file verifier and artifact gates pass. | Fresh React Doctor and remote CI. |
| B | Connection/command ownership and actor/label composition separated. Uncertain acknowledgement gates preserved; semantic Cards controls and return to 3D added. | Authenticated live cast/reconnect proof. |
| C | Shared six-phase run state, authorization, repeatable snapshot reads, atomic attempt start, SQL-ordered character locks and versioned codecs implemented. | Actual deployment schema identity. |
| D | Reproduced ownership, provisioning, chat, oversized payload and cross-account observer defects fixed; safe diagnostics and readiness added. Independent review completed. | Staging cold recovery, revocation, alarms/workflows and two-account proof. |
| E | Wallet remnants removed; inventory/recovery/loot copy clarified; development grants contained. Static artifact/assets, six preparation pages, saved maps/results, keyboard Cards/3D and graphics-error recovery pass locally. Device-specific renderer budget passes. | Full player loop, second engine and complete memory/context-loss checks. |
| F | Guarded environment templates, fresh/upgrade paths, rollback, restore and independent PostgreSQL contention proof pass. Release runbook prepared. | Target-specific staging deployment and smoke checks. |
| G | Independent boundary/security reviews completed and findings fixed; focused commits and current setup/architecture/release documentation delivered. | Outstanding release gates below; no remote publication or deployment. |

## Final local checks

Complete `release:check` passed using the isolated PostgreSQL proof environment. Reviewed [PostgreSQL proof](008-production-evidence/postgresql-proof.json), [artifact report](008-production-evidence/production-artifact.json), [asset validation](008-production-evidence/assets.json) and [browser measurements](008-production-evidence/browser-performance.json) are retained beside this document. Raw evidence: `/tmp/loot-production-candidate-final/`; console: `/tmp/loot-production-candidate-final-console.log`.

| Check | Result |
| --- | --- |
| Original isolated-process battle runner | **606 pass, 3 fail across 36 files.** Raw exit remains 1. |
| Strict historical verifier | Pass; only the exact three named stale-revision failures accepted. Unexpected output/failures and missing results fail. |
| Gate and safety self-tests | 24 pass. |
| Application and complete test/recorder types | Pass under the explicit four-diagnostic historical policy; 73 root files covered. |
| PostgreSQL fresh install / audited upgrade | Pass; four invalid preflight cases rejected and injected failures roll back both paths. |
| Backup restoration | Restored schema, every row and migration history equal the upgraded source. |
| Independent PostgreSQL contention | Eight scenarios pass: starts, choose/start, completion, claims, equipment and mixed-case character lock ordering. Separate backend PIDs demonstrably waited on locks. |
| Neutral production build / artifact scan | Pass; 137 files, 11,123,236 bytes. Entry JS 748,973 bytes; lazy miniature JS 959,439 bytes. Large-chunk warning remains. |
| Assets | All 94 public files byte-identical, including licenses. Fresh validation of 16 enemy GLBs: zero errors, 41 existing warnings. No model/placement changes. |
| Protected files / diff hygiene | Pass. |

Artifact manifest SHA-256: `87dcb7672cf6f3b9a1ae66ad6ac5db7045c476132432c035ecfd33899b8cece0`. Public asset manifest: `14acee97304d8c00f26971d027c6cc8bf93968838e42f26f650327cc3ade0ecc`.

The artifact scan verifies concrete private sentinels, known forbidden server/development paths/content, emitted entry points, source-map absence and public-asset identity. It is not a universal secret detector. The temporary QA gallery is separate from the shipped artifact.

## Decisions and review findings

- **Historical types:** the operator accepted exactly four old diagnostics in three protected files. Raw `tsc` still reports them; the gate prints and matches complete path/position/code/message, rejecting new, changed, duplicated or missing diagnostics. No protected file was changed or skipped.
- **Spell acquisition:** the operator chose development/testing only for unlimited Create spells. Production excludes the UI; the server permits grants only for exact `development`/`test` environments. Starter/earned loot is unchanged.
- Existing creator/participant start rights, party assembly and public spectator reads remain explicit in the permission matrix. No new consent system was invented.
- Independent reviews reproduced and fixed outsider character mutations, duplicate first-user grants, malformed stored chat, invalid/oversized sockets, streaming HTTP body-limit bypass, cross-account cached observers and inconsistent character locking. New regressions cover the defects.
- Hono 4.11.5 → 4.13.5 closes the reproduced body-limit bypass. Wallet dependencies were removed. Remaining advisory dispositions belong in the security report; no clean audit is claimed.
- Final independent boundary review found no actionable defects in command/connection, auth/query, run/locking or saved-state compatibility. It relied on the completed release gate.
- Runtime Clerk bindings replace persisted secret copies, which are nulled. Rollback requires draining and fresh authenticated setup; old warm sockets are not assumed rollback-safe.

## Browser and environment

See [browser qualification](../docs/production-browser.md) for observations, measurements and the remaining checklist. Screenshots are visible in the task, not committed portable fixtures.

Baseline authenticated run `q87wofzc9fpi` showed its saved two-choice fork and carried resources; result `nuiiilvcad1x` showed durable victory and +60 XP per survivor. Saved replay and Cards opened. The accessibility tree includes static canvas fallback text even when WebGL works: the initial inference of unavailable WebGL was incorrect. Screenshots and renderer measurements establish successful 3D rendering.

The database rehearsal used a dedicated disposable container/database at port 55439, never the existing `game` database. The operator restarted the signed-in client at localhost:3001. Worker3000 still uses the original configuration with remote KV, not the guarded local configuration. Final checks against that app stay read-only; localhost alone does not establish isolation.

## Requirements blocking release

1. Identify isolated staging bindings and actual target schema; execute target preflight/migration order in the runbook.
2. Prove real Cloudflare cold recovery, alarms, workflow retry, delayed completion, rotation/revocation and reconnect with synthetic accounts.
3. Complete the five-wave/two-owner player loop, hosted SPA/API/WS/assets, second engine and whole-process/GPU memory/context-loss checks.
4. Run the declared React diagnostic check and remote CI against the candidate, resolving new findings.
5. Resolve or explicitly accept the remaining dependency dispositions before promotion. All 48 remaining advisory URLs are accounted for; no additional production exploit path was established by the bounded review. Compatible patch candidates and required simulator/database requalification are documented in the security report.

Fresh React Doctor was not executed: sandbox registry access failed, then automatic approval review rejected elevated download/execution of unpinned third-party code with repository access. No retry or bypass was used. The historical report `/tmp/loot-react-doctor-all-final.txt` (53/100; 90 warnings in 29 files) is not a fresh score. Confirmed issues were fixed and independently reviewed.

## Documentation

[Setup/commands](../docs/production-setup.md) · [Architecture](../docs/production-architecture.md) · [Client lifetimes](../docs/production-client.md) · [Security/permissions](../docs/production-security-review.md) · [Migration/release/recovery](../docs/production-release.md)
