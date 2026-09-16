# Drop-rate research and implementation

Updated 16 September 2026. **Implemented locally.** All existing enemy drop
entries now use actual tiers and the agreed lower curve. Spells, equipment, and
passives derive tiers from Might; consumables and materials use their assigned
tiers. Every existing source and reward order is preserved. No boss multiplier,
guaranteed first copy, new source, or Might reassessment was introduced.

## Implemented rates

Use the Might-derived tier for spells, equipment, and passives with a lower
shared curve. Bosses use the same baseline; there is no automatic multiplier.

| Actual tier | Previous default curve | Implemented source chance |
| --- | ---: | ---: |
| E | 20% | 10% |
| D | 10% | 7% |
| C | 6% | 4% |
| B | 3% | 2% |
| A | 1% | 1% |
| S | 0.3% | 0.3% |

The previous-default column describes the old helper's curve, not the effective
previous chance of an actually assessed tier: runtime spell labels are all A,
so default spell entries previously received 1% even when their assessed tier was
E or S. Explicit enemy entries also overrode the helper. The complete effective
before/after table appears below.

These rates are implemented and covered by regression checks; their progression
pace has not been playtested. Elite route encounters retain their separate reward
rules. The generic authored-loot API still supports explicit source overrides,
but all current enemies use this curve. The
[domain model](../../../CONTEXT.md) allows the same item to have different rates
on different enemies. No additional source multipliers are assumed here.

## Tier resolution

The [default helpers](../../../apps/game/src/utils/loot.ts) now use assessments
instead of legacy runtime tiers such as `spell.config.tier`. The valuations live in
[spell assessments](../../../apps/game/src/might/spell-assessments.ts) and
[equipment/passive assessments](../../../apps/game/src/might/equipment-and-passive-assessments.ts).
The canonical [tier derivation](../../../apps/game/src/might/might.ts) promotes at
138 / 190 / 263 / 362 / 500 Might. Current assessments are Estimated, as recorded
in [the v3 assessment](../../might/assessments.md).

A runtime census of all 22 registered enemies found 110 loot entries and 25
distinct droppable spells. All 25 have legacy runtime A labels. Their **actual**
tier distribution is E: 9, D: 2, C: 4, B: 4, A: 2, S: 4.

| Example | Might | Actual tier | Previous source chance | Implemented chance |
| --- | ---: | --- | --- | --- |
| Crude Strike, Skeleton Grunt | 25 | E | 1% | 10% |
| Cinderbrand, Lurking Flame Wraith | 165 | D | 10% explicit | 7% |
| Festering Blow, Rotting Corpse | 230 | C | 1% | 4% |
| Storm Pulse, Sky Serpent | 350 | B | 1% | 2% |
| Charred Chains, Emberbound Revenant | 370 | A | 1% | 1% |
| Volt Lash, Thundermaw | 1150 | S | 1% | 0.3% |
| Armor Up, Goblin | 280 | B | 60% explicit; legacy E | 2% |

Iron Cuirass is another mismatch: runtime D, actual E at Might 100. All three
power-rated categories now resolve the actual tier. Unrated content remains
visible in the Library with a 0% default chance until assessed; it never falls
back to a legacy label or an invented Might value. Invalid assessments still
throw validation errors. Consumables and materials use their assigned catalog
tiers and deliberately do not require Might.

## Former guarantees and supplies

All eight previously guaranteed enemy entries now use the same tier curve,
including the first kill. Splinter Shot is 10%, Nature's Embrace 0.3%, Oakwarden
Staff 7%, Gravewarden Plate 7%, Ashen Falchion 7%, Iron Cuirass 10%, Stormfang
Blade 4%, and Tideglass Staff 7%. No player-history tracking or migration is
needed. Already-earned loot is not rerolled.

Consumables and materials also follow their assigned tiers:

| Item | Source | Previous → implemented |
| --- | --- | ---: |
| Healing Potion | Goblin | 15% → 10% |
| Healing Potion | Barkhide Shaman | 20% → 10% |
| Mana Potion | Fishfolk Shaman | 20% → 7% |
| Bone Shard | Ashen Skeleton | 30% → 10% |
| Living Resin | Barkhide Shaman | 25% → 7% |
| Storm Scale | Storm Hatchling | 20% → 4% |

