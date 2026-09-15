# Engine probes for Might calibration

These measurements are a reproducible first calibration dataset, **not assigned Might values, tier recommendations, or representative encounter win rates**. They compare concrete decisions and capture timing that static spell descriptions miss. No gameplay source was changed.

Run from the repository root with its pinned Bun 1.4.0:

```sh
bun --no-env-file test scripts/might-calibration/engine.test.ts
bun --no-env-file scripts/might-calibration/run.ts
./node_modules/.bin/tsc --noEmit -p scripts/might-calibration
```

The recorded run used `/private/tmp/issue2-toolchain/node_modules/@oven/bun-darwin-aarch64/bin/bun` version 1.4.0. That temporary path is a local runtime convenience; use your own Bun 1.4.0 installation when reproducing. The runner imports only the game engine and Node filesystem helpers. It requires no environment variables, services, databases, or network. Results are written to [engine-results.json](engine-results.json): metadata, seed list, scenario definitions, mean outcomes, per-seed numeric rows (named by `runColumns`), and one complete representative trace per scenario. The JSON is deliberately compact; this document is its human-readable companion.

## Conditions and measurement

There are 53 scenarios, each evaluated with the same 64 fixed battle seeds `might-v1-000` through `might-v1-063`. These are deterministic samples, not exhaustive expectations or confidence intervals. Different spells consume different numbers of random draws, so a paired seed does not guarantee identical later attack rolls.

All fixtures use `BM`, grid rules version 2, real `BaseEntity`, spell factory and equipment factory, a 7×7 empty map, and fixed in-range positions. No movement is selected. Hero Agility 100, partner Agility 90, and enemy Agility 10 downward force a stable order. Base Strength, Intelligence, and Vitality are 20 for the primary reference, with 10 and 50 as sensitivity inputs; these are synthetic attribute snapshots, not levels or claimed progression distributions. Unless a scenario states otherwise, actors have 1000 maximum/current HP and 100 maximum/current mana, no passives, critical chance, penetration, armor or magic resistance.

The real equipment bonus applies **once** when the entity joins BM. Staff cases therefore use effective Intelligence 18/28/58; sword cases use effective Strength 16/26/56. Iron Cuirass supplies 12 flat armor. Hero innate HP regeneration is Vitality÷2; mana regeneration is effective Intelligence÷5, rounded by the engine when applied. Enemy entities retain their real bot HP regeneration of 2. Regeneration remains enabled and useful resource changes are recorded separately from spell healing.

The caster uses the chosen special once, or whenever ready in cadence scenarios; other choices are Basic Attack. A partner attacks. Enemies pass unless the fixture explicitly requests retaliation. These choices isolate a mechanism and its foregone attack; they are not an optimizing agent. Real start, pre-turn preparation, spatial casting or passing, and post-turn cleanup are used. For a blocked actor, the harness calls the same public `postTurn(actorId)` that `BM.preTurn()` uses internally. This prevents a blocked final actor from making `preTurn()` prepare an out-of-horizon actor and grant an extra upkeep. A focused regression checks that boundary.

`rounds: 2` permits activations in zero-based rounds 0 and 1. Its final post-turn cleanup may already execute round2 start hooks; **all such executed boundary hooks are included in both the outcome ledger and final resources**, while no round2 activation is selected. Game-over stops early. `completedRounds` counts fully completed rounds, so a lethal first action can report zero despite consuming an activation. Useful damage and explicit healing come from the engine's v2 HP-change impacts in both `SPELL_CAST` and `EFFECT_TRIGGER` events after the initial snapshot, including HP caps, rather than raw formula output. Useful regeneration is reconciled from starting/ending resources and all those impacts. Costs are reported as both gross mana spent and actual ending mana; they are not subtracted twice. Regression tests attach real periodic effects to distinguish damage/healing from innate regeneration and exercise the boundary cutoff.

The JSON schema version is 2. Summary `enemyActivations` sums every enemy; the per-seed `enemy0Activations` column deliberately retains the first enemy's count for individual control comparisons. Summary `deadEnemies` is mean actual enemy deaths per run. `clears` and `defeats` separately count winning outcomes for the player's and enemy's teams; early termination alone never implies a kill or victory. Representative traces include `winningTeam`, `deadEnemyCount`, and effect-trigger impacts.

## Reference damage and healing

Means over the 64 seeds, against zero resistance/armor and enough missing/remaining HP:

| Base stat | Staff effective INT | Staff Basic Attack | Fireball | Cinder Wisp | Single Heal on injured self |
| --- | --- | --- | --- | --- | --- |
| 10 | 18 | 12.281 damage | 12.172 damage | 12.672 damage | 8.438 healing |
| 20 | 28 | 14.734 damage | 13.172 damage | 14.672 damage | 8.891 healing |
| 50 | 58 | 22.281 damage | 16.172 damage | 20.672 damage | 10.438 healing |

Each action costs one activation. Staff attacks spend no mana. Each listed spell spends 10 mana; staff, Fireball, Cinder Wisp and Single Heal share range 3. Fireball and Single Heal have authored cooldown 2; Cinder Wisp has cooldown 1. These mean outputs do not capture differences in roll distribution or finishing an enemy on a particular roll.

For injured-self healing, the caster starts at 500 HP. At the primary snapshot, both the heal scenario and its matched injured-staff baseline receive 10 HP from upkeep. The heal adds 8.891 useful HP; selecting the staff instead deals 14.734 damage. This establishes an opportunity cost without equating damage and healing. Single Heal cast at full HP adds zero useful HP and still spends its activation and 10 mana.

