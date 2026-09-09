# Skeleton Warrior miniature

- Creator: Kay Lousberg / KayKit.
- Pack: KayKit Character Pack — Skeletons, version 1.0.
- Asset: `Skeleton_Warrior.glb`, renamed locally to `warrior.glb`.
- Official repository: https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Skeletons-1.0
- Pinned source revision: `15b62b9bad122f72926c10fb14d622c73819fa54`.
- Exact source: https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Skeletons-1.0/blob/15b62b9bad122f72926c10fb14d622c73819fa54/addons/kaykit_character_pack_skeletons/Characters/gltf/Skeleton_Warrior.glb
- License: CC0 1.0; see the adjacent original `LICENSE.txt`. Attribution is not required; the prototype credits KayKit voluntarily.
- Modifications: none to the GLB. The local filename changed. Scale, facing, clip selection and markers are runtime presentation settings.
- Export recipe: no re-export; download the official GLB byte for byte from the pinned revision.
- Size: 4,863,620 bytes.
- SHA-256: `178b6fda810b814c250d8a2010c24dfd9b458b9006dd323353e620b7ff118bbe`.

The file contains 95 animation clips, 10 meshes and one skin. The Khronos validator reports zero errors. The prototype exercises the original skinned GLB in the browser; the CPU skeleton test omits only texture decoding in its in-memory test copy.

| Role | Original clip | Duration |
| --- | --- | --- |
| Idle loop | `Idle` | 1.0667 s |
| Attack one-shot | `1H_Melee_Attack_Slice_Diagonal` | 1 s |
| Damage reaction | `Hit_A` | 0.6667 s |
| Death | `Death_A` | 0.8 s |

The visual manifest uses scale 1.05, facing ±π/2 and label height 2.7. Ordinary events reach impact at 45% of a one-second presentation. A modest procedural lunge and independent impact markers supplement imported animation. Missing clips keep the markers; missing models use simple geometric miniatures. Reduced motion fixes idle poses and shows a final death pose.

This skeleton is a clearly labeled stand-in for **every** party member and enemy, including storm hatchlings. It does not represent the final creature roster. The attack clip is shown without weapon attachments. Colored bases and labels identify teams and selection, without implying elemental combat rules.

Each actor owns a cloned skinned hierarchy, skeleton resources, mixer and animation actions. Immutable geometry, materials, textures and clips are shared. Instance teardown stops/uncaches actions and disposes its skeletons. The last asset owner schedules eviction after one second; eviction disposes shared geometry/materials/textures and closes owned image bitmaps, including when a fetch completes after its final owner leaves. One-shot actions reset before replay. Shared materials are never tinted for hit or selection feedback.