The [stackable catalog](../../../apps/game/src/items/stackable-catalog.ts) owns
these assigned tiers. Material uses, potion effects, quantities, and
[consumable rules](consumables.md) are unchanged. Crypt, Ashen, and Storm retain
their lack of potion sources; this rate update adds no new supply rewards.

## Expected results per completed dungeon

Calculated from authored enemy counts, every wave defeated, one participating
owner, and implemented rates. These values exclude separate route rewards;
there are no first-acquisition guarantees or new enemy sources. Expected spell counts
include duplicates; “any spell” does not mean a newly discovered spell.

| Dungeon | Expected spells: before → after | Chance of any spell: before → after | Expected gear: before → after |
| --- | ---: | ---: | ---: |
| [Avalanche Lair](../../../apps/game/src/dungeons/dungeon1.ts) | 1.00 → 0.10 | 100% → 10% | 2.40 → 0.80 |
| [Crypt of Forgotten Echoes](../../../apps/game/src/dungeons/crypt-of-forgotten-echoes.ts) | 0.07 → 0.52 | 6.79% → 41.95% | 2.90 → 0.96 |
| [Trial of the Ashen](../../../apps/game/src/dungeons/trial-of-the-ashen.ts) | 2.36 → 0.66 | 100% → 50.05% | 1.58 → 0.40 |
| [Trial of the Nature](../../../apps/game/src/dungeons/trial-of-the-nature.ts) | 1.08 → 0.66 | 100% → 50.15% | 3.73 → 1.26 |
| [Trial of the Storm](../../../apps/game/src/dungeons/trial-of-the-storm.ts) | 0.14 → 0.77 | 13.13% → 54.97% | 1.68 → 0.31 |
| [Trial of the Tides](../../../apps/game/src/dungeons/trial-of-the-tides.ts) | 0.19 → 1.44 | 17.38% → 77.88% | 3.04 → 1.27 |

The reduced Avalanche and Ashen counts remove guaranteed Splinter Shots.
Correcting the legacy tier input makes low-tier spells more accessible on many
other sources, while most equipment and passive sources become less generous.
Potion expectations are 0.20 per Avalanche clear and 0.30 per Nature clear for
Healing Potions, and 0.21 per Tides clear for Mana Potions. Expected materials
are 0.10 Bone Shards in Avalanche, 0.20 in Ashen, 0.21 Living Resin in Nature,
and 0.16 Storm Scales in Storm.

A specific S-tier reward at 0.3% takes about 333 eligible kills on average and
998 kills for a 95% acquisition probability, unchanged from the existing S-gear
default. An A-tier reward at 1% takes 100 kills on average and 299 for 95%.
These are not maximum waits and exclude failure and source-access time.
These tiers are long-term collection targets under the implemented curve;
no first-acquisition milestone bypasses these chances.

## Content without an enemy drop source

The census found 13 non-basic spells and nine passives with no enemy loot entry.
This is source coverage, not proof that every listed entry is unobtainable
through all possible grants or fixtures. Basic Attack is intentionally excluded;
the [entity factory](../../../apps/server/src/game-usecases/entity-factory.ts)
adds it directly.

[BaseEnemy](../../../apps/game/src/enemies/base/base.enemy.ts) uses explicit
`loot.items` instead of its default spell list, then appends tiered gear. Its
automatic passive-drop line is disabled. An enemy using an ability therefore
does not necessarily drop it. In particular,
[Moss-Covered Golem](../../../apps/game/src/enemies/moss-covered-golem.ts) omits
Crushing Blow, and [Elder Treant](../../../apps/game/src/enemies/elder-treant.ts)
omits Rootgrasp and Stoneform Resolve.

These are research ideas for future source assignments, **not implemented**.
All suggested chances follow the same actual-tier curve without a boss multiplier.
They are excluded from the totals above. Existing source eligibility is unchanged.

| Missing spell | Actual tier | Suggested source | Chance |
| --- | --- | --- | ---: |
| Fireball | E | Lurking Flame Wraith | 10% |
| Single Heal | E | Fishfolk Shaman | 10% |
| Crushing Blow | E | Moss-Covered Golem | 10% |
| Rootgrasp | A | Elder Treant | 1% |
| Final Verdict | A | Commander Kelvaris | 1% |
| Aegis Wall | S | Ghoul Knight Ivern | 0.3% |
| Bulwark Bash | S | Moss-Covered Golem | 0.3% |
| Earthshatter | S | Elder Treant | 0.3% |
| Deflecting Stance | D | Fishfolk Scout | 7% |
| Bladestorm Rhythm | S | Emberbound Revenant | 0.3% |
| Iron Will | B | Ghoul Knight Ivern | 2% |
| Arcane Channeling | S | Barkhide Shaman | 0.3% |
| Fleetfoot Gambit | C | Sky Serpent | 4% |

