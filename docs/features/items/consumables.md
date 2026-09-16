# First consumables and materials

This follows the item foundation in [issue #6](https://github.com/ChristianSchneeweiss/game/issues/6).
The first batch adds two usable potions and three collectible materials.

| Item | Tier | Effect or purpose | Enemy sources |
| --- | --- | --- | --- |
| Healing Potion | E | Restore up to 40 health | Goblin 10%; Barkhide Shaman 10% |
| Mana Potion | D | Restore up to 25 mana | Fishfolk Shaman 7% |
| Bone Shard | E | Material | Ashen Skeleton 10% |
| Living Resin | D | Material | Barkhide Shaman 7% |
| Storm Scale | C | Material | Storm Hatchling 4% |

Each successful drop grants one item. These entries are appended after each
enemy's existing drops. Materials have no Use or Equip action and no crafting
system is introduced.
Chances follow the [shared tier curve](drop-rate-research.md#implemented-rates)
using each consumable or material's assigned tier.

Characters have two separate consumable slots, configured below gear on the
character's Equipment tab. A slot selects one bottle per encounter; both may
select the same potion. The complete party's supply is withdrawn atomically
when an encounter starts. Insufficient stock rejects the start without changing
the run or inventory. Slots are preferences for future encounters; changing them
does not alter supplies already committed to a battle. Changing a loadout
invalidates that character's shared-run readiness through its build revision.

In battle, an equipped potion restores only its holder and spends the current
activation's action. It costs no mana. Full resources, fallen characters, empty
slots, stale commands and another owner's character cannot consume a bottle.
Unused bottles return once on completion or abandonment, including defeat.
An unfinished encounter retains its reserved bottles until it ends.

Outside battle, use potions directly from inventory. Select your living
character and its ongoing expedition; the effect changes that run's resources.
Restoration is capped at the missing amount and never revives. Using a potion
in a shared run clears both players' readiness before the next encounter.

Battle effects and quantities are frozen with a versioned supply entry in the
starting build. The existing journal commits accepted uses and reconstructs
remaining supply without touching live inventory. Older snapshots default to
empty supplies. Outside-battle uses keep an owner/request receipt in the same
transaction as restoration and spending. Duplicate requests do not spend twice.

## Database and verification

Apply `apps/server/migrations/manual/20260916_consumable_use.sql` after the item
stack migration. It adds character loadout preferences, the battle-supply return
marker, and outside-use receipts. No shared or production database was changed
while implementing this feature.

The focused suites are `integration/consumables`,
`integration/consumable-recovery`, and the extended `integration/item-controls`.
They cover resource caps, rejected uses, rollback, replay/reconnect behavior,
frozen effects, reservations, returns and UI target selection. The PostgreSQL
rehearsal also tests duplicate uses and outside-use/encounter-start contention
on independent connections, plus fresh/upgrade equivalence and backup/restore.
`scripts/check-consumables-browser.mjs` exercises the isolated
`?state=consumables` preview at desktop and mobile sizes.
