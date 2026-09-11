# Shards of Affinity — current content catalog

> Historical content snapshot. Later [equipment](equipment-milestone.md), [route balance](branching-dungeon-milestone.md), and [combat repairs](../plans/verification-results.md) supersede conflicting mechanics/acquisition details below. See the [current project guide](../README.md).

**Snapshot: 9 September 2026 · source base `351f33e`**

Companion to the [game overview](game-overview.md). This catalog covers every registered content type and configured dungeon wave in the current code. Counts and concrete kits were checked by constructing all 39 spells, 22 enemies, and 10 passives through their factories locally. Factory construction does not establish that every ability works during combat or is obtainable by players. The descriptions below follow implementations where tooltips disagree.

## Dungeon encounter sequences

All dungeons allow at most two characters. These are fixed sequences, not random encounter pools. Each numbered entry below is a separate battle. The client level bands are advisory.

### [Avalanche Lair](../apps/game/src/dungeons/dungeon1.ts)

Key: `dungeon1` · suggested levels 1–2 · 2 waves

1. Goblin
2. Ashen Skeleton + Goblin

### [Crypt of Forgotten Echoes](../apps/game/src/dungeons/crypt-of-forgotten-echoes.ts)

Key: `crypt-of-forgotten-echoes` · suggested levels 2–3 · 4 waves

1. 2 × Skeleton Grunt
2. Rotting Corpse
3. 2 × Wisp of Regret
4. Ghoul Knight Ivern

### [Trial of the Ashen](../apps/game/src/dungeons/trial-of-the-ashen.ts)

Key: `trial-of-the-ashen` · suggested levels 4–5 · 4 waves

1. 2 × Ashen Skeleton
2. Lurking Flame Wraith
3. 2 × Crypt Crawler
4. Emberbound Revenant

### [Trial of the Nature](../apps/game/src/dungeons/trial-of-the-nature.ts)

Key: `trial-of-the-nature` · suggested levels 5–6 · 5 waves

1. 2 × Moss-Covered Golem
2. Barkhide Shaman + Moss-Covered Golem
3. Elder Treant
4. 2 × Barkhide Shaman
5. Hollowed Oakwarden

### [Trial of the Storm](../apps/game/src/dungeons/trial-of-the-storm.ts)

Key: `trial-of-the-storm` · suggested levels 6–7 · 5 waves

1. 4 × Storm Hatchling
2. 2 × Skybolt Wyvern
3. Sky Serpent
4. Thunder Drake
5. Thundermaw

### [Trial of the Tides](../apps/game/src/dungeons/trial-of-the-tides.ts)

Key: `trial-of-the-tides` · suggested levels 7–9 · 5 waves

1. 2 × Fishfolk Scout
2. Fishfolk Scout + Fishfolk Shaman
3. Water Elemental
4. 2 × Fishfolk Shaman + Fishfolk Scout
5. Commander Kelvaris, Tidepiercer

## Enemies — 22 registered types

HP/MP are configured maxima. Each surviving character receives the full XP value of each defeated enemy. Spells are listed in AI priority order: the default enemy chooses its first castable ability. Passives and equipment in this table are part of the enemy kit; they are not automatically loot.