| Missing passive | Actual tier | Suggested source | Chance |
| --- | --- | --- | ---: |
| Thorn Carapace | B | Thundermaw | 2% |
| Blessed Fortune | E | Hollowed Oakwarden | 10% |
| Bloodfang | D | Crypt Crawler | 7% |
| Soulleech | D | Emberbound Revenant | 7% |
| Mystic Flow | D | Sky Serpent | 7% |
| Vital Wellspring | B | Water Elemental | 2% |
| Stoneform Resolve | B | Elder Treant | 2% |
| Titan's Resurgence | C | Hollowed Oakwarden | 4% |
| Keen Instincts | B | Commander Kelvaris | 2% |

The [spell registry](../../../apps/game/src/spells/base/spell-types.ts),
[passive registry](../../../apps/game/src/passive-skills/base/passive-types.ts),
and linked assessments identify these entries and tiers. Prioritize omitted
abilities that their source enemy already uses. A powerful spell on a frequently
occurring enemy may need a source override or a less frequent source: for
example, a 0.3% Arcane Channeling chance across Nature's three Shamans gives a
0.897% per-clear acquisition chance. Tier alone does not account for frequency.

## Route rewards and currency

The [route rules](../../../apps/game/src/dungeons/route.ts) currently give a 50%
treasure gamble, a 50% elite bonus, and guaranteed safe-cache/vault rewards
conditional on choosing those paths. Rewards alternate between four fixed items
by wave parity; later dungeons do not upgrade that pool.
The [offer catalog](../../../apps/game/src/dungeons/route-catalog.ts) uses weights
60 / 30 / 12 / 8 / 0.5 with sampling without replacement and 2–4 offers per fork;
the vault's 0.5 weight is not a 0.5% offer probability.

Those chances and weights are unchanged by this enemy-rate update. A later route
pass should improve dungeon-appropriate reward selection first, especially the
fixed low-tier elite bonus. Version-1 route rules are explicitly immutable, so
changes need compatible versioning for existing runs.

The [dungeon reward handler](../../../apps/server/src/game-usecases/dungeon-manager.ts)
rolls gold as `(rng() + 0.5) * enemy.loot.gold`, then sums and rounds. The
[claim handler](../../../apps/server/src/game-usecases/loot-manager.ts) currently
grants items, spells, and passives without crediting gold. Leave currency amounts
and variance unchanged until there is an earn/spend loop to evaluate.

## Complete enemy drop update

All 110 entries are listed below; 90 chances changed. Tier is the actual
Might-derived grade for power-rated rewards and the assigned grade for supplies.
Every entry uses the shared curve, including all formerly guaranteed rewards.

