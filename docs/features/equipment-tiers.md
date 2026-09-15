# Equipment across every slot

The first coverage pass adds **49 items**, for **61 equipment types** total.
Every slot has an option at every tier, E through S. Existing weapon and armor
alternatives remain available. No inventory or database migration is required.

| Slot   | E                  | D                 | C                    | B                    | A                   | S                    |
| ------ | ------------------ | ----------------- | -------------------- | -------------------- | ------------------- | -------------------- |
| Weapon | Iron Sword         | Ashen Falchion    | Stormfang Blade      | Sunforged Greatsword | Starfall Staff      | Kingsfall Edge       |
| Armor  | Emberguard Mail    | Gravewarden Plate | Runebound Vestments  | Citadel Carapace     | Astral Regalia      | Dawnwarden Aegis     |
| Ring   | Copper Band        | Emberseal Ring    | Tidecaller's Ring    | Duelist Signet       | Warden's Loop       | Sovereign Signet     |
| Amulet | Apprentice Pendant | Thornwood Charm   | Emberheart Amulet    | Moonwell Pendant     | Storm Eye Amulet    | Lifewell Talisman    |
| Boots  | Trailworn Boots    | Scout's Treads    | Gale Striders        | Bastion Greaves      | Tempest Sabatons    | Horizon Walkers      |
| Gloves | Brawler's Wraps    | Acolyte's Grips   | Ironbreak Gauntlets  | Stormgrip Gloves     | Starweave Handwraps | Kingsguard Gauntlets |
| Helmet | Iron Cap           | Mossguard Helm    | Tidekeeper's Circlet | Sentinel Greathelm   | Conqueror's Crown   | Dawnwarden Halo      |
| Cloak  | Traveler's Cloak   | Mistwoven Cape    | Shadowstalker Cloak  | Spellward Mantle     | Phoenix Shroud      | Celestial Mantle     |
| Belt   | Rope Girdle        | Raider's Belt     | Rootbound Cinch      | Champion's Girdle    | Archmage's Sash     | Worldroot Girdle     |

## Authoring and drops

`apps/game/src/items/equipment/tiered-equipment.ts` owns each new item's name,
slot, additive bonuses, source enemy and provisional Might. Runtime tiers and
Library assessments derive from that same Might value. Existing legacy items
keep their stored tiers; the Library continues to derive its tiers from Might.

New equipment is appended to the source enemy's existing loot. It uses the
existing per-item drop rates: **E 20%, D 10%, C 6%, B 3%, A 1%, S 0.3%**.
These are independent drops, not normalized tier-selection weights. The Library
shows each source and its chance. Previous drops retain their probabilities.

This pass establishes coverage, not the final catalogue distribution. Future
expansions should create many lower-tier options, progressively fewer upper-tier
options, and very few S-tier items. The desired curve is a content direction;
its exact counts and a new loot-selection algorithm are not defined here.

## Builds and presentation

The character loadout and Armoury expose all nine slots, with slot-specific icons,
tier filters and numeric bonuses. Previews show the selected piece and changes
to agility, vitality, defenses, penetration, critical chance and regeneration.
Percentage bonuses use percentages consistently in the Library and inventory.

Gear mixes physical, magical, mobility and defensive choices. New weapons have
their own Basic Attack profiles; Starfall reaches four tiles. Boots can offset
heavy armor's movement cost. Flat critical chance combines with Keen Instincts,
and physical lifesteal combines with Bloodfang. Equipment vitality strengthens
regeneration without raising persisted maximum health; Intelligence likewise
does not raise persisted maximum mana.

The fitting room and battles use existing models with tier-colored accessories,
weapon/armor variants, and small ring, pendant and belt fittings. Their materials
and added geometry belong to the cloned character and are disposed on change.

Might values are **Estimated**, using a separate anchor for each slot. They are
author estimates, not results from balance simulations. Full nine-slot builds
and the relative strength of upper tiers still need encounter calibration.

## Verification

`equipment-tiers` rules and integration tests cover E–S coverage, source validity,
Library/runtime tier agreement, real weapon casts, combined bonuses, single-slot
replacement, loot claims and frozen nine-slot builds. The presentation tests
check the shipped knight and resource cleanup. The Sanctum preview's
`?state=equipment` fixture supplies all 61 items for browser checks.
