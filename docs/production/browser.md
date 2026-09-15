# Production browser qualification

Observed on 11 September 2026 using the **Codex in-app browser**, as requested. This is a partial local qualification, not a staging or production acceptance pass. Demonstrated results are in [release evidence](evidence.md); outstanding work is tracked in the [release checklist](checklist.md#authenticated-desktop-acceptance).

## Authenticated application

The operator started and signed into `http://localhost:3001`. The browser reported Chrome 152.0.0.0. Application screenshots used a 1514×844 viewport. The existing Worker3000 still uses the default Wrangler configuration and remote GAME KV with the existing local OrbStack `game` database. Checks in that environment were read-only; party selection and equipment previews only changed browser state/URL.

| Flow | Observed result |
| --- | --- |
| Six preparation pages | Avalanche 2 waves, Crypt 4, Ashen 4, Nature 5, Storm 5 and Tides 5 all opened with their own enemies and shared preparation. |
| Party / slots | One and two heroes were selectable. One-hero selection persisted in the URL after reload. Removing everyone showed a disabled Enter button. Full four-slot and empty zero-slot builds were visible; Basic Attack was separate. |
| Equipment preview | Previewing Iron Sword on the staff-equipped hero showed an explicit unequipped preview; Cancel restored Oakwarden Staff and Int Armor. No equipment mutation was sent. |
| Baseline saved run | `q87wofzc9fpi` retained its Patrol/Shrine fork, visible future offers, 200 HP / 99 MP and 100 HP / 34 MP. Full-health shrine recovery was disabled; mana recovery described capped gains. |
| Another saved map | `9pf0aibjve8d` showed four waves cleared, the chosen vault/shrine/elite history, and a three-choice final fork. No choice or claim was submitted. |
| Durable result | `nuiiilvcad1x` retained victory, both survivors, +60 XP each and no unclaimed run reward. |
| Replay | Saved starting resources appeared at event 0/34. Cards displayed disabled command controls. Tab moved focus from Cards to 3D Battlefield; Enter returned to 3D. Reduced motion plus Skip visuals reached event 34/34 with both golems fallen and the saved party resources. |
| Inventory | Owned equipment, spells, passives and loot pages loaded. The legacy wallet path has been removed from character creation. No grants/claims were submitted during these checks. |

Screenshots were captured in the task. The local IDs above identify observed evidence, not portable fixtures. These reads do not establish new battle submission, equip/claim persistence, a newly completed five-wave run, stale-action rejection, reconnect, two-account permissions, or unchanged replay after changing a current build. Automated regression and PostgreSQL evidence cover parts of those contracts, but the final browser checks remain outstanding.

## Production-mode six-actor measurement

Device: MacBookPro18,2, Apple M1 Max, 10 CPU cores, 32 GiB memory. Browser: Codex in-app browser, Chrome/152.0.0.0. Fixed measurement viewport: **1280×720**. The user-agent compatibility OS string was not treated as an exact macOS version.

A separate temporary gallery was built with locked Vite 7.3.1 and React 19.2.3 in real production mode. Only the existing gallery entry's mount guard was enabled in memory; application source hashes were verified unchanged. There was no global development-mode override or injected authentication. [Harness provenance](evidence/qa-harness.json) records source hashes. The gallery is excluded from the shipped artifact.

The Tides showcase uses saved server-command events and its existing development party configuration. It renders two heroes and four enemies, including casts, healing/effects, hit reactions and death. Measurements came from the gallery's visible renderer/performance panel. The collector retains rolling samples up to 1,800 frames, so reported percentiles are not an all-frame trace of the entire 991-event recording.

| Measurement | Observed | Device-specific budget | Result |
| --- | --- | --- | --- |
| First local-origin controls ready | 132.6 ms | ≤500 ms | Pass |
| First local-origin models ready | 402.3 ms | ≤1,000 ms | Pass |
| Three required GLB payloads | 1,025,292 bytes; 1,026,192 transferred | ≤1,100,000 payload bytes | Pass |
| Clean 4× playback sample | p50 16.6 ms / p95 23.5 ms; max 33.1 ms | p50 ≤20 ms / p95 ≤33.3 ms | Pass |
| Four repeated starting-scene entries | 125 draw calls, 64,558 triangles; 70/67/67/70 geometries, 20 textures each | ≤70 idle geometries / ≤20 textures | Pass |

The limits were selected from this declared device cohort and evaluated against the recorded values; [measurement data and budget result](evidence/browser-performance.json) preserve that comparison. They must be remeasured when changing the renderer/assets, and are not an automated cross-device performance CI gate. During effects, geometry counts briefly reached 71 and returned to their idle level. Cached remounts transferred 300 bytes per model validation response.

The six actor labels, current actor, inspector, health values and fallen pose remained readable in screenshots. A separate run overlapped full builds/tests and a viewport resize to 1514×844; it reached p95 51 ms / maximum 715.6 ms. That contaminated sample is retained as a limitation, not counted as a fixed-viewport pass. One later remount lost assets because the temporary preview process had stopped; restoring that same static preview resolved it. Per-renderer counts do **not** prove that retired renderers, total process memory or GPU allocations were reclaimed.

## Failure and accessibility checks

The existing development gallery at localhost:3001 was used for fault controls, which are correctly disabled in production code. Missing hero GLBs produced simple body fallbacks while labels, resources, inspector, timeline and Cards remained usable. A simulated graphics initialization error displayed “Graphics unavailable” and “Continue with Cards” while keeping replay controls available. This is injected initialization-failure coverage, not a real browser WebGL context-loss test.

The authenticated result also opened with the development graphics-failure flag: clicking Continue with Cards recovered into the real Cards view at step 0/34, with saved resources and all command controls disabled. The normal result provided the Cards ↔ 3D keyboard evidence above. Gallery Cards callbacks have a different mount-control purpose and are not counted as proof of the application's Cards view. The accessibility tree always includes static canvas fallback text, even when the scene renders; screenshots and renderer metrics, rather than that text, establish WebGL capability.

## Remaining acceptance requirements

Complete the [authenticated desktop and staging checks](checklist.md#authenticated-desktop-acceptance) before marking browser acceptance complete. The observations above cover read-only saved flows and local renderer measurements; live mutations, recovery, a new full run, the second engine, process/GPU memory and actual context loss still need recorded proof.
