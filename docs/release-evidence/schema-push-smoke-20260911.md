# Local smoke after the schema push

Date: 11 September 2026. Result: **the local player loop passed after the operator reported pushing the schema**. This is focused application evidence, not a schema fingerprint check or hosted release qualification.

## Environment and source

- Branch `codex/production-v1`, HEAD `ed438036352d71c1b2b75b99453d80081599ee5a`, with the working-tree changes identified below.
- Existing Doppler `dev` configuration: database host `0.0.0.0`, database `game`, Clerk test instance. Credentials were not recorded. The existing database was used; no database was wiped or provisioned for this smoke.
- Vite at `http://localhost:3001`, Wrangler 4.60.0 at `http://localhost:3000`, one authenticated account in the Codex in-app browser.
- Wrangler reported local `BattleWebsocket`, `BattleChat`, `battle-done-workflow`, and `GAME` KV bindings. It warned that `experimental_remote` was unrecognized. The older release evidence's remote-KV description does not describe this session.
- Node 22.19.0 and installed Bun 1.4.2. Bun differs from the repository's 1.4.0 pin; this was not a full `release:check` run.
- The operator owns the schema push and intends to reuse existing infrastructure. This session did not execute another schema push, create infrastructure, or deploy a Worker.

## Browser observations

The checks used normal application controls and the real local application protocol. The new character `tyfbhe6dva2r` was named **Schema QA Sep 11**. Other characters' equipment and spells were not changed.

| Check | Observed result |
| --- | --- |
| Create, rename, and prepare | Character creation and rename saved. An empty party disabled entry. Selecting only the new character and equipping an unused Iron Sword persisted after reload; pending equipment changes disabled entry. |
| Live cast and reconnect | Battle `8372rao4jol4` in run `l9p0viin04xp` accepted Basic Attack. Reload after the first committed action restored round 2 and 90 HP without submitting the action again. Battle and chat WebSockets returned 101. |
| Defeat and restart | The first attempt ended in defeat at 0 HP after 12 rounds. Its saved result showed +0 XP. “Equip & run again” restored the fresh preparation to 100 HP / 50 MP. |
| Change spell slots | Equipped unused Cinder Wisp, Fireball, Nature's Embrace, and Vital Strike sequentially, checking 0 through 4 occupied slots and entry disabled during pending updates. |
| First-wave victory | Run `wskhydgb1dxv`, battle `i35neexl5ejq`, started with the four equipped spells. Victory persisted 84 HP / 24 MP and +10 XP. Armor Up was collected; reload showed no unclaimed rewards. |
| Saved route and shrine | The Patrol, Elite encounter, and Resting shrine offers survived reload. Choosing Restore mana saved +20 MP, changing the map's party resources from 84 HP / 24 MP to 84 HP / 44 MP. The chosen shrine and confirmation were displayed before wave 2 became available. |
| Second wave and expedition completion | Battle `goxkfn2cihh4` opened with the selected build; its first controllable turn displayed 89 HP / 46 MP. Explicit enemy targeting and cooldown gating worked during casts. Both enemies were defeated in round 8; the saved result showed **2/2 waves cleared**, **66 HP / 10 MP**, and **+30 XP** for this battle. |
| Final reward persistence | The completed expedition offered Splinter Shot and Int Armor alongside the run's Armor Up reward. Collection completed. Reload preserved the finished expedition, 66 HP / 10 MP, +30 XP, and “No unclaimed rewards.” |
| Completion delivery | Local Worker logs recorded `battle.delivery_complete` and successful completion workflow messages for the defeat and both victories. The final battle completed at revision 59. |

The live 3D scene rendered during the smoke. Its accessibility tree also contains static “WebGL is unavailable” fallback text; that text alone is not evidence of rendering failure.

## API issue reproduced and fixed

Entering an active battle queried `getBattle` before a saved result existed. The absent row raised a generic exception, producing HTTP 500 even though live combat continued. A regression test reproduced this through the real tRPC HTTP adapter.