Over seven rounds, casting Fireball whenever ready with staff attacks in between deals 100.516 damage, versus 105.188 from seven staff attacks. Fireball is actually cast in rounds **0, 3, 6**, spends 30 mana gross, regenerates 20 useful mana and ends at 90 mana from 100. A cooldown of 2 currently means two intervening turns, not a cast every second round.

## Unusual effects and opportunity cost

| Scenario | Measured result | Cost and timing |
| --- | --- | --- |
| Fleetfoot on self, two rounds | 3 caster activations but 2 Basic Attacks, 30.578 damage; matched staff baseline has 2 activations/2 attacks and 30.375 damage | The extra activation replaces the action spent on Fleetfoot. Gross cost 50 mana; two later upkeeps restore 12 useful mana, ending at 62. The small damage difference is a sample/roll-stream difference. |
| Base-stat-10 support grants Fleetfoot to base-stat-50 sword partner, two rounds | 78.953 total party damage versus 69.266 for both actors attacking normally; partner acts 3 times versus 2 | Support sacrifices one attack and spends 50 mana, regenerates 4 and ends at 54. This is a basic-attack partner example, not the ceiling of skill synergies. |
| Arcane Channeling, base20 plus staff, one enemy | 0 damage by end of round0; 45 by end of round1; two staff actions instead deal 30.375 | One cast spends 40 mana. Its own cast end step consumes the first charge clock; round1 is blocked, then the discharge occurs. Caster can act again in round2. No second mana payment; no upkeep on the blocked turn. |
| Arcane Channeling, same actor, four surviving enemies | 180 total damage versus 30.375 for two staff attacks in the matched four-enemy fixture | All four original targets remain alive, opposing, and eligible. Extra useful targets multiply the payoff; this probe does not assume four recipients in every encounter. |
| Bulwark Bash whenever ready, four rounds with sword retaliation | 78.422 outgoing damage versus 57.078 for only sword attacks; enemy receives 2 activations instead of 4; incoming damage 28.641 versus 58.219 | Two guaranteed stuns, in rounds0 and3; zero mana. Remaining attacks are Basic Attack. These are actual skipped enemy activations; no extra universal stun-price bonus is added. |
| Final Verdict, base20 plus sword, healthy or 11%-HP target | 41.906 useful damage | 10 mana and one activation. |
| Final Verdict, 100/1000-HP target | 100 useful damage and a kill in all 64 seeds; sword replacement deals 14.281 | Raw maximum-health scaling is capped by the 100 HP left. Killing removes the target's activation; do not count both the full raw overkill and all future denied attacks as independent gains. |
| Final Verdict, same 100/1000-HP target with synthetic armor1100 | 0 damage and no kill in all 64 seeds | Deliberate stress case: the threshold effect still passes through ordinary defenses. This armor value is not a proposed normal enemy. |

Arcane scaling at base stats 10/20/50, including the staff's +8 INT, produces 27/45/99 damage per eligible enemy. The corresponding two Basic Attacks average 25.391/30.375/45.391. Across four enemies the Arcane totals are 108/180/396. A low-mana variant starting at 40 mana receives 6 from its first upkeep, pays 40, and ends at 6; it receives no regeneration while its next turn is blocked. This makes charge-related resource timing visible.

## Armor and conditional protection

| Attacker base Strength | Effective Strength with sword | Damage without armor | Damage against Iron Cuirass | Damage prevented |
| --- | --- | --- | --- | --- |
| 10 | 16 | 11.734 | 1.828 | 9.906 |
| 20 | 26 | 14.281 | 3.266 | 11.015 |
| 50 | 56 | 21.734 | 9.734 | 12.000 |

The cuirass's 12 armor is subtracted per hit, then floored at zero. Its prevented-damage fraction changes with hit size. A constant percentage defense valuation would conceal that relationship. These attack cases contain one hit; multi-hit encounters need separate probes.

Stone Bark multiplies armor by 1.25. Over two rounds of real sword retaliation, a zero-armor caster takes the same 29.625 mean damage with or without Stone Bark. With Iron Cuirass, casting Stone Bark changes mean incoming damage from 7.125 to 5.141: 1.984 additional prevented damage in this sequence. It also gives up the first staff attack (outgoing damage 14.938 versus 29.672), spends 10 mana, regenerates 6 and ends at 96. Its turn-clock duration expires at the caster's round1 end step, before that round's enemy retaliation; only the round0 hit benefits. This is a conditional, short-lived outcome, not a fixed global value for Stone Bark.

## What this supports next

These probes establish some necessary valuation inputs: replacement actions, actual cast cadence, useful HP changes, targets, foregone upkeep, and recipient strength. They identify cases where existing labels and numerical usefulness need separate review. They cannot turn those facts into a defensible single Might value without a chosen objective and weighting, a representative encounter suite, build opportunities and resource constraints.

The 1000-HP targets deliberately prevent accidental overkill outside the execution test. They are target dummies with scripted choices, so these tests say little about ordinary time-to-kill, survival, pathing, range access, movement, team composition, boss policies, or multi-encounter attrition. The next calibration should replace selected fixtures with representative game encounters and compare complete builds. No player-facing Might is inferred from the old tiers or from one damage ratio here.
