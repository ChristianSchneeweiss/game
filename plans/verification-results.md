# Battle repairs: verification results

Verified on 10 September 2026 against the unchanged suite committed in `3835a60`. Application changes implement tasks 001–007; no test, recording, mock, runner or package file was changed during the fixes.

## Results

| Check | Result |
| --- | --- |
| `bun run test:battle` | 514 pass, 3 fail; 517 tests across 19 files; exit 1 |
| Audit regression tests added in `3835a60` | 435 pass, 0 fail |
| Earlier baseline tests | 79 pass, 3 historical resimulation failures |
| Authored encounters | 300 pass, 0 fail (previously 177 pass, 123 fail) |
| Spell sweep | All 39 spells pass over 2,496 deterministic scenarios |
| Passive combinations | All 11 matrix entries pass over 429 spell/passive combinations |
| Enemy action availability | 22 pass |
| Cast / effect / turn rules | 12 / 24 / 6 pass |
| Mounted client / dungeon / durable integration | 3 / 10 / 8 pass |
| `bun run typecheck` | Pass: client and server |
| `bun run typecheck:battle` | Pass |
| React Doctor comparison with `3835a60` | No new correctness diagnostics; two low-impact repeated-property-access hints. Final branch score: 63/100 |
| `git diff --check` | Pass |
| `git diff -- tests` | Empty |

Expected injected storage, SQL and workflow failures appear in integration output; their recovery assertions pass. These are deliberate fault-injection messages, not unhandled test failures.

The final full-suite run and both typecheck commands were repeated after removing the temporary legacy-simulator integration. The results above reflect that final application state.

## Historical recordings

`live-six-entity`, `live-milestone-2` and `live-milestone-3` stop on stale command revisions when their old frozen builds are resimulated using corrected combat rules. The recorded fights depended on old stun behavior, continuing multi-hit attacks against dead targets, and Earthshatter failing to grant its advertised defense. Those changes alter later RNG use, events and outcomes.

A separate read-only playback check reduced every saved event in all four recordings and compared every participant’s final health, mana and death state with the persisted result. All four matched. The user explicitly accepted breaking old replay resimulations on 10 September 2026. Reproducing the previous engine's outcomes is outside the completed scope; no legacy simulator is included. The recordings and their assertions remain unchanged and failing visibly.

This accepted exception applies only to those three historical resimulation assertions. The test-addition steps in the original plans were superseded by the user's instruction to leave all test files unchanged.

## Additional local checks

These checks were performed without adding or editing test files:

- Two independent PostgreSQL connections ran 10 overlapping dungeon-start trials. Each trial produced one accepted attempt and one persisted battle ID. This supplements the single-connection PGlite integration suite; it does not claim to exercise every production isolation configuration.
- Dungeon creators and participating character owners can start a battle. An unrelated owner receives `FORBIDDEN`, and the transaction leaves no active claim or attempt behind.
- The exact manual migration succeeded on a prior-schema database with a historical result and marked that attempt complete. It rejected active battles, duplicate attempt IDs, duplicate reward identities and missing results. Each rejected run rolled back without adding the new columns.
- Final Verdict executed at 9.9% and 10% health and dealt ordinary damage at 10.1%.
- A 30-damage hit into two 10-point shields consumed both shields and removed 10 HP. The baseline skipped the second shield after removing the first.
- All four old recordings still render to their saved final health, mana and death state.
- Two simultaneous commands using the same revision produced one committed command and one rejection, with identical state and RNG after cold reconstruction.
- A failed completion workflow recovered through `alarm()` without setup or reconnection; repeating the alarm did not duplicate delivery. A lost workflow-creation response was resolved by confirming the existing workflow instance.
- The delivery helper committed journal, obligation and alarm through one storage transaction. An injected transaction failure rolled all three back; repeated scheduling preserved the existing alarm, and completed delivery removed it. This used an external storage substitute, not a deployed Cloudflare runtime.

## Rollout boundary

The migration is prepared under `apps/server/migrations/manual/`. It has not been applied to a shared database. Drain active attempts and pause starts/completion during the schema/application cutover, following its README. The corrections change combat outcomes; an in-progress journal from the previous engine must not be silently replayed under new rules.

No deployment, shared database mutation, commit or push was performed for these fixes.
