# Equipment and passive expansion

Added 15 September 2026: **8 items and 6 passive skills**, bringing the catalogue
to 12 items and 16 passives in the first batch. The subsequent
[all-slot tier pass](equipment-tiers.md) adds 49 more items, for 61 total.
All additions appear in the Library and drop from
existing dungeon enemies. Existing enemy combat kits and previous rewards retain
their definitions. No inventory migration is needed.

## Equipment

All bonuses are additive. Equipment Intelligence also contributes to mana
regeneration, but does not change the character's persisted maximum mana.
Critical-chance bonuses below are percentage points.

| Item | Slot | Bonuses | Source | Drop chance |
| --- | --- | --- | --- | ---: |
| Ashen Falchion | Weapon | +10 strength, +4 armor penetration | Emberbound Revenant, Ashen trial | 100% |
| Tideglass Staff | Weapon | +10 intelligence, +3 mana regeneration | Water Elemental, Tides trial | 100% |
| Stormfang Blade | Weapon | +8 agility, +8% critical chance | Thundermaw, Storm trial | 100% |
| Hollow Scepter | Weapon | +10 intelligence, +5 magic penetration | Wisp of Regret, Crypt | 20% |
| Emberguard Mail | Armor | +10 armor, +6 magic resistance | Lurking Flame Wraith, Ashen trial | 25% |
| Tidewoven Robes | Armor | +6 intelligence, +5 blessed | Fishfolk Shaman, Tides trial | 25% |
| Stormrunner Leathers | Armor | +8 agility, +1 movement | Skybolt Wyvern, Storm trial | 25% |
| Gravewarden Plate | Armor | +18 armor, +8 magic resistance, −1 movement | Ghoul Knight Ivern, Crypt | 100% |

The Falchion attacks in melee with physical damage and Strength scaling.
Stormfang attacks in melee with physical damage scaled by 30% Agility and 10%
Strength. Both staves attack at range 3 with magical damage and 25% Intelligence
scaling. These profiles are captured in battle snapshots and shown in the Library.

Equipment uses the existing animated sword, staff, plate and robe fittings with
distinct colors; leathers omit the helmet and shield. Cloned materials and added
geometry are released when changing gear. Passive icons reuse shipped artwork
for related abilities, with their own names and descriptions.

## Passives

| Passive | Effect | Source | Drop chance |
| --- | --- | --- | ---: |
| Predator's Focus | +10 percentage points of critical chance | Skybolt Wyvern | 20% |
| Fleet Footed | +1 movement tile per activation | Fishfolk Scout | 20% |
| Arcane Barrier | 15% less magical damage after resistance | Lurking Flame Wraith | 20% |
| Last Bastion | 20% less damage while already at or below 35% health | Ghoul Knight Ivern | 25% |
| Merciful Light | 25% stronger healing on targets at or below 50% health | Barkhide Shaman | 25% |
| Executioner | 20% more direct damage against enemies at or below 35% health, before defenses | Emberbound Revenant | 25% |

Thresholds are checked before each hit or heal. Last Bastion does not reduce a hit
that starts above its threshold. Executioner excludes periodic and reflected
damage. Arcane Barrier includes magical periodic and reflected damage. Merciful
Light includes healing over time, self-healing and lifesteal. Current upkeep also
routes attribute regeneration through the healing hooks. Healing cannot revive
a dead target.

Useful combinations include Stormfang + Predator's Focus + Keen Instincts,
Gravewarden + Fleet Footed, and Tidewoven + Merciful Light. Equipment previews
continue to show base attributes plus gear; battle passive bonuses apply when
combat starts.

## Might and verification

Each addition has an **Estimated** Might value using the existing v2 family
references. New values are mechanic-based author estimates, explicitly marked
as not yet measured in paired encounter or tactical probes. The original stored
probe results do not include this batch. Movement needs tactical evaluation;
stationary pressure alone cannot establish its value.

Coverage in `tests/battle/rules/content-expansion.test.ts` checks threshold
boundaries, combined passives, real weapon casts, movement budgets, and equipment
preview parity. The integration test collects all new rewards through the real
inventory commands and restores their frozen battle build after unequipping.
`content-presentation.test.ts` loads the shipped knight to check fittings, colors,
and resource disposal. The existing spell/passive sweep automatically includes
all six new passives.
