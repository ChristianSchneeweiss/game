# Enemy model collection

Created 2026-09-10. [Open the local animated gallery](http://127.0.0.1:3001/dev/enemy-models.html).

The collection maps all **22 enemy types** to **16 model files**: 14 downloaded animated bases and two original animated drafts. Related enemies share a base. These are integrated art bases, with the remaining identity and animation work stated below; they are not final bespoke models for all 22 names. Live and recorded battles now select these models from each enemy's stable type.

The gallery lets you inspect each enemy's base, orbit/zoom, select animation clips, pause, and download its GLB. Every model is self-contained. Models are framed independently for inspection, so their gallery sizes are not gameplay scale decisions.

## Sources and licensing

- **Quaternius Ultimate Monsters:** Orc, Fish, Dragon, Dragon Evolved, Ghost and Ghost Skull. The [creator's page](https://quaternius.com/packs/ultimatemonsters.html) specifies CC0 and animated glTF models. Original Drive URLs, SHA-256 hashes and retained clips are in [source-manifest.json](../../apps/client/public/models/enemies-v1/source-manifest.json) and [build-report.json](../../apps/client/public/models/enemies-v1/build-report.json). The original downloaded license is preserved, including its mismatched “Ultimate Platformer Pack” heading; the Ultimate Monsters page independently establishes the pack's CC0 dedication.
- **KayKit Skeletons:** Minion, Warrior and Mage, from the [creator's official repository](https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Skeletons-1.0/tree/15b62b9bad122f72926c10fb14d622c73819fa54), pinned at `15b62b9bad122f72926c10fb14d622c73819fa54`. The [creator's listing](https://kaylousberg.itch.io/kaykit-skeletons) specifies CC0. The original license is beside the models.
- **Mesh2Motion:** spider and snake, from the [official repository](https://github.com/Mesh2Motion/mesh2motion-app/tree/2d3d1ff03247d9e7e830d1ae375653da4e2146e2), pinned at `2d3d1ff03247d9e7e830d1ae375653da4e2146e2`. Its [asset license](https://github.com/Mesh2Motion/mesh2motion-app/blob/2d3d1ff03247d9e7e830d1ae375653da4e2146e2/LICENSE-CC0.MD) is CC0. The animated files are under `static/animations`; the similarly named `static/models` files do not contain the rigs or clips.
- **Quaternius Animated Zombie:** downloaded FBX plus its palette texture from the [creator's CC0 pack](https://quaternius.com/packs/animatedzombie.html). Converted to GLB with the original texture. [Download provenance](zombie-downloads.json), [conversion report](../../apps/client/public/models/enemies-v1/fbx-report.json).
- **Tennessippi Free Treant Pack:** Tree01 and Tree02 from the [creator's CC0 listing](https://tennessippistudios.itch.io/treant-pack). Downloaded the free archive, converted its two FBX bodies, and embedded the original dark/light albedos. Archive SHA-256: `1fcddcbd1fbbc8ec84f6001b2192d22794a927c9be2a929457a537e908862cd8`. [Extracted file hashes](treant-files.json), [actual FBX stacks](fbx-inspection.json), [conversion report](../../apps/client/public/models/enemies-v1/fbx-report.json). The archive did not include a separate license document; the creator's page states CC0.
- **Original project assets:** Moss Golem and Water Elemental were constructed locally from original procedural geometry and authored transform animation. No third-party meshes, generated images or uploaded project files were used. These are project-owned drafts, not a new CC0 dedication. [Output hashes and clips](../../apps/client/public/models/enemies-v1/original-report.json).

## Complete enemy mapping

| Enemy | Model | Remaining identity / animation work |
| --- | --- | --- |
| Goblin | Quaternius Orc | Has a spiked club. Slim proportions and refine the crest for a goblin. |
| Skeleton Grunt | KayKit Minion | Simple weapon. |
| Rotting Corpse | Quaternius Zombie | Dungeon clothing; author hit/death reactions. |
| Wisp of Regret | Quaternius Ghost | Pale spectral material and a more wisp-like silhouette. |
| Ghoul Knight Ivern | KayKit Warrior | Battered sword, shield, distinctive crest. |
| Emberbound Revenant | KayKit Mage | Charred robes, ember fissures, chains; its stock wizard silhouette needs substantial adaptation. |
| Ashen Skeleton | KayKit Minion | Blackened bones, ember eyes, scorched equipment. |
| Lurking Flame Wraith | Quaternius Ghost Skull | Flame-shaped edges and orange emission. |
| Crypt Crawler | Mesh2Motion spider | Palette and battle-scale readability. |
| Moss-Covered Golem | **Original Moss Golem** | Art polish; five motions are authored. |
| Barkhide Shaman | Tennessippi Tree01 | Staff/caster silhouette; author cast and hit. |
| Hollowed Oakwarden | Tennessippi Tree02 | Hollow trunk, branch crown, boss details; author cast and hit. |
| Elder Treant | Tennessippi Tree01 | Older bark/moss details; author hit. |
| Thundermaw | Quaternius Dragon Evolved | Armored jaw, thorn carapace, storm treatment. |
| Thunder Drake | Quaternius Dragon Evolved | Storm palette and distinctive crest. |
| Sky Serpent | Mesh2Motion snake | Ground snake base: requires fins, a flying silhouette and airborne motion. |
| Storm Hatchling | Quaternius Dragon | Already used in the battle prototype; storm palette. |
| Skybolt Wyvern | Quaternius Dragon Evolved | Wing/forelimb remodeling for a true wyvern silhouette. |
| Commander Kelvaris | Quaternius Fish | Armor, crest, tidepiercer spear and matching weapon motion. |
| Fishfolk Shaman | Quaternius Fish | Coral staff, mantle and a native casting motion. |
| Fishfolk Scout | Quaternius Fish | Light spear/equipment and matching weapon motion. |
| Water Elemental | **Original Water Elemental** | Art polish; five motions are authored. |

The Quaternius “Goleling” candidates were rejected after visual inspection: despite the name, they depict a flying creature, not a stone golem. The original Moss Golem replaces that candidate.

## Animation and conversion notes

The original golem and elemental each contain **Idle, Attack, Cast, Hit, Death**. They animate rigid parts through node transforms, which is appropriate to separated stones and a stylized water body. They do not contain a skinned skeleton.

KayKit exports retain idle, melee/unarmed attack, casting, hit and death. Ultimate Monsters exports retain idle, attacks, hit and death; their generic punches are not bespoke spell casts. The spider has native attack/bite/hit/death/idle/walk; the snake has bite/death/hit/idle.

The zombie's actual source contains bite, crawl, idle, run and walk, with no hit or death. This collection retains bite, idle and walk. Treants have three attacks, three deaths, idle, dance, run and taunt; this collection retains attacks, deaths, idle and taunt. No cast/hit clips were found. The gallery does not rename stock motions to imply missing actions are authored.

FBX conversion uses Three.js's loader/exporter, maps source albedos to standard materials, and flips texture V coordinates to preserve the original FBX texture orientation. Treant albedos are resized to 512 pixels; the zombie palette is unchanged. Normal/detail masks are omitted. The loader keeps and normalizes the four strongest skin weights where a vertex has more than four; converted idle and death poses have been visually checked in the battle arena.

The 16 shipped GLBs total **7,052,560 bytes** (7.05 MB), down from 16.56 MB. Texture resizing and vertex welding reduced the two treants from 11.4 MB to 1.88 MB combined. Other imported models have redundant animation keys removed and unused clips pruned. None require an external compression decoder.

## Reproduction

From the repository root, with dependencies installed:

```sh
bun scripts/prepare-enemy-models.ts /path/to/gltf-sources
bun scripts/convert-enemy-fbx.ts /path/to/fbx-sources
bun scripts/create-water-elemental.ts
bun scripts/create-moss-golem.ts
bun scripts/prepare-enemy-placement.ts
```

The glTF source directory needs the files and a `sources.json` copied from [source-manifest.json](../../apps/client/public/models/enemies-v1/source-manifest.json). Download URLs and expected hashes are included. For FBX, preserve the archive-relative paths documented in [treant-files.json](treant-files.json), and place `Zombie.fbx` / `ZombieTexture.png` alongside the extracted `Treant Package` directory. FBX hashes are checked by the conversion script. Generator scripts and their exporter helper are in `scripts/`.

Models and provenance live under `apps/client/public/models/enemies-v1/` and are copied into production builds. The gallery remains a development entry point.

## Battle integration

The exhaustive `enemy-miniatures.ts` registry covers the shared game's 22 enemy types. Party members retain the Knight. Missing or unknown types in old recordings retain the previous Dragon fallback; display names never determine a model.

Each battle fetches only its distinct model URLs. Actors share geometry/materials, with independent cloned skeletons and animation mixers. The cache retains assets while a scene owns them, ignores late results after a lineup change, and disposes geometry/materials/textures once its last owner leaves.

`prepare-enemy-placement.ts` measures 16 samples across each idle cycle and the end of its native death clip. The generated placement manifest normalizes height and footprint and grounds settled deaths without scanning skinned vertices during play. Regenerate it whenever a GLB changes; tests check each file's SHA-256 against those measurements.

Native clips map to idle, attack, cast/heal, hit and death. Generic stock punch/taunt motions stand in for casts where appropriate. Zombie death uses a procedural topple; zombie/treant hits use a small recoil. Missing unexpected clips retain an idle pose and show an asset notice. Reduced motion and replay seeking settle deaths immediately.

[Open the battle art preview](http://127.0.0.1:3001/dev/battle-replay.html?lineup=2) to cycle six mixed lineups covering the complete roster. This development-only selector replaces displayed enemy identities in the existing recording; recorded actions and combat results stay the same.

See [the supplementary source research](../archive/prototype/enemy-model-alternatives.md) for other candidates and acquisition details. The mapping in this document supersedes that research's earlier fishfolk/golem gaps.

## Verification

- Client/server TypeScript checks and a production Vite bundle build pass. All 16 enemy GLBs are included under `models/enemies-v1/`. Existing bundle-size warnings remain. The standard Doppler build wrapper could not read its keyring token in this shell; Vite was run directly into a temporary directory without deploying.
- [Khronos glTF validation](validation.json): 16 GLBs, **0 errors**, 41 warnings. Warnings concern imported skin hierarchy/local transforms and source PNG metadata/dimensions. Both original models have zero warnings. They are retained as review caveats, not silently described as clean production imports.
- Initial collection [gallery smoke check](gallery-smoke.json): all 22 roster entries loaded and all **133 available animation selections** worked, with no browser errors. Search correctly narrows to the four coastal enemies and clearing restores the full list. This checks loading and clip selection, not a frame-by-frame certification of every deformation.
- Visual inspection rejected the misleading Goleling candidate, corrected FBX texture orientation, and adjusted gallery framing over the idle cycle so flying wings clear the pedestal.

- Battle tests cover roster completeness, unknown-type fallback, required native clips, independent animation instances, repeated attacks, measured bounds, cache ownership, stale requests and isolated load failures, alongside existing combat/presentation checks.
- [Battle browser check](battle-smoke.json): all 22 enemy assignments loaded across six lineups with no browser errors. Full 4× playback and reduced-motion seeking preserve the recorded final state.
- React Doctor remains at its prior 63/100 score; pre-existing diagnostics are outside this asset integration.

Collection previews: [original golem](screenshots/golem-preview.png), [original water elemental](screenshots/water-preview.png), [fishfolk base](screenshots/fishfolk-preview.png), [treant base](screenshots/treant-preview.png).
