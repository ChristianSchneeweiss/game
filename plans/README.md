# Battle repair tasks

Planned against `3835a60` on 10 September 2026. These seven tasks cover all 26 audited findings, the configured critical-damage defect, and the confirmed product decisions. Each task is a coherent implementation/PR scope with a shared rule to repair. The [audit](battle-audit/README.md) and [maintained regression suite](../tests/battle/README.md) remain the evidence.

| Task | Shared repair | Primary findings | Priority / effort / risk | Dependencies | Status |
| --- | --- | --- | --- | --- | --- |
| [001 — Cast outcomes](001-cast-outcomes.md) | Resolve an action once and record its consequences in execution order | B05, B16, B17 | P1 / M–L / high | None | Complete |
| [002 — Dungeon attempts](002-dungeon-attempts.md) | Claim one attempt, freeze its starting state, and apply its progression/rewards once | B11, B12, B13, B15 | P1 / M–L / high | None | Complete |
| [003 — Durable recovery](003-durable-recovery.md) | Commit recoverable battle state before acknowledgement and resume pending completion | B09, B10 | P1 / M–L / high | 001, 002 | Complete |
| [004 — Combat clock and death](004-combat-clock.md) | Give turn advancement, effect clocks and death one consistent lifecycle | B06, B07, B08, B22, B23 | P1 / M / high | 001 | Complete |
| [005 — Effect application and reactions](005-effect-resolution.md) | Install every effect through one interface and resolve damage reactions without cycles | B01, B02, B03, B04 | P1 / M / medium | 001, 004 | Complete |
| [006 — Target resolution](006-target-resolution.md) | Select uniformly from legal entities and recheck eligibility at every impact | B18, B19, B20, B26 | P2 / S–M / medium | 004, 005 | Complete |
| [007 — Combat calculations](007-combat-calculations.md) | Share resolved attributes and pure formulas; compose conditional modifiers from reusable rules | B14, B21, B24, B25; critical damage | P2 / M / medium | 004, 005 | Complete |

Effort is relative implementation size, including regression verification. Risks concern replay compatibility, combat timing and persisted progression, rather than confidence in the findings.

## Execution order

Use **001 → 002 → 003 → 004 → 005 → 006 → 007** as the default order. This establishes honest action records and recoverable persistence before repairing the remaining combat rules. Tasks 001 and 002 are independent. Task 004 can start after 001 if combat repair is the immediate priority. Execute 006 before 007 in a shared checkout because both migrate Storm Pulse; that is a file coordination constraint rather than a conceptual dependency.

Avoid concurrent edits to `bm.ts`, `base-entity.ts`, `calculator.ts`, or shared spell/effect interfaces. A task owns its listed findings; other tasks may exercise them as integration coverage, but should not independently implement the same fix.

The important contracts between tasks are:

- **001 → 003:** resolution produces an explicit outcome and ordered event data; 003 owns durable commitment and acknowledgement.
- **002 → 003:** completion can safely be delivered more than once because dungeon mutation is keyed by attempt identity.
- **004 → 005/006/007:** death is final for ordinary healing, effect clocks are explicit, and turn eligibility can be checked consistently.
- **005 → 006/007:** effects have complete context/provenance, and damage/effect application exposes actual resolved outcomes.

## Generalization rules

1. Spell, passive and enemy definitions declare behavior. Shared modules enforce casting, damage, healing, targeting, effect lifetime and persistence semantics. Do not add checks for named spells inside the engine or client reducer.
2. Build on the existing damage/effect modules. Add small reusable capabilities where needed; a new all-purpose spell language is outside these repairs.
3. Give each mutation one owner. The client renders recorded outcomes. The combat clock advances turns. The effect application interface registers effects. The dungeon attempt transaction applies progression and rewards.
4. Separate a valid cast with no effect from an invalid request or an exception. Separate resolving an action from committing it durably. Separate a combat round from a dungeon wave.
5. Keep live state, persisted state and battle replay consistent by construction, rather than adding compensating mana/HP adjustments in the UI.

## Confirmed decisions

- Dungeon starts are allowed for the creator or the owner of a participating character.
- Final Verdict executes at or below 10% health.
- DOT/HOT durations count the affected character’s turns, including blocked turn opportunities. A tick settled at round end is credited to the next holder end step.
- Test files and recordings remain byte-for-byte unchanged from `3835a60`.
- Old replay resimulation may break under corrected rules, as explicitly accepted by the user on 10 September 2026. No legacy simulator is required.

## Verification

The original run was **333 passing / 184 failing**. The implemented repairs produce **514 passing / 3 failing** across the same 517 tests. **All 435 audit tests pass**, including all 300 authored encounters, all 39 spells and all 11 passive-matrix entries. Client, server and test typechecks pass.

The three failures are older recording resimulations: `live-six-entity`, `live-milestone-2` and `live-milestone-3`. Those commands and revisions encode previous rules, including corpse hits, stun timing and absent Earthshatter defenses. Saved-event playback still matches persisted health, mana and death state for all four recordings. Re-executing the old commands with corrected rules cannot reproduce those old results. These failures remain visible; no skip, expected-failure annotation or test edit hides them.

All seven tasks are complete. The user accepted the three historical resimulation differences and instructed us to keep test files unchanged. This supersedes the original plans' test-addition instructions and full-suite exit-zero gate only for those three historical assertions. `bun run test:battle` still exits 1, and all other tests pass.

See [verification results](verification-results.md) for commands, scope and checks. The [manual migration](../apps/server/migrations/manual/README.md) must precede rollout after active attempts are drained. No shared database was changed and no deployment was performed.