| Enemy | HP / MP | XP | Spell priority | Additional kit |
| --- | ---: | ---: | --- | --- |
| [Goblin](../apps/game/src/enemies/goblin.ts) | 20 / 0 | 10 | Basic Attack | Armor Up; Int Armor |
| [Skeleton Grunt](../apps/game/src/enemies/skeleton-grunt.ts) | 45 / 0 | 20 | Crude Strike | — |
| [Rotting Corpse](../apps/game/src/enemies/rotting-corpse.ts) | 80 / 0 | 20 | Festering Blow → Basic Attack | — |
| [Wisp of Regret](../apps/game/src/enemies/wisp-of-regret.ts) | 40 / 40 | 20 | Cinder Wisp → Basic Attack | — |
| [Ghoul Knight Ivern](../apps/game/src/enemies/ghoul-knight-ivern.ts) | 150 / 20 | 50 | Vital Strike → Festering Blow → Basic Attack | — |
| [Emberbound Revenant](../apps/game/src/enemies/emberbound-revenant.ts) | 150 / 150 | 100 | Charred Chains → Soulflare → Basic Attack | Soulleech |
| [Ashen Skeleton](../apps/game/src/enemies/ashen-skeleton.ts) | 50 / 15 | 20 | Splinter Shot → Crude Strike → Basic Attack | — |
| [Lurking Flame Wraith](../apps/game/src/enemies/lurking-flame-wraith.ts) | 60 / 70 | 30 | Cinderbrand → Splinter Shot → Basic Attack | — |
| [Crypt Crawler](../apps/game/src/enemies/crypt-crawler.ts) | 40 / 40 | 25 | Precise Thrust → Festering Blow → Basic Attack | — |
| [Moss-Covered Golem](../apps/game/src/enemies/moss-covered-golem.ts) | 90 / 25 | 30 | Crushing Blow → Crude Strike → Basic Attack | — |
| [Barkhide Shaman](../apps/game/src/enemies/barkhide-shaman.ts) | 60 / 70 | 25 | Stone Bark → Splinter Shot → Basic Attack | — |
| [Hollowed Oakwarden](../apps/game/src/enemies/hollowed-oakwarden.ts) | 260 / 200 | 100 | Verdant Smite → Nature's Embrace → Festering Blow → Basic Attack | Blessed Fortune; Titans Resurgence |
| [Elder Treant](../apps/game/src/enemies/elder-treant.ts) | 180 / 80 | 50 | Rootgrasp → Crushing Blow → Basic Attack | Stoneform Resolve |
| [Thundermaw](../apps/game/src/enemies/thundermaw.ts) | 300 / 200 | 100 | Volt Lash → Lightning Surge → Festering Blow → Basic Attack | Thorn Carapace |
| [Thunder Drake](../apps/game/src/enemies/thunder-drake.ts) | 150 / 50 | 40 | Stunning Strike → Festering Blow → Basic Attack | — |
| [Sky Serpent](../apps/game/src/enemies/sky-serpent.ts) | 180 / 70 | 50 | Storm Pulse → Battle Roar → Festering Blow → Basic Attack | Mystic Flow |
| [Storm Hatchling](../apps/game/src/enemies/storm-hatchling.ts) | 40 / 40 | 20 | Staggering Jab → Basic Attack | — |
| [Skybolt Wyvern](../apps/game/src/enemies/skybolt-wyvern.ts) | 35 / 50 | 20 | Festering Blow → Basic Attack | — |
| [Commander Kelvaris, Tidepiercer](../apps/game/src/enemies/commander-kelvaris.ts) | 220 / 130 | 150 | Torrent Spiral → Tidepiercer Thrust → Vital Strike → Basic Attack | Keen Instincts |
| [Fishfolk Shaman](../apps/game/src/enemies/fishfolk-shaman.ts) | 60 / 70 | 30 | Ocean Blessing → Aqua Wave → Basic Attack | — |
| [Fishfolk Scout](../apps/game/src/enemies/fishfolk-scout.ts) | 55 / 30 | 25 | Rupture → Crude Strike → Basic Attack | — |
| [Water Elemental](../apps/game/src/enemies/water-elemental.ts) | 130 / 150 | 40 | Tidal Pulse → Stream of Life → Basic Attack | Vital Wellspring |

### Exact loot-table conventions

Most enemies use the default table: every non-Basic Attack ability in the row above has an independent 1% drop roll because those current enemy spells are tier A. Enemy passive/equipment drops are disabled in the default constructor. The explicit exceptions are:

- **Goblin:** Int Armor at 60% and Armor Up at 60%; no spell drop. The two rolls are independent.
- **Ashen Skeleton:** Splinter Shot at 100%; no Crude Strike drop from this enemy.
- **Lurking Flame Wraith:** Cinderbrand at 10% and Splinter Shot at 20%.

Gold is rolled separately from each defeated enemy's configured gold amount and included in the bundle, but it has no functioning claim-to-balance/spending path. Source: [BaseEnemy](../apps/game/src/enemies/base/base.enemy.ts), [drop rates](../apps/game/src/utils/loot.ts), [loot generation](../apps/server/src/game-usecases/dungeon-manager.ts).

## Spells — 39 registered types

