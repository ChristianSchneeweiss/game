# Enemy model alternatives

> Archived reference. Observations, proposed work and source paths describe the original dated snapshot. Use the [release checklist](../../release-checklist.md) for current requirements.

Researched 2026-09-10. This supplement covers sources outside Quaternius Ultimate Monsters and KayKit Skeletons. It is an asset shortlist, not an import or visual approval. **Ready** means the downloaded GLB contains a mesh, skin and useful combat clips; integration and visual review remain. **Adapt** means conversion, appearance changes or missing animations are required. **Build** means this search did not establish a suitable free animated asset for the exact enemy.

## Recommended coverage

| Enemy | Classification | Candidate and remaining work |
| --- | --- | --- |
| Goblin | **Adapt** | [CDmir/TinyWorlds — Goblin](https://opengameart.org/content/goblin-1): creator lists rigging and animation, CC0, packed-texture `goblin-FINAL.blend` (7.5 MB). Animation names and rig compatibility are unverified. Convert to GLB and review the look beside KayKit. A simpler alternative is [tbbk — Low Poly Goblin (Rigged)](https://opengameart.org/content/low-poly-goblin-rigged): CC0, Blend/FBX, **explicitly not animated**; supply/retarget every clip. |
| Rotting Corpse | **Adapt** | [Quaternius — Animated Zombie Pack](https://quaternius.com/packs/animatedzombie.html): two models, CC0, FBX/OBJ/Blend. Downloaded both FBX/Blend variants and texture; FBX inspection verifies Bite, Crawl, Idle, Run and Walk stacks. Hit/death animations and GLB conversion remain necessary. |
| Crypt Crawler | **Ready** | **Mesh2Motion spider**, linked and inspected below: 1,600 triangles, skinned GLB, actual Idle/Attack/Bite/Hit/Death/Walk clips. Best technical match found; inspect visual style and scale before adopting. |
| Moss-Covered Golem | **Build / Adapt static base** | [Joseph George — Rock Golem](https://blendswap.com/blend/8148): CC0, Blender source (151 KB); creator describes floating body parts, but does **not** establish a rig or animations. Requires rigging/animation, moss materials and GLB export. A new simple rock body on a shared humanoid rig may be more coherent. |
| Barkhide Shaman | **Adapt** | [Tennessippi — Free Treant Pack](https://tennessippistudios.itch.io/treant-pack): downloaded Tree01/Tree02 FBX/OBJ and textures; both FBX files contain a skin and ten animation stacks. Add a staff/caster silhouette, cast and hit animations, and GLB conversion. |
| Elder Treant | **Adapt** | Same Tennessippi pack; choose one body, use its attack/idle/death animations, and add age/moss details. Convert FBX to GLB. |
| Hollowed Oakwarden | **Adapt** | Same pack's other body, distinguished by hollow trunk, crown/branches and boss scale. These identity changes require mesh work; neither source model is claimed to already depict this enemy. |
| Fishfolk Scout, Fishfolk Shaman, Commander Kelvaris | **Build** | No suitable free low-poly animated fishfolk family was verified. [Teh_Bucket — Bek-Minch](https://opengameart.org/content/bek-minch) is a CC0 fish humanoid with Blend/FBX and a rig, but is 35k triangles and has no animation claim. It needs substantial simplification, animation and three role variants. Prefer one original fish biped on a shared humanoid rig, then vary fins, spear/staff and commander armor. |
| Water Elemental | **Build** | No free original-source model satisfying the style, license and animation requirements was established. Build a compact water body with a readable face/core and author idle, attack, cast, hit and death motions. A recolored solid monster alone will not establish the water silhouette. |
| Sky Serpent | **Adapt** | **Mesh2Motion snake**, linked and inspected below: 1,130 triangles, skinned GLB, actual Idle/Bite/Hit/Death clips. Requires a flying silhouette, sky colors, fins/horns and new airborne movement; the source is a ground snake. |

## Downloaded and inspected: Mesh2Motion

The creator publishes source models and animations, with its own art covered by [CC0](https://github.com/Mesh2Motion/mesh2motion-app/blob/2d3d1ff03247d9e7e830d1ae375653da4e2146e2/LICENSE-CC0.MD). The [April 2026 release notes](https://mesh2motion.org/news) announce spider and snake rigs. The two assets below were fetched at commit `2d3d1ff03247d9e7e830d1ae375653da4e2146e2` and their GLB JSON inspected. No animation playback or deformation QA has been performed.

| File | File evidence | Actual animation names |
| --- | --- | --- |
| [spider-animations.glb](https://raw.githubusercontent.com/Mesh2Motion/mesh2motion-app/2d3d1ff03247d9e7e830d1ae375653da4e2146e2/static/animations/spider-animations.glb) | 597,156 bytes; 1 mesh, 1 skin; 1,600 indexed triangles | Attack, Bite, Death, Death 2, Eating, Hit, Idle, Jump, Rest Pose, Walk |
| [snake-animations.glb](https://raw.githubusercontent.com/Mesh2Motion/mesh2motion-app/2d3d1ff03247d9e7e830d1ae375653da4e2146e2/static/animations/snake-animations.glb) | 359,604 bytes; 1 mesh, 1 skin; 1,130 indexed triangles | Bite, Coiled, Dance, Death, Hit, Idle, Rest Pose, Side winding |

Temporary local files:

- `/private/tmp/enemy-model-alternatives/spider-animations.glb` — SHA-256 `a321c1617c7f74cf86c050694bc254e74409c6c69db26fe542338f2f7c43d07a`
- `/private/tmp/enemy-model-alternatives/snake-animations.glb` — SHA-256 `795e4c62ba1e02f3f33e900832cdc6a1ca5a4aa4f6fe426fccd3aaa0f7f6ac25`
- `/private/tmp/enemy-model-alternatives/LICENSE-CC0.MD` — SHA-256 `52fec1c484df708c16b4c27b2bf0d7f0d3994105c57adc4b9e6f95bcfd9de65f`

Use the **`static/animations`** files above. The similarly named files under `static/models` were also inspected: they contain one mesh each but **no skins and no animations**. Neither inspected animated file contains a Cast clip. Rest Pose is not a gameplay action.

Mesh2Motion also offers an [open-source rigging/export workflow](https://mesh2motion.org/) with bundled GLB export and source Blender rigs. That is a possible adaptation tool, not evidence that an arbitrary imported mesh will deform correctly. No project assets were uploaded to it.

## Downloaded and inspected: Tennessippi treants

Retrieved through the creator's official free flow, with no payment or account: [purchase/download page](https://tennessippistudios.itch.io/treant-pack/purchase) → “No thanks” → upload **4907296**, `Treant Package.7z`. The resolved download request is a POST to `https://tennessippistudios.itch.io/treant-pack/file/4907296?source=game_download&after_download_lightbox=1&as_props=1`; its signed CDN URL is preserved in `/private/tmp/enemy-model-alternatives/treant-downloads.json` and may expire.

- Archive: `/private/tmp/enemy-model-alternatives/Treant-Package.7z`, **46,456,071 bytes**, SHA-256 `1fcddcbd1fbbc8ec84f6001b2192d22794a927c9be2a929457a537e908862cd8`.
- Extracted source: `/private/tmp/enemy-model-alternatives/Treant Package/`.
- Each of `Treant 1` and `Treant 2` contains one FBX, one OBJ/MTL pair, and six texture PNGs. The textures include light/dark albedos, normal and detail/mask maps. Full 18-file inventory and hashes: `/private/tmp/enemy-model-alternatives/treant-files.json`.
- **No separate license file** is included. The creator's CC0 declaration was verified on the [product page](https://tennessippistudios.itch.io/treant-pack), saved as `/private/tmp/enemy-model-alternatives/treant-creator-page.html`.

Binary FBX metadata was parsed without executing Blender scripts. Both files are FBX 7400 with one mesh geometry, one skin deformer and ten actual animation stacks. Their action suffixes are **Attack2, Attack3, Attack_1, Death1, Death2, Death3, Idle, River Dance, Run, Taunt** (prefixed `Tree01|` or `Tree02|`). Neither contains a Cast or Hit stack. This is file inspection, not playback/deformation QA.

| File relative to the extracted folder | Size | SHA-256 |
| --- | --- | --- |
| `Treant 1/Tree01_FBX.fbx` | 1,937,020 bytes | `bd90b4f8dd823334cbb226229ef731c1280ae601ab942d16193b96f5f674a02e` |
| `Treant 2/Tree02_FBX.fbx` | 2,104,764 bytes | `f7f5b4b015ee4df4088b438df80abdc923f1b9a5e430a12d5f069bc87e952293` |

Tree01 has 31 limb nodes; Tree02 has 33. Detailed inspection is saved in `/private/tmp/enemy-model-alternatives/fbx-inspection.json`. Conversion must preserve the separate animation stacks and reconnect textures; the OBJ files do not carry skeletal animation.

## Downloaded and inspected: Quaternius zombie

The [creator page](https://quaternius.com/packs/animatedzombie.html) links to [this public Google Drive folder](https://drive.google.com/drive/folders/1AfOPRgr5Gl8gll9KfGDEUSYq_Ag7yPJG). The pack is CC0 according to that page, whose downloaded HTML is preserved as `/private/tmp/enemy-model-alternatives/zombie-source.html`.

All files below are saved directly under `/private/tmp/enemy-model-alternatives/`. Direct URLs and hashes are also in `zombie-downloads.json` there.

| Download | Bytes | SHA-256 |
| --- | --- | --- |
| [Zombie.fbx](https://drive.usercontent.google.com/download?id=16vkB5Pj8Z3lIPAMrS5rTN3Yt5OzjEyN0&export=download) | 1,573,820 | `203d76f29b12c58529ab6bdf8d3b414b869e9858b2c25f9f9ea5f161ae90349e` |
| [ZombieSmooth.fbx](https://drive.usercontent.google.com/download?id=1NihcY_3MZhA5SYuyC16n7ICQ9vB1Rq2z&export=download) | 1,568,892 | `729b230ef7e91403196fa3baed17f722d1fc7d2a9b105c0ba20f9d6349238497` |
| [Zombie.blend](https://drive.usercontent.google.com/download?id=1on9MAJjWv3Mfu-7N9AAtT2ZFBSJu6Uus&export=download) | 19,464,224 | `ccba2b762dcbf22108c4bf6d13a0eabb01f9fe8fd68a6614c723367e7d75bbc8` |
| [ZombieSmooth.blend](https://drive.usercontent.google.com/download?id=1C7N1EADKkEpSQVpY9QFesECHkU71Qnkp&export=download) | 19,464,128 | `5d3725b335efe60cd2f7109de75c2d264f6586a46b687534a5ce73775fbc3dd4` |
| [ZombieTexture.png](https://drive.usercontent.google.com/download?id=1NSJdgIIwWOXsrUzCz_c_QR05cI9y3W9H&export=download) | 211 | `43e4bb1aea01e85dddc02000094c07250fbb07ffcb796aa18805cfb5d368e801` |

Both FBX files are FBX 7400 and contain one mesh geometry, one skin deformer, 48 limb nodes and five actual animation stacks: **Zombie\|ZombieBite, Zombie\|ZombieCrawl, Zombie\|ZombieIdle, Zombie\|ZombieRun, Zombie\|ZombieWalk**. Neither contains Hit, Death or Cast. The Blender source files were downloaded but not opened; no Blender executable was available at inspection time. Detailed FBX metadata is in `fbx-inspection.json` beside the files. Visual playback and GLB conversion remain unverified.

## Other candidate evidence

- **Tennessippi Free Treant Pack:** the creator lists Tree01 at 5,438 triangles and Tree02 at 7,340, each with light/dark variants. Those triangle counts remain creator claims; actual filenames and animation-stack spelling are recorded from the downloaded files above. [Source](https://tennessippistudios.itch.io/treant-pack).
- **br-n518 Spider:** useful smaller fallback: 222 triangles, 256×256 texture, CC0, `spider.blend` (784 KB). Creator lists Idle, Walk and Attack; hit/death are missing from the list. Requires Blender conversion and added reactions. [Source](https://opengameart.org/node/86785).
- **Kenney Animated Characters Retro:** its official archive was read in memory (706,472 bytes). It contains `Model/characterMedium.fbx`, zombie male/female PNG skins, and only `Animations/idle.fbx`, `jump.fbx`, `run.fbx`. Its included license explicitly permits commercial use under CC0. This is a corpse modeling fallback requiring combat animations and conversion, not a complete zombie combat set. These are inspected archive filenames, not inspected animation tracks. [Creator page](https://kenney.nl/assets/animated-characters-retro), [archive](https://kenney.nl/media/pages/assets/animated-characters-retro/93305a3c49-1774772819/kenney_animated-characters-retro.zip).

## Exclusions and paid alternatives

- **gavlig lava golem:** [the author's page](https://opengameart.org/node/13098) says CC0 and lists idle/walk/attack, but excludes third-party textures and discusses an externally owned concept whose permission was still being queried in the visible comments. Do not treat the externally linked full-texture package as a clean CC0 solution. Prefer another base.
- **MeshTint Fish Merman Toon Humanoid Series:** a potentially useful paid fallback for the fishfolk family: 1,135 triangles, detachable spear, FBX/PSD/Unity package, 27 listed animations including casting, attacks, damage and death. Price observed: **$9.90**. Conversion and role variants remain necessary; files were not acquired. [Creator listing](https://www.meshtint.com/products/fish-merman-toon-humanoid-series).
- **MeshTint Polygonal — Alien Serpent:** paid, **$14.90** observed; 2,244 triangles, FBX/PNG, 24 listed animations including cast, damage and death. Ground-slithering anatomy still needs adaptation for Sky Serpent. [Creator listing](https://www.meshtint.com/products/polygonal-alien-serpent).
- MeshTint's page titles contain “FREE 3D Model” as site-wide text; the two products above are paid. Its [license](https://www.meshtint.com/pages/terms-of-use-license) permits commercial games and modification after payment, while prohibiting distribution of source assets outside a compiled application. No purchase was made.

The remaining free-production gaps are chiefly the fishfolk family and water elemental, plus the custom appearance of the forest bosses and flying serpent. A coherent shared rig with distinct meshes/equipment is a practical adaptation strategy, but these identity changes should remain labeled custom work until built and reviewed in the game.