| Enemy | Drop (actual tier): previous → implemented chance |
| --- | --- |
| [Goblin](../../../apps/game/src/enemies/goblin.ts) | `int-armor` (E) 60% → 10%; `armor-up` (B) 60% → 2%; `copper-band` (E) 20% → 10%; `apprentice-pendant` (E) 20% → 10%; `rope-girdle` (E) 20% → 10%; `healing-potion` (E) 15% → 10% |
| [Skeleton Grunt](../../../apps/game/src/enemies/skeleton-grunt.ts) | `crude-strike` (E) 1% → 10%; `trailworn-boots` (E) 20% → 10%; `iron-cap` (E) 20% → 10% |
| [Rotting Corpse](../../../apps/game/src/enemies/rotting-corpse.ts) | `festering-blow` (C) 1% → 4%; `brawlers-wraps` (E) 20% → 10%; `travelers-cloak` (E) 20% → 10% |
| [Wisp of Regret](../../../apps/game/src/enemies/wisp-of-regret.ts) | `cinder-wisp` (E) 1% → 10%; `hollow-scepter` (C) 20% → 4%; `mistwoven-cape` (D) 10% → 7% |
| [Ghoul Knight Ivern](../../../apps/game/src/enemies/ghoul-knight-ivern.ts) | `vital-strike` (C) 1% → 4%; `festering-blow` (C) 1% → 4%; `gravewarden-plate` (D) 100% → 7%; `last-bastion` (C) 25% → 4%; `citadel-carapace` (B) 3% → 2%; `wardens-loop` (A) 1% → 1%; `bastion-greaves` (B) 3% → 2%; `sentinel-greathelm` (B) 3% → 2% |
| [Emberbound Revenant](../../../apps/game/src/enemies/emberbound-revenant.ts) | `charred-chains` (A) 1% → 1%; `soulflare` (S) 1% → 0.3%; `ashen-falchion` (D) 100% → 7%; `executioner` (D) 25% → 7%; `sunforged-greatsword` (B) 3% → 2%; `emberheart-amulet` (C) 6% → 4%; `conquerors-crown` (A) 1% → 1%; `phoenix-shroud` (A) 1% → 1% |
| [Ashen Skeleton](../../../apps/game/src/enemies/ashen-skeleton.ts) | `splinter-shot` (E) 100% → 10%; `bone-shard` (E) 30% → 10% |
| [Lurking Flame Wraith](../../../apps/game/src/enemies/lurking-flame-wraith.ts) | `emberguard-mail` (E) 25% → 10%; `arcane-barrier` (B) 20% → 2%; `cinderbrand` (D) 10% → 7%; `splinter-shot` (E) 20% → 10%; `emberseal-ring` (D) 10% → 7% |
| [Crypt Crawler](../../../apps/game/src/enemies/crypt-crawler.ts) | `precise-thrust` (E) 1% → 10%; `festering-blow` (C) 1% → 4%; `shadowstalker-cloak` (C) 6% → 4% |
| [Moss-Covered Golem](../../../apps/game/src/enemies/moss-covered-golem.ts) | `iron-sword` (E) 20% → 10%; `ironbreak-gauntlets` (C) 6% → 4%; `mossguard-helm` (D) 10% → 7% |
| [Barkhide Shaman](../../../apps/game/src/enemies/barkhide-shaman.ts) | `stone-bark` (E) 1% → 10%; `splinter-shot` (E) 1% → 10%; `merciful-light` (C) 25% → 4%; `runebound-vestments` (C) 6% → 4%; `thornwood-charm` (D) 10% → 7%; `healing-potion` (E) 20% → 10%; `living-resin` (D) 25% → 7% |
| [Hollowed Oakwarden](../../../apps/game/src/enemies/hollowed-oakwarden.ts) | `verdant-smite` (B) 1% → 2%; `festering-blow` (C) 1% → 4%; `natures-embrace` (S) 100% → 0.3%; `oakwarden-staff` (D) 100% → 7%; `starfall-staff` (A) 1% → 1%; `astral-regalia` (A) 1% → 1%; `moonwell-pendant` (B) 3% → 2%; `lifewell-talisman` (S) 0.3% → 0.3%; `starweave-handwraps` (A) 1% → 1%; `spellward-mantle` (B) 3% → 2%; `celestial-mantle` (S) 0.3% → 0.3%; `archmages-sash` (A) 1% → 1%; `worldroot-girdle` (S) 0.3% → 0.3% |
| [Elder Treant](../../../apps/game/src/enemies/elder-treant.ts) | `iron-cuirass` (E) 100% → 10%; `rootbound-cinch` (C) 6% → 4% |
| [Thundermaw](../../../apps/game/src/enemies/thundermaw.ts) | `volt-lash` (S) 1% → 0.3%; `lightning-surge` (S) 1% → 0.3%; `festering-blow` (C) 1% → 4%; `stormfang-blade` (C) 100% → 4%; `dawnwarden-aegis` (S) 0.3% → 0.3%; `storm-eye-amulet` (A) 1% → 1%; `tempest-sabatons` (A) 1% → 1%; `dawnwarden-halo` (S) 0.3% → 0.3% |
| [Thunder Drake](../../../apps/game/src/enemies/thunder-drake.ts) | `stunning-strike` (C) 1% → 4%; `festering-blow` (C) 1% → 4%; `stormgrip-gloves` (B) 3% → 2% |
| [Sky Serpent](../../../apps/game/src/enemies/sky-serpent.ts) | `storm-pulse` (B) 1% → 2%; `battle-roar` (E) 1% → 10%; `festering-blow` (C) 1% → 4% |
| [Storm Hatchling](../../../apps/game/src/enemies/storm-hatchling.ts) | `staggering-jab` (E) 1% → 10%; `storm-scale` (C) 20% → 4% |
| [Skybolt Wyvern](../../../apps/game/src/enemies/skybolt-wyvern.ts) | `festering-blow` (C) 1% → 4%; `stormrunner-leathers` (D) 25% → 7%; `predators-focus` (B) 20% → 2%; `gale-striders` (C) 6% → 4% |
| [Commander Kelvaris, Tidepiercer](../../../apps/game/src/enemies/commander-kelvaris.ts) | `torrent-spiral` (B) 1% → 2%; `tidepiercer-thrust` (A) 1% → 1%; `vital-strike` (C) 1% → 4%; `kingsfall-edge` (S) 0.3% → 0.3%; `duelist-signet` (B) 3% → 2%; `sovereign-signet` (S) 0.3% → 0.3%; `horizon-walkers` (S) 0.3% → 0.3%; `kingsguard-gauntlets` (S) 0.3% → 0.3%; `champions-girdle` (B) 3% → 2% |
| [Fishfolk Shaman](../../../apps/game/src/enemies/fishfolk-shaman.ts) | `ocean-blessing` (D) 1% → 7%; `aqua-wave` (E) 1% → 10%; `tidewoven-robes` (E) 25% → 10%; `acolytes-grips` (D) 10% → 7%; `mana-potion` (D) 20% → 7% |
| [Fishfolk Scout](../../../apps/game/src/enemies/fishfolk-scout.ts) | `rupture` (E) 1% → 10%; `crude-strike` (E) 1% → 10%; `fleet-footed` (D) 20% → 7%; `scouts-treads` (D) 10% → 7%; `raiders-belt` (D) 10% → 7% |
| [Water Elemental](../../../apps/game/src/enemies/water-elemental.ts) | `tidal-pulse` (B) 1% → 2%; `stream-of-life` (C) 1% → 4%; `tideglass-staff` (D) 100% → 7%; `tidecallers-ring` (C) 6% → 4%; `tidekeepers-circlet` (C) 6% → 4% |

