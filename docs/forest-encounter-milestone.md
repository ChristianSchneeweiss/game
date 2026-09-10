# Forest encounter presentation

Implemented 10 September 2026. This is the first encounter identity and spell-effects slice. It changes the client presentation; it does not change combat rules or dungeon composition.

## What is included

- Forest rosters use a mossy clearing with an outer canopy, roots, scattered stones, warm key light, teal rim light, and restrained fireflies. The Oakwarden has its own encounter title. Mixed or unidentified rosters retain the court.
- Amber and teal cape/shield colors distinguish party members. Color assignment stays stable if the participant array is reordered. These are cosmetic colors, not equipped-item or class claims.
- The Barkhide Shaman carries a seed staff; the Elder Treant wears foliage; the Oakwarden has a branching crown. Adornments follow each model's actual bones. Newly created materials and geometry belong to that instance and are disposed separately from the shared GLB cache.
- Rootgrasp grows curling roots, Stone Bark raises bark panels, Splinter Shot sends wooden shards, Nature's Embrace and Single Heal use rising leaves, Verdant Smite uses descending leaf blades, Crushing Blow and Earthshatter scatter stone, and Festering Blow uses a venom effect.
- Effects use the existing replay's resolved targets and impact timing. Pause, seek, speed, reduced motion, native model animations, legal target controls, and Cards fallback retain their existing behavior.

## Preview

Run the client development server, then open:

`http://127.0.0.1:3001/dev/battle-replay.html?encounter=forest`

The **Recording** selector switches between the original encounter and **Forest spell showcase**. **Jump to spell** plays a recorded cast; **Hold at impact** pauses it for visual review.

The showcase is deliberately assembled from the four forest enemy archetypes and a party with development health/mana. It is not a configured dungeon wave. Its 80 commands and 1,057 events were resolved by the real battle-command functions. No event results are rewritten for presentation. Regenerate with:

```sh
bun tests/battle/record-forest.ts
```

Crypt, ashen, storm, and tides are covered by the subsequent [biome presentation milestone](biome-encounter-milestone.md). Character appearance is currently cosmetic; equipment-driven models are not part of this slice.

## Verification

- Client TypeScript check and production Vite build passed. Vite still reports its existing large-chunk warning.
- Seven new tests cover roster fallback, stable party identity, real GLB material isolation, rig-following adornments, repeated resource cleanup, and nature effects on recorded target IDs.
- All 56 focused asset, model-loading, playback, and presentation tests passed.
- Full battle suite: 521 passed, 3 failed. Before this work: 514 passed, the same 3 failed. The unchanged failures are frozen restoration checks in `live-recordings.test.ts` for `live-six-entity`, `live-milestone-2`, and `live-milestone-3` during concurrent combat-engine changes.
- React Doctor, including untracked source files: 66/100 and 28 existing diagnostics; baseline 63/100 and 30 diagnostics. No remaining new diagnostics in the forest modules.
- Browser inspection covered the assembled forest roster, bark shields, curling roots on two targets, verdant blades, splinters, stone impacts, and healing leaves. The complete 1,057-event replay finished at 4× with reduced motion. Unmount/remount returned from zero to one canvas without a renderer error.
- Local browser samples were around 16.7 ms median frame time. One normal-playback sample had 20 ms p95; the longer mixed verification session including accelerated playback reached 26.5 ms p95. These are local development measurements, not a device performance certification.
- The browser reported no application errors. The existing React Three Fiber / Three.js clock-deprecation warning remains.

The implementation is in the battle presentation directory. The arena, appearance dressing, and nature spell geometry are separate modules so another biome can reuse the existing combat presentation without changing game events.
