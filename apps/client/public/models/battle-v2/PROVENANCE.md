# Battle miniatures, milestone 2

Both assets are redistributed under their creators' CC0 1.0 dedication. Attribution is optional; the inspector credits both creators. Original license files are adjacent.

| Runtime asset | Creator and original | Original download | Original SHA-256 |
| --- | --- | --- | --- |
| `knight.glb` | Kay Lousberg / KayKit, Adventurers Character Pack 1.0, `Knight.glb` | [Pinned official source](https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0/blob/672074b73ba276876a19e8816ecdc5241817ab47/addons/kaykit_character_pack_adventures/Characters/gltf/Knight.glb) | `60428e3abc09ba83e595d256e3af8c5c976b46cdae599f0802fc82b4a3445168` |
| `dragon.glb` | Quaternius, Ultimate Monsters (October 2022), Flying / glTF / `Dragon.gltf` | [Creator's pack page](https://quaternius.com/packs/ultimatemonsters.html), [official download file](https://drive.google.com/file/d/1-mQSm6_oGt7-EEQfNj1dFWYgPQy4AdPC/view) | `d219a29b5e928da26c24218a64284bbf999b88484a508ac6c01e0edad9f1f56c` |

The Quaternius file was downloaded on 2026-09-09 through the public folder linked by the creator's pack page. The hash pins its bytes because Drive has no public commit identifier. Its buffer and texture are embedded. The supplied license file's heading says “Ultimate Platformer Pack”; it is retained unchanged from the Ultimate Monsters download folder. The official Ultimate Monsters page independently specifies CC0.

## Reproduce the exports

Download the two original files above into one directory, then run from the repository root:

```sh
bun install
bun run prepare:battle-models /path/to/original-downloads
bun test tests/battle/assets.test.ts
```

The script verifies the original SHA-256 hashes before writing. It uses pinned glTF Transform 4.5.0 to retain the listed clips, remove unused accessories, resample redundant animation keys with a 0.0001 tolerance, deduplicate and prune unused data, and export self-contained GLBs. Geometry and texture precision are preserved; no browser compression decoder is required. Output hashes and exact byte counts are in [build-report.json](build-report.json).

Knight retains one `1H_Sword`, `Badge_Shield`, helmet, cape and body. Offhand sword, three alternate shields and the two-handed sword are removed. These are visual defaults, not a representation of character equipment stats. The dragon represents storm hatchlings; other enemy types currently share that creature stand-in. Neither miniature implies new character classes, affinities or combat rules.

| Action | Knight clip | Dragon clip |
| --- | --- | --- |
| Idle | `Idle` | `Flying_Idle` |
| Melee | `1H_Melee_Attack_Slice_Diagonal` | `Headbutt` |
| Magic | `Spellcast_Shoot` | `Punch` |
| Healing / protection | `Spellcast_Raise` | `Punch` |
| Hit | `Hit_A` | `HitReact` |
| Death | `Death_A` | `Death` |

The dragon's `Punch` is a generic casting substitute; it has no native healing clip. Knight scale is 1, facing π/3; dragon scale is 0.65, facing −π/3. Both face the opposing team while retaining a readable face silhouette. The original flying idle keeps the dragon above its base. Foreground labels sit below the bases; rear labels sit above the heads.

Ordinary resolved actions use the existing one-second presentation and 45% impact point. Imported melee/cast clips are scaled to that duration. Small lunges, traveling spell lights, target seals and healing crosses supplement the original clips. Only resolved event recipients receive feedback; no combat methods run to infer extra hits. Reduced motion suppresses travel and fixes poses while retaining outcomes.

Each model URL has a reference-counted immutable cache. Actors own independent cloned skeletons, mixers and actions. Only instance skeletons are disposed on actor teardown; shared geometry, materials, textures and image bitmaps are disposed one second after the final model owner leaves. Loading one asset can fail while the other remains usable.

The knight is **488,568 bytes** and dragon **228,836 bytes**, totaling **717,404 bytes**. That is **85.25% less** model data than the milestone-1 Skeleton Warrior's 4,863,620 bytes. This compares transfer bodies, not browser heap usage or an unconditional load-time guarantee.
