# Release checklist

Status on 11 September 2026: **local candidate implemented; release qualification incomplete; not deployed**. This checklist supersedes the completed production handoff. Record new evidence against the exact candidate commit in [release evidence](evidence.md).

Code candidate: `4ae05e3a56b551137590860e87d7a20c6a7b6d18`. The original evidence was committed in documentation-only commit `396d798`. Follow the [release, migration and recovery runbook](release.md) for commands and ordering.

## Completed local qualification

- [x] Complete prototype preserved; independent boundary and security reviews completed and demonstrated application defects repaired.
- [x] Full local `release:check`: **606 passing tests and exactly three accepted historical failures**. Raw runner exit remains 1; the strict verifier rejects additional or changed failures.
- [x] Application types pass; complete test/recorder types pass under exactly **four accepted historical diagnostics**. All **34 protected files** remain byte-identical to `3835a60`.
- [x] Isolated PostgreSQL 15.3 fresh install, audited upgrade, rejected preflights, transactional rollback, complete backup restoration and eight independently contended scenarios pass.
- [x] Neutral production artifact and asset checks pass; all 94 public files retain their bytes/licenses. Existing bundle and model warnings are recorded in the evidence.
- [x] Partial authenticated browser reads, Cards/3D keyboard navigation, injected graphics-error recovery and a production-mode six-actor budget pass on the declared M1 Max/in-app-browser cohort. See [browser observations and limits](browser.md).

## Checks still required

### Candidate and diagnostics

- [ ] Inspect the first remote CI run for the candidate, including its PostgreSQL 15.19 proof and retained raw artifacts. Publishing the branch and obtaining a CI result have not occurred.
- [ ] Complete a fresh React Doctor scan and resolve or explicitly disposition new findings. **This remains pending authorization:** automatic approval review rejected elevated download/execution of unpinned third-party code with repository access after sandbox registry access failed. No retry or bypass occurred; the historical 53/100 report is not a fresh score.
- [ ] Refresh the dependency audit at promotion and resolve or explicitly accept scoped dispositions for the remaining 48 advisory URLs. The [security review](security-review.md) records reachability limits, patch candidates and required database/simulator requalification; it does not establish a clean audit.

### Isolated staging and operations

- [ ] Identify and record the actual staging database host/name/version/schema, Cloudflare account/Worker/DO/workflow/KV bindings, Clerk test instance, public origin, assets and telemetry environment. Use synthetic accounts/data and the guarded configuration; ordinary local commands still use the original remote-KV configuration.
- [ ] Match the target schema to the candidate's reviewed fingerprint and qualify its actual database version. Resolve unknown/partial schemas and all preflight findings before migration.
- [ ] Establish and rehearse a target-specific maintenance/drain mechanism for starts and completion writes. Record the prior Worker/artifact, compatible rollback commit, backup location/checksum and provider retention/PITR policy; prove target backup restoration into a separate database.
- [ ] Prepare the concrete target record, then obtain release authorization and execute the staging migration/deployment sequence in the runbook. No staging or production deployment is established by local tests or a bundle dry-run.
- [ ] Prove real Cloudflare cold reconstruction, hibernation, disconnect/reconnect, delayed/failed completion, alarm recovery and workflow retry produce eventual one-time progression/rewards, including retries after uncertain responses.
- [ ] Exercise missing/expired/revoked sessions and credential rotation through real Clerk, including reconnect. Record the disposition of legacy secret copies in unvisited objects and retained backups.
- [ ] Verify hosted origin enforcement, readiness, telemetry redaction/environment/retention and diagnostic visibility; qualify the declared WebSocket/chat payload, connection, history and rate budgets under staging load.
- [ ] Rehearse rollback/restoration and authenticated reconnection on staging. Persisted Clerk-key erasure means the old binary requires a drained cutover and fresh setup; retained warm sockets are not proven rollback-safe.

### Authenticated desktop acceptance

Use two authenticated sessions on isolated staging and the real application protocol. The detailed observations in [browser qualification](browser.md) remain partial until these checks are recorded.

- [ ] Open all six preparations; persist one/two-hero selection; change 0–4 spell slots; preview/cancel/equip gear; prevent entry during pending mutations and with an empty party.
- [ ] Prove creator/participant start and route rights, outsider rejection for private run/reward operations, and owner-only casting/build mutations across two accounts.
- [ ] Cast explicitly with correct turn/resources/targets; reject stale/invalid actions without mutation; prove double submission commits one action and uncertain acknowledgement/reconnect resumes committed state without resending it.
- [ ] Exercise real saved 2/3/4-offer routes, reload-stable future offers, every room action, capped shrine recovery/fallen heroes, and same/conflicting choice retries without duplicated decisions or loot.
- [ ] Verify deterministic elite/treasure wins and losses, enhanced starting attributes, defeat without elite bonus and preserved legacy-choice reward odds.
- [ ] Complete a new five-wave run with carried resources, survivor XP and one claim per reward owner; change a build and start another run. Verify defeat/restart separately.
- [ ] Reopen an earlier result after changing gear/spells; verify its frozen starting build and final HP/MP/deaths. Seeking and Cards/3D switching must preserve saved and active state.
- [ ] Verify hosted direct URLs/reloads, SPA/API/WebSocket routing, cold asset loads and cache behavior using the actual release artifact and origin.
- [ ] Qualify the primary desktop browser and a second supported engine with exact versions/viewports: six actors and busy effects, readable controls, Cards/3D, keyboard, reduced motion, Skip visuals, slow/missing models and actual WebGL context loss.
- [ ] Measure cold load/bytes, p50/p95 frame time and repeated scene-entry whole-process/GPU memory against explicit device budgets. Existing per-renderer counts do not establish retired-renderer or process/GPU cleanup. Mobile qualification is outside the accepted scope.

## Promotion and preserved decisions

- [ ] Tie all completed checks, accepted limitations and target records to the final candidate. Source/dependency changes require affected verification and a final release gate before promotion.
- [ ] Under explicit production release authorization, repeat target identity, backup, preflight, drain, migration/deployment and production smoke checks. Record actual deployment status and resume traffic only after acceptance.

Existing creator/participant start rights, cooperative party assembly and public spectator/replay behavior remain the accepted baseline. Unlimited manual spell creation is development/testing only; starter and earned loot remain unchanged. Release qualification does not reopen those decisions or require a new gold economy, consent system or other deferred product scope. Preserve combat results, saved-data compatibility, route/reward policy and the protected historical files.