“Spell” includes physical attacks and defensive actions. MP is mana cost; CD is the configured cooldown in intervening own turns under the ordinary turn sequence, not seconds. Exact timing depends on the turn/effect lifecycle. Numbers are current data, not a balancing recommendation.

Acquisition labels: **Automatic** = added to every character; **Starter** = one initial account gift; **Drop** = current enemy loot; **Manual grant** = the visible free “Create spells” button; **No source** = registered but no current starter/drop/manual grant path. Manually existing database records could still equip a registered ability.

| Spell | Tier | MP / CD | Target behavior | Implemented mechanic / caveat | Acquisition |
| --- | --- | ---: | --- | --- | --- |
| [Basic Attack](../apps/game/src/spells/basic-attack.ts) | A | 0 / 0 | One enemy | Free physical attack; no attribute scaling. | Automatic |
| [Fireball](../apps/game/src/spells/fireball.ts) | A | 10 / 2 | One enemy | Single-target magical damage scaling with intelligence. | No source |
| [Single Heal](../apps/game/src/spells/Single-Heal.ts) | A | 10 / 2 | One ally (can be self) | Direct ally healing with small intelligence scaling. | No source |
| [Crude Strike](../apps/game/src/spells/crude-strike.ts) | A | 0 / 0 | One enemy | Physical damage; chance to reduce agility. | Drop |
| [Festering Blow](../apps/game/src/spells/festering-blow.ts) | A | 0 / 2 | All enemies | Physical damage to all enemies; chance to increase damage taken by 10%. | Drop |
| [Cinder Wisp](../apps/game/src/spells/cinder-wisp.ts) | A | 10 / 1 | One enemy | Magical damage with intelligence scaling. | Starter; Drop |
| [Vital Strike](../apps/game/src/spells/vital-strike.ts) | A | 0 / 2 | One enemy | Physical damage; caster heals for 50% of damage dealt. | Drop |
| [Splinter Shot](../apps/game/src/spells/splinter-shot.ts) | A | 0 / 1 | One enemy | Physical damage; chance to reduce armor by 10%. | Drop |
| [Cinderbrand](../apps/game/src/spells/cinderbrand.ts) | A | 15 / 2 | One enemy | Magical damage; chance of a magical damage-over-time effect. | Drop |
| [Precise Thrust](../apps/game/src/spells/precise-thrust.ts) | A | 5 / 1 | One enemy | Physical damage scaling with agility. | Drop |
| [Soulflare](../apps/game/src/spells/soulflare.ts) | A | 40 / 4 | One enemy | Magical damage; caster heals for 50% of damage dealt. | Drop |
| [Charred Chains](../apps/game/src/spells/charred-chains.ts) | A | 25 / 3 | All enemies | Magical damage to all enemies; chance to increase damage taken by 10%. | Drop |
| [Crushing Blow](../apps/game/src/spells/crushing-blow.ts) | A | 0 / 2 | One enemy | Physical damage scaling with strength; chance to stun. | Drop |
| [Stone Bark](../apps/game/src/spells/stone-bark.ts) | A | 10 / 3 | Self | Self buff: multiply armor by 1.25. Description incorrectly says an ally. | Drop |
| [Rootgrasp](../apps/game/src/spells/rootgrasp.ts) | A | 15 / 4 | All enemies | Magical damage to all enemies; chance to stun. | Drop |
| [Verdant Smite](../apps/game/src/spells/verdant-smite.ts) | A | 25 / 3 | One enemy | Magical damage; chance to reduce armor by 15%. | Drop |
| [Nature's Embrace](../apps/game/src/spells/natures-embrace.ts) | A | 35 / 4 | All allies | Heal the whole allied team, scaling with intelligence. | Drop |
| [Lightning Surge](../apps/game/src/spells/lightning-surge.ts) | A | 50 / 3 | All enemies | Magical damage to all enemies; chance to stun. | Drop |
| [Stunning Strike](../apps/game/src/spells/stunning-strike.ts) | A | 0 / 2 | One enemy | Physical damage scaling with strength; chance to stun. | Drop |
| [Staggering Jab](../apps/game/src/spells/staggering-jab.ts) | A | 0 / 1 | One enemy | Low-cost physical attack; chance to stun. | Drop |
| [Battle Roar](../apps/game/src/spells/battle-roar.ts) | A | 15 / 3 | One enemy | 60% chance to stun one enemy; no direct damage. | Starter; Drop |
| [Torrent Spiral](../apps/game/src/spells/torrent-spiral.ts) | A | 35 / 4 | All enemies | Physical damage to all enemies; chance of +25% damage taken. The curse is not water-specific. | Drop |
| [Tidepiercer Thrust](../apps/game/src/spells/tidepiercer-thrust.ts) | A | 25 / 3 | One enemy | Physical damage scaling with strength. Advertised defense-ignore proc is absent. | Drop |
| [Ocean Blessing](../apps/game/src/spells/ocean-blessing.ts) | A | 20 / 3 | One ally (can be self) | Direct ally healing, scaling with intelligence. | Drop |
| [Aqua Wave](../apps/game/src/spells/aqua-wave.ts) | A | 10 / 1 | One enemy | Magical damage; chance to reduce agility by 2. | Starter; Drop |
| [Tidal Pulse](../apps/game/src/spells/tidal-pulse.ts) | A | 30 / 3 | All enemies | Magical damage to all enemies; chance to reduce agility by 2. Not capped at three enemies. | Drop |
| [Stream of Life](../apps/game/src/spells/stream-of-life.ts) | A | 25 / 4 | Self | Direct self-healing, scaling with intelligence. | Drop |
| [Rupture](../apps/game/src/spells/rupture.ts) | A | 0 / 1 | One enemy | Physical damage; chance of physical damage over time. | Drop |
| [Storm Pulse](../apps/game/src/spells/storm-pulse.ts) | A | 25 / 3 | Up to 3 random living entities | Physical damage to up to three random living entities, including allies/self; intelligence scaling and bonus-damage chance. | Drop |
| [Volt Lash](../apps/game/src/spells/volt-lash.ts) | A | 35 / 4 | 4 random enemy selections | Four magical hits chosen from enemies, with repeat targets possible; each hit can stun. | Drop |
| [Final Verdict](../apps/game/src/spells/final-verdict.ts) | S | 10 / 2 | One enemy | Strength-scaling physical strike; extra max-HP-based damage at a 0.1% target-HP threshold in current code. | Manual grant |
| [Aegis Wall](../apps/game/src/spells/aegis-wall.ts) | A | 35 / 6 | All allies | All-ally max-HP shield definition; construction currently fails. Advertised additional self-defense buff is absent. | No source |
| [Bulwark Bash](../apps/game/src/spells/bulwark-bash.ts) | S | 0 / 2 | One enemy | Free vitality-scaling physical attack and guaranteed one-turn stun. | Manual grant |
| [Earthshatter](../apps/game/src/spells/earthshatter.ts) | S | 0 / 4 | All enemies | Free vitality-scaling physical damage to all enemies; chance to stun. | Manual grant |
| [Deflecting Stance](../apps/game/src/spells/deflecting-stance.ts) | B | 25 / 4 | One ally (can be self) | One-ally reflection buff scaling with caster vitality; reduces incoming damage by the resolved reflected amount. | Manual grant |
| [Bladestorm Rhythm](../apps/game/src/spells/bladestorm-rythm.ts) | S | 15 / 4 | One enemy | Two physical hits against one enemy, scaling with agility. | Manual grant |
| [Iron Will](../apps/game/src/spells/iron-will.ts) | A | 20 / 6 | One ally (can be self) | Remove DEBUFF-class effects; add armor/magic resistance; conditional low-HP healing. | No source |
| [Arcane Channeling](../apps/game/src/spells/arcane-channeling.ts) | A | 40 / 6 | All enemies | Charge before releasing intelligence-scaling magical damage to all selected enemies. | Manual grant |
| [Fleetfoot Gambit](../apps/game/src/spells/fleetfoot-gambit.ts) | S | 50 / 8 | One ally (can be self) | Give an ally one extra action in the next combat round. | Manual grant |

**Coverage:** 27 drop types, 7 additional manual-grant types, 1 automatic basic action, and 4 types without a current acquisition source. The three starter gifts are included in the 27 drop types. This sums to 39; it does not mean 39 naturally lootable spells.

Mechanical details worth preserving when interpreting the table: most damage-plus-effect spells use one effect-chance check for the cast, then apply the effect to all selected targets if it succeeds. Stun, paralysis, and root flavor generally resolve through the same STUN effect. Iron Will only cleanses the DEBUFF category, not all harmful categories. Deflecting Stance has no implemented “choose the stronger reflection” rule. Storm Pulse's description currently consumes RNG, so even inspection is not guaranteed to be read-only to the simulation.

## Passive skills — 10 registered types

Only Armor Up currently drops for players. Nine passive types appear on enemies; Bloodfang is defined without a current enemy kit or player acquisition source. No passive-slot cap is enforced in the equip use case.

| Passive | Tier | Mechanic in code | Current use / limitation |
| --- | --- | --- | --- |
| [Armor Up](../apps/game/src/passive-skills/armor-up.passive.ts) | E | Armor ×1.2. | Goblin; player loot from Goblin. Zero base armor remains zero under a multiplier. |
| [Thorn Carapace](../apps/game/src/passive-skills/thorn-carapace.passive.ts) | B | Retaliates using 20% of incoming damage as the starting amount; does not reduce the original hit. | Thundermaw; no player loot source. Reflection interactions need validation. |
| [Blessed Fortune](../apps/game/src/passive-skills/blessed-fortune.passive.ts) | S | Blessed +5, improving the 0–20 spell roll up to its cap. | Hollowed Oakwarden; no player loot source. |
| [Bloodfang](../apps/game/src/passive-skills/bloodfang.passive.ts) | B | Physical lifesteal +10%. | Defined only; no current enemy kit or player loot source. |
| [Soulleech](../apps/game/src/passive-skills/soulleech.passive.ts) | B | Omnivamp +5%; the current handler applies this to magical damage. | Emberbound Revenant; no player loot source. |
| [Mystic Flow](../apps/game/src/passive-skills/mystic-flow.passive.ts) | C | ManaRegen attribute ×1.25. | Sky Serpent; ordinary upkeep bypasses this attribute, so the intended regeneration bonus is disconnected. |
| [Vital Wellspring](../apps/game/src/passive-skills/vital-wellspring.passive.ts) | C | HealthRegen attribute ×1.25. | Water Elemental; ordinary upkeep bypasses this attribute, so the intended regeneration bonus is disconnected. |
| [Stoneform Resolve](../apps/game/src/passive-skills/stoneform-resolve.passive.ts) | A | Adds 1 armor and 1 magic resistance per completed combat round, up to 15 increments. | Elder Treant; no player loot source. Its description incorrectly mentions Blessed. |
| [Titans Resurgence](../apps/game/src/passive-skills/titans-resurgence.passive.ts) | S | Intended one-time trigger at ≤30% HP: healing over 4 rounds for 7.5% max HP each. | Hollowed Oakwarden; spawned healing effect lacks normal registration/source setup, so do not treat it as working recovery. |
| [Keen Instincts](../apps/game/src/passive-skills/keen-instincts.passive.ts) | A | Critical chance ×1.25 and critical-damage bonus +0.5. | Commander Kelvaris; no player loot source. Critical chance multiplier alone does not create a chance from zero. |

## Equipment — 1 registered type

| Item | Tier | Slot | Rule | Acquisition |
| --- | --- | --- | --- | --- |
| [Int Armor](../apps/game/src/items/equipment/int-armor.ts) | E | Armor | Adds 10 intelligence when applied in battle. Does not itself recalculate maximum mana. | 60% independent drop roll from Goblin. |

The slot model also includes weapon, ring, amulet, boots, gloves, helmet, cloak, and belt. Those slots have UI/data support but no corresponding current item definitions. Equipping an item replaces the current occupant of that slot.

## Other effect and legacy code

The active content above uses the shared damage, healing, status, and lifecycle machinery. Additional generic shield, composite-effect, mind-control, summon/resurrection/time-warp code exists in the repository. Those helpers and `deprecated.spells.ts` are not extra registered playable content and are not included in the counts. There is no current content-based promise that these systems are finished or planned.

For the player loop, prototype boundaries, code map, and major implementation gaps, return to the [game overview](game-overview.md).
