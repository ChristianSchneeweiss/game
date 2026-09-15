# Equipment and visible character builds

Implemented 11 September 2026, following the [complete dungeon run](dungeon-run-milestone.md).

## Player flow

Every dungeon's preparation screen now includes Gear & appearance beside the existing spell loadout. Select a party member, browse owned weapons or armor, and preview an item before equipping it. The rotatable character preview and stat comparison update together. Cancel preview restores the equipped build without saving a change. The departure action waits for equipment mutations to finish.

The first equipment set uses the existing two equipment slots:

| Item            | Slot   | Attribute        | Appearance                           | Source                         |
| --------------- | ------ | ---------------- | ------------------------------------ | ------------------------------ |
| Iron Sword      | Weapon | +6 strength      | Native animated sword                | Moss-Covered Golem, 20%        |
| Iron Cuirass    | Armor  | +12 armor        | Steel plate, helmet, matching shield | Elder Treant, guaranteed       |
| Oakwarden Staff | Weapon | +8 intelligence  | Wood staff, gold bands, emerald seed | Hollowed Oakwarden, guaranteed |
| Int Armor       | Armor  | +10 intelligence | Purple cloth and a fitted robe       | Existing goblin drop           |

Comparisons show base stats plus equipment, including intelligence-derived mana regeneration. Battle passives and temporary effects are deliberately excluded from this labeled view. The helper uses the engine's attribute calculation without running battle hooks or mutating the roster character. Spell descriptions in preparation also use equipped attributes.

Collecting rewards persists real inventory items. The collection distinguishes equipped, available, and worn-by-another-character items. Equipment operations verify both item and character ownership, lock the character and item rows, serialize slot replacement, and reject moving a worn item until it has been unequipped. No database migration is needed.

## Shared 3D appearance

Preparation, live combat, and recorded replay all resolve appearance from the entity's equipment. Replays keep their original snapshot even after the player changes their current equipment. Empty weapon slots are visibly unarmed; empty armor slots use travel clothes. Party accent colors remain stable.

The existing KayKit knight supplies the rig and animations. Gear decorates its cloned meshes: staff geometry follows the native right-hand socket, robes follow the hips, and armor changes material and accessory visibility. Each fitting owns and disposes its added geometry and cloned materials while leaving cached textures, geometry, and rigs intact. The preview loads lazily and has an isolated failure fallback so equipment controls remain usable if 3D fails.

## Verification

An authenticated browser session against the local development database completed all five forest waves through normal battle controls. Run `cd7fowpgdb53` awarded an Iron Sword in wave one, the guaranteed Iron Cuirass in wave three, and the guaranteed Oakwarden Staff with Nature's Embrace in wave five. All three equipment items were collected.

In preparation, staff preview changed Deshaun27 from 50 to 58 intelligence and from 10 to 11.6 mana per round; cancel restored the original stats and unarmed appearance. Equipping saved the staff. Araceli's sword preview changed strength from 10 to 16, and her cuirass preview changed armor from 0 to 12. Both were equipped. Items already worn by another character remained unavailable for equipping.

Fresh run `of9p09g6sa7t` rendered those exact builds in live combat and won its first wave. It is left ready at wave two. Opening the original first-wave recording, `623yfog0g0ij`, after these equipment changes still showed unarmed Deshaun in robes and unarmed Araceli in travel clothes. The visual check also caught and corrected staff orientation; the regression test now checks upright idle placement and ground clearance against the actual rig. These IDs refer to local development records, not portable fixtures.

- Three equipment integration tests cover attribute parity with battle initialization, nonmutating previews, concurrent slot replacement, ownership, and frozen equipment snapshots.
- Three presentation tests load the actual knight GLB and exercise appearance identity, empty/legacy builds, repeated dressing and cleanup, and gear attachment through attack, cast, and death animations.
- The existing five-wave integration test now collects an Oakwarden Staff and equips it before a fresh expedition.
- Full battle suite: **544 passed, 3 failed**. The three failures are the unchanged frozen-restoration checks for `live-six-entity`, `live-milestone-2`, and `live-milestone-3` in `live-recordings.test.ts`.
- Client, server, and battle-test TypeScript checks passed. The production Vite build passed with the existing large-chunk warning.
- React Doctor reported 29 findings versus the previous 28. The new finding says the preview's `lost` state is used only in handlers; this is a false positive: render reads it and throws to the equipment preview boundary after WebGL context loss. No rule was suppressed. The initial equipment component complexity warning was resolved by separating inventory rendering.
- `git diff --check` passed.

The implementation lives in `apps/client/src/features/expedition/equipment-*`, `apps/client/src/routes/battle/-presentation/hero-equipment.ts`, and `apps/game/src/items/equipment/`. Regression coverage is in `tests/battle/equipment-presentation.test.ts` and `tests/battle/integration/equipment-build.test.ts`.
