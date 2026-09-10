# Crypt, ashen, storm, and tides presentation

Implemented 10 September 2026, continuing the [forest presentation milestone](forest-encounter-milestone.md). All five authored dungeon families now have encounter scenery and matching interface colors. This slice changes presentation and adds development recordings; combat rules and authored dungeon waves are unchanged.

## Included

| Family | Arena | Signature presentation |
| --- | --- | --- |
| Crypt | Slate floor, vaulted ruins, ghost lamps | Vital Strike drain and caster restoration |
| Ashen | Broken basalt paving, ember seams, pillars and braziers | Fire projectiles, Cinderbrand, Charred Chains, Soulflare |
| Storm | Cliff platform, broken arches and suspended crystals | Connected lightning bolts, Volt Lash, Storm Pulse arcs |
| Tides | Sandstone paving, coral, flooded ruins and gentle water ripples | Water waves, Torrent Spiral, Tidepiercer Thrust, restoration |

- Encounter selection uses the actual enemy roster, with boss-specific titles. Tests cover every configured wave in all five dungeons. Mixed or unidentified rosters retain the original court. This identifies an art family, not dungeon progress.
- Nine enemy appearances add independent material tints while retaining the original texture atlases. The fishfolk shaman carries a pearl-and-coral staff; Kelvaris, Thundermaw, and the Revenant gain distinct crests. Attachments follow the loaded model's bones. Cleanup disposes only instance-owned resources.
- Eleven additional effect families cover fire, brand, chains, soul, drain, lightning, storm, water, torrent, tide spear, and restoration. The existing nature effects remain available.
- Effects follow resolved event targets and existing impact timing. A lifesteal recipient gets restoration when the event records healing without damage on that entity. Reflected damage still appears on its actual recipient.
- Pause, seeking, playback speed, reduced motion, target selection, model animation, and Cards fallback use the existing presentation controls. Lightning uses a steady discharge without flashing. Static scenery shares instanced geometry; ambient animation follows playback speed and reduced motion.

## Preview and recordings

Start the client development server and open:

`http://127.0.0.1:3001/dev/battle-replay.html?encounter=tides`

Use **Recording** to choose Crypt, Ashen, Storm, or Tides. **Jump to spell** plays a recorded cast; **Hold at impact** pauses it for visual inspection. The original and forest recordings remain available.

The showcases assemble each family's enemy archetypes with development party health and mana. They are not configured dungeon waves. Real battle-command functions resolve all events; the presentation does not rewrite the results.

| Recording | Player commands | Events |
| --- | ---: | ---: |
| Crypt | 77 | 609 |
| Ashen | 66 | 528 |
| Storm | 39 | 364 |
| Tides | 120 | 991 |

Regenerate the four development recordings with `bun tests/battle/record-biomes.ts`. The shared recorder advances opening enemy turns before issuing authenticated player commands. These fixtures are imported only by the development preview.

## Verification

- Client TypeScript and the separate test/recorder TypeScript check passed. Production Vite build passed with the existing large-chunk warning.
- Eleven new tests cover all authored wave-to-arena mappings, each recording's final health/mana/death state, effect selection and healing targets, cloned material isolation, bone-following attachments, and three repeated cleanup cycles on actual GLB models.
- All 67 focused asset, model-loading, playback, and presentation tests passed.
- Full battle suite: 532 passed and 3 failed. Baseline: 521 passed and the same 3 failed. The unchanged failures are frozen restoration checks for `live-six-entity`, `live-milestone-2`, and `live-milestone-3` in `live-recordings.test.ts`, alongside concurrent combat-engine changes.
- Local React Doctor checked 50 changed/untracked client files and reported the same 28 diagnostics as the 42-file baseline, with no new diagnostics in the biome modules. An external numeric-score request was blocked by automatic approval review because it would send project scan information to the scoring service; the local checks completed with scoring disabled.
- Browser inspection verified the four arenas, boss crests, fishfolk staff, fire and chain effects, soul/lifesteal restoration, connected lightning bolts and storm arcs, tidal rings and healing.
- All four complete replays finished at 4× with reduced motion: crypt 609/609 events, ashen 528/528, storm 364/364, and tides 991/991. Unmount/remount returned from zero to one canvas, with no browser application errors.
- The local tidal session measured 16.7 ms median / 17.8 ms p95 across its final 1,800 frames. During accelerated playback it measured 16.4 ms median / 26.2 ms p95, including spells, effect triggers/removals, and deaths. These are development measurements on the current machine.

The main modules live in `apps/client/src/routes/battle/-presentation/`: encounter selection, shared arena primitives, four arena components, elemental feedback/shapes, and enemy adornments. Future equipment appearance and dungeon navigation are separate work.