## Verification and limitations

A temporary Bun probe instantiated all 22 registered enemies before and after
the edit, compared all 110 entries, and checked each chance against the tier
curve. All source identities, entry order, quantities, gold, combat spell lists,
passive lists, and tiers were preserved. Ninety probabilities changed.
Every current power-rated drop resolves to an assessment.

The full table, linked dungeon enemy counts, assessment files, and formulas below
are the reproducible inputs for the progression estimates:

- Expected quantity: `sum(enemyCount * chance * quantity)`.
- Chance of at least one drop: `1 - product((1 - chance)^enemyCount)`.
- Independent rolls apply to each entry; rates need not total 100%.
- [Reward delivery](../../../apps/server/src/workflows/battle-done.workflow.ts)
  uses defeated enemies, and the dungeon reward handler rolls once per distinct
  participating owner, not per character. Defeated enemies can still award
  rewards in a lost battle; a full clear is this comparison's unit.
- Claimed spells/passives and equipment are owned copies, not one-time unlocks.
  Expected copies are not expected new builds.

Validation: 76 tests across 11 targeted files pass, covering loot rules, item and
Library rules, content/equipment tiers, inventory claims, dungeon completion, and
route rewards. The initial run exposed a Library test expecting old chances;
that expectation was updated and the affected file rerun successfully.
Client/server and battle-harness TypeScript checks also pass.
[New loot regression tests](../../../tests/battle/rules/loot.test.ts) cover
actual-versus-legacy tiers, all current enemy chances, source restrictions,
assessment changes, Unrated content, and invalid metadata.

No production database or deployed runtime was changed. No production telemetry,
timing study, or progression playtest was performed. Unrelated working-tree edits
were preserved. Measure new build options, duplicates, acquisition tails, potion
consumption, and clear time to judge the pacing of these rates.

## External research

### General design recommendation

Set the intended time to a **useful reward**, then choose rates that support it.
Use targeted sources for sought-after equipment, reliable supply for ordinary
consumables, and a bounded route to essential progression items. Treat these as
design judgments to test against this game's encounter frequency, clear times,
inventory, and item sinks. None of the sources establishes a universal correct
percentage.

## 1. Improve useful rewards before increasing raw item counts