`bmStorage.get` now throws `BattleResultNotFoundError` for an absent row. The public `getBattle` route maps only that error to `NOT_FOUND` / HTTP 404. Database and saved-data parsing errors remain HTTP 500. Successful public replay data and the storage method's non-null return contract remain unchanged.

After the fix, the local Worker returned **404** for the active final battle; battle/chat connections still returned **101**, casting succeeded, and the finished result subsequently loaded successfully. Independent review found no actionable issues in this narrow change.

## Focused verification

Commands ran from the repository root with the installed Bun runtime and synthetic isolated test databases:

| Command | Result |
| --- | --- |
| `bun --no-env-file tests/battle/run.ts integration/battle-result-api.test.ts integration/durable.test.ts` | 12 pass, 0 fail, 37 assertions across 2 files. Includes missing result, anonymous replay, database failure, malformed saved data, and protected durable behavior. |
| `bun --no-env-file tests/battle/run.ts integration/battle-result-api.test.ts` | Final rerun after test typing cleanup: 4 pass, 0 fail, 8 assertions. |
| `bun --no-env-file tests/battle/run.ts integration/server-security-boundary.test.ts` | Earlier in this session: 9 pass, 0 fail, 54 assertions. |
| `bun --no-env-file run --bun tsc --noEmit -p apps/server` | Pass. |
| `bun --no-env-file scripts/release-protected.ts` | All 34 historical files byte-identical to `3835a6098bd0081e5ac942ae78557a1edf4ae51c`. |
| `bun --no-env-file run --bun tsc --noEmit -p tests/battle` | One remaining TS2769 diagnostic at `integration/server-security-boundary.test.ts:183:45`, in the pre-existing uncommitted JSON assertion. No diagnostic in the new regression test. The existing file was left untouched. |
| `git diff --check` | Pass. |

The earlier Doppler command repair in `apps/server/package.json` was also present: database push/studio commands use injected environment variables, disable implicit `.env` reads, and force the installed Drizzle CLI to run under Bun. This avoids the shared `.env` FIFO collision and accidental Node 10 execution. Push/studio help commands were checked before the operator performed the push.

## Working-tree identity

These hashes identify application/configuration/test contents for this smoke without implying a new committed release candidate:

| File | SHA-256 |
| --- | --- |
| `apps/server/package.json` | `d073e75786ca61460745c14fe683ea5ba0458363a7b05442c635529719d153c3` |
| `apps/server/src/game-usecases/bm-storage.ts` | `7e342d4fe11bdfbbe3d763679d31e22709f0f3e04aebae117737d8fda0fc83dc` |
| `apps/server/src/routers/index.ts` | `24d104b59c5ec3959f16c7366173d8f1d85cae76ddac1f2f3f1bc34de62bddb8` |
| `tests/battle/integration/battle-result-api.test.ts` | `0572732e9897440dcb0783f0e4f9ce9bafd26c11e98efdfdff69c05ac77fda37` |
| `apps/server/wrangler.jsonc` (pre-existing edit) | `686fa8fa1997dec691cd12ed3900249c02de60eb1731d802f4f329bfcc2df84a` |
| `tests/battle/integration/server-security-boundary.test.ts` (pre-existing edit) | `8fbe718496b0cf04dac33bb540b1ad86073eead8fba69266c1b460aca98d9ca0` |

## Scope remaining

This session used one authenticated account and a new two-wave Avalanche Lair run. It does not establish the target database's version/schema fingerprint, two-account authorization, five-wave completion, all route variants and retry cases, frozen replay after build changes, hosted Cloudflare recovery, production assets, browser performance, or remote CI. Existing release checklist items remain open where they require those broader checks.

The QA character, completed runs, equipment choices, earned XP, and claimed rewards remain in the local development database. Temporary client and Worker processes were stopped after verification.
