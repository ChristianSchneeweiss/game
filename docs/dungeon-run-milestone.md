# A complete forest dungeon run

Implemented 10 September 2026, following the [biome presentation milestone](biome-encounter-milestone.md).

## Player flow

The Dungeons page opens the same preparation screen for all six dungeons. Each entry passes its dungeon key, and the screen uses that dungeon's name, description, waves, and party limit. Players choose their party, inspect resources and passives, and equip or remove owned spells before entering. Party selection survives refresh in the URL. Entering waits for pending spell changes to finish. The former entry dialog was removed when preparation was unified on 11 September 2026.

The run page presents the five authored waves, the party's remaining health and mana, upcoming enemies, unclaimed item rewards, and one action to start or resume the current encounter. Live battles open in 3D with the existing Cards fallback. The result screen shows victory or defeat, survivor XP, collectable item drops, and the next action. Completed or defeated parties can return to preparation, change their spells, and enter a fresh run.

Hollowed Oakwarden now guarantees Nature's Embrace alongside its existing random spell drops. Every successful forest run therefore provides a spell to use in the next build. Other combat rules, wave compositions, and random drop rates remain unchanged. The new reward display does not claim to credit a gold balance; the existing loot system has no gold-wallet operation.

## Persistence and reliability

- Run and battle context come from the server and are restricted to the creator or a participating character's owner. Reward lists contain only the current user's bundles.
- The active battle ID survives reload. Completed attempts are ordered explicitly; result pages wait for completion processing before displaying XP and rewards.
- Health and mana carry between waves. Defeat keeps the failed wave and fallen party, prevents starting another battle with no living characters, and offers a fresh expedition.
- Empty or duplicate parties are rejected. Spell changes validate ownership, serialize against the character row, and enforce the four-slot limit. Collecting a reward locks its row to prevent duplicate claims.
- Recorded replay uses the original battle snapshot, including its original spell loadout. Both 3D replay and the Cards timeline remain available.
- No database migration is required. A wallet-configuration import cycle exposed by direct route loading was removed.

## Verification

An authenticated browser session against the local development database completed the entire flow through normal controls:

1. Prepared Deshaun27 and Araceli_Schroeder7 and entered Trial of the Nature.
2. Won all five waves. Reloading during the first battle restored the current turn, enemy health, and spent mana. Party resources carried through subsequent waves.
3. Received 60, 55, 50, 50, and 100 XP per survivor, for 315 XP each across the run.
4. Reloaded the completed run and verified five cleared waves and the unclaimed Nature's Embrace reward.
5. Collected that reward, returned to the same party, removed Fleetfoot Gambit, equipped Nature's Embrace, and entered a new run with full starting resources and the new spell present.
6. Opened the first result directly, viewed its recorded 3D replay, and advanced the Cards replay to its final event. It retained Fleetfoot Gambit from the original snapshot and reproduced the saved final resources.

The completed local run is `yb3s0e01vtua`. The fresh run, left ready at wave one, is `oqhazyccod3u`. These are development records, not portable fixtures.

The 11 September preparation update was checked through all six catalog links: Avalanche Lair (2 waves), Crypt (4), Ashen (4), Nature (5), Storm (5), and Tides (5). Each opened the shared party and spellbook controls with its own configuration. Party selection and switching the spellbook between characters were also verified in Tides. The client TypeScript check passed. A fresh local React Doctor run reported existing file-level warnings but its maintainability checks failed, so it did not provide a complete regression comparison for this update.

Automated checks:

- Six new integration tests passed, with 83 assertions. The five-wave test uses real battle commands, snapshots, saved results, completion processing, reward collection, and spell equipment against PGlite using the project schema. A veteran fixture keeps progression assertions independent of combat balance.
- Additional cases cover defeat and restart, invalid parties, run/reward access, concurrent claims, spell ownership, and concurrent equipment requests exceeding four slots.
- Full battle suite: **538 passed, 3 failed**, compared with the unchanged baseline of 532 passed and the same 3 failed. The failures are the frozen restoration checks for `live-six-entity`, `live-milestone-2`, and `live-milestone-3` in `live-recordings.test.ts`.
- Client, server, and battle-test TypeScript checks passed.
- The final production Vite build passed with the existing large-chunk warning. The 3D battle module remains lazy loaded. Build output was written locally; nothing was deployed.
- Local React Doctor completed with scoring disabled and the same 28 diagnostics as the baseline, with no new diagnostics.
- `git diff --check` passed.

Useful commands from the repository root:

```sh
bun tests/battle/run.ts integration/dungeon-run.test.ts
bun run test:battle
bun run typecheck
bun run typecheck:battle
```

The flow lives in `apps/client/src/features/expedition/` and the dungeon/result routes. Server run context is in `apps/server/src/game-usecases/dungeon-run.ts`; progression tests are in `tests/battle/integration/dungeon-run.test.ts`.