**Evidence.** Blizzard's Loot Reborn update reduced item volume while making
individual items more valuable and easier to evaluate. It also adjusted salvage
materials to account for the lower volume. Salvaging Legendary items could
unlock reusable powers or improve powers already stored in the Codex.
[Blizzard: Season 4, Loot Reborn](https://news.blizzard.com/en-gb/article/24077223/galvanize-your-legend-in-season-4-loot-reborn)

**Design judgment.** Track upgrades, desired copies, and useful resources per
encounter separately from total items. If duplicate equipment has no remaining
use, increasing its rate mainly increases inventory noise. Prefer changing its
pool, lowering its repeat frequency, or giving existing duplicates a modest
resource value if a suitable resource sink already exists. Do not invent a
large crafting economy solely to justify more drops.

## 2. Make desired rewards deliberately farmable

**Evidence.** Blizzard introduced endgame bosses with distinct Unique pools and
some exclusive rewards, explicitly responding to requests for more opportunities
to farm sought-after items and more varied endgame activities.
[Blizzard: Season of Blood boss rewards](https://news.blizzard.com/en-us/article/24009152/bite-down-on-darkness-in-season-of-blood)

**Design judgment.** Keep enemy and location identity in loot tables. Give each
important item a discoverable preferred source. A high overall equipment rate
does not imply a high desired-item rate: adding unrelated items to a weighted
pool can make a particular target rarer. Compare the probability of the named
item per eligible encounter, not just the chance of receiving anything.

## 3. Separate reward floors from lucky outcomes

**Evidence.** Grinding Gear Games distinguished drop quantity from drop quality
in its May 2025 item rework. It improved quality to limit item spam, guaranteed
a Rare from most Unique bosses, applied that campaign guarantee only on the
first kill, and retained it on repeated map boss kills. It also reduced
strongbox reward-count variance.
[Grinding Gear Games: Item Changes in Path of Exile 2](https://www.pathofexile.com/forum/view-thread/3774647)

**Design judgment.** An important first clear can guarantee a useful reward
while repeat farming retains uncertainty. Repeated difficult encounters should
also have a reasonable reward floor, such as useful materials or an appropriate
consumable. Keep signature equipment as the exciting additional outcome.
Judge harder encounters by useful rewards per unit of player effort, including
failure and access costs; a higher nominal percentage alone is insufficient.

## 4. Bound bad luck where it blocks the game

**Evidence.** Warframe's Citrine update awarded guaranteed fragments alongside
random mission rewards, with fragments exchangeable for those rewards. The
same update introduced separate probabilities for each Tauforged shard variant:
20% initially, increasing by 20 percentage points after a miss up to 100%, then
resetting after success. The UI displayed the current chance.
[Digital Extremes: Update 32.3](https://www.warframe.com/en/patch-notes/pc/32-3-0)

**Design judgment.** For essential progression, consider a first-clear reward,
an exchange using earned resources, or a clearly scoped miss counter. These are
alternatives; do not automatically add all three. Bound access to the actual
required item or a valid substitute: guaranteeing any item in a broad pool
does not bound the wait for the desired one. Optional prestige rewards can
tolerate longer tails. Any guarantee should specify its eligible encounters,
scope, reset condition, and player-visible rule.

## 5. Evaluate the unlucky tail, not only the average

For independent attempts with a fixed success probability `p`, the geometric
distribution gives mean attempts `1/p` and the probability of still having no
success after `n` attempts `(1-p)^n`.
[Janko Gravner: Probability notes, §5.5](https://www.stat.berkeley.edu/~aldous/134/gravner.pdf#page=54)

The following values are calculated from those formulas. Each attempt must
represent the same eligible roll; they are illustrative probabilities, not
recommended rates.

| Chance per attempt | Mean attempts | Attempts for 50% success | Attempts for 90% success | Attempts for 95% success |
| --- | ---: | ---: | ---: | ---: |
| 2% | 50 | 35 | 114 | 149 |
| 5% | 20 | 14 | 45 | 59 |
| 10% | 10 | 7 | 22 | 29 |
| 15% | 6.67 | 5 | 15 | 19 |
| 20% | 5 | 4 | 11 | 14 |
| 25% | 4 | 3 | 9 | 11 |

At 5%, about 35.8% still have no drop after 20 attempts. A mean is not a
deadline. Percentile counts use `ceil(log(1-q) / log(1-p))`. Pity systems or
changing probabilities require a different calculation.
