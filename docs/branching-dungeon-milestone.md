# Weighted branching dungeon routes

Implemented 11 September 2026, following the equipment milestone.

## Player flow

Starting an expedition from preparation now generates a dungeon map. The original
combat encounters remain the main stages. After each victory except the final
one, the party chooses a path before starting the next encounter. Forks roll two
paths 60% of the time, three paths 30%, and four paths 10%. The number of paths is
saved together with the offers.
Each path shows its rarity, effect, possible reward and cost. Chosen roads remain
highlighted, and a party marker shows progress.

The encounter catalog currently contains:

| Encounter       | Rarity   | Relative weight | Effect                                                                                                                                           |
| --------------- | -------- | --------------: | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Patrol          | Common   |              60 | Continue to the usual encounter.                                                                                                                 |
| Resting shrine  | Uncommon |              30 | Recover 30% maximum HP or 40% maximum MP, capped at each survivor's maximum.                                                                     |
| Treasure cache  | Uncommon |              12 | Take guaranteed E-grade gear, or risk a 50% chance of D-grade gear. Failure costs each survivor 15% maximum HP, leaving at least 1 HP.           |
| Elite encounter | Rare     |               8 | Next enemies gain 40% HP and 25% strength, intelligence and vitality. Victory has a 50% chance of extra D-grade gear for each participant owner. |
| Ancient vault   | Epic     |             0.5 | One D-grade equipment item for each participant owner. Appears at most once per run.                                                             |

Weights are relative selection weights, not percentages or final appearance
probabilities. Each fork samples without replacement; selecting one entry changes
the weights available to subsequent draws. A fresh run has fresh rolls. Offers
are saved when the run starts, so page reloads, reconnections and repeated reads
cannot reroll them. Treasure outcomes are also fixed per run and fork.

The catalog supports `legendary` rarity, arbitrary positive weights and
`oncePerRun`. Setting a weight to zero disables an encounter for future runs.
Once-per-run means one appearance on the entire generated map, even if the party
does not choose it. No legendary encounter or legendary equipment has been added
yet. Future encounters can reuse existing effects through the catalog; new
mechanics need an action, server effect and presentation.

## Persistence and combat

`dungeon_data.route` stores versioned forks with offer snapshots and decisions.
The server locks the run row, checks party authorization and the current wave,
validates that the offered room permits the requested action, then saves resource
changes and rewards in the same transaction. Identical retries return the saved
decision. A conflicting choice is rejected. Battle starts use the same run lock
and cannot pass an unresolved fork.

Shrines and traps change the expedition's saved resources, leaving roster base
resources intact. Fallen heroes stay fallen. Room loot uses the existing owned
reward and equipment collection path; it is scoped to the run and requester.
Claiming a reward does not allow a choice to be repeated for another copy.

Elite attributes are applied to fresh enemy instances before freezing the battle
build. Live combat and replay restore those frozen values. Elite victory loot is
part of the existing atomic battle-completion transaction, so duplicate completion
delivery cannot duplicate the bonus. The bonus roll is fixed per run and fork,
shared by the party, and cannot be rerolled by retries. The promised bonus odds
are saved when choosing the elite path; choices already made under the initial
balance retain their guaranteed reward. Defeat does not grant the elite bonus.

Apply `apps/server/migrations/manual/20260911_dungeon_routes.sql` before the new
server code. This additive migration has been applied only to the local OrbStack
`game` database. Existing runs keep their linear flow; API callers that omit
`branching` retain the existing behavior. The preparation UI enables branching
for every new expedition.

## Verification

- Five generation tests check deterministic maps, variation between seeds,
  distinct offers, the 60/30/10 path-count distribution, weighted frequency over 10,000 seeded runs, disabled entries,
  once-per-run epic and future legendary rooms, and single-encounter dungeons.
- Eleven PostgreSQL integration tests cover stage gating, authorization, invalid
  choices, capped recovery, fallen heroes, concurrent duplicate choices,
  transaction rollback, per-owner rewards, collection retries, both seeded
  treasure outcomes, vault rewards, a real five-wave elite run, and defeat without
  an elite bonus, failed bonus rolls and retries, and honoring already chosen
  elite rewards.
- Full battle suite before the balance adjustment: **557 passed, 3 failed**. The failures are the unchanged
  historical frozen-restoration checks for `live-six-entity`, `live-milestone-2`
  and `live-milestone-3` in `live-recordings.test.ts`.
- Client, server and battle-test TypeScript checks passed. Production Vite build
  passed with its existing large-chunk warning.
- React Doctor: **29 findings**, unchanged from the equipment milestone. The
  initial warning in the new offer card was resolved by moving static encounter
  descriptions outside the component. No diagnostic was suppressed.

Initial authenticated browser verification, before the balance adjustment, used local run `9pf0aibjve8d`. All twelve map
offers stayed identical after reloading at the first fork. The run then took an
Ancient Vault, collected both equipment rewards, and used a Resting Shrine. Its
preview and saved result agreed: Deshaun recovered 1 MP and Araceli recovered
12 MP, both reaching their maximum. Health recovery was disabled while both were
full. At the third fork the party chose an elite encounter; both Barkhide Shamans
appeared in live combat with their elite names and 84 HP instead of 60 HP. Battle
`5d2woarfowki` ended in victory and awarded the extra Iron Cuirass, which was
collected successfully. The run is left at the fourth fork, ready to choose a
path before the final boss. These are local development records, not portable
test fixtures.

## Balance adjustment

On request, fixed three-path forks were replaced by the 60/30/10 count
distribution above. Treasure weight dropped from 22 to 12, elite weight from 12
to 8, and vault weight from 2 to 0.5. Vaults now give one item; newly chosen elite
paths have a 50% bonus chance. Normal encounter drops still provide the baseline
rewards. Existing generated maps retain their saved path counts.

Across 10,000 five-encounter runs with seeds `balance:0` through `balance:9999`,
there were 24,066 two-path forks, 11,880 three-path forks and 4,054 four-path
forks: an average of 2.4997 paths. Assuming all battles are won and each choice
maximizes expected equipment quantity, expected extra route gear falls from
4.2896 to 2.32405 pieces per run, about 46% less. This estimate excludes normal
enemy loot and is a balance comparison, not a prediction of player behavior.

After this adjustment, all **32 focused dungeon tests** pass across four files,
including the five generation tests and eleven branching-route integration tests.
Client, server and battle-test typechecks pass. React Doctor remains at 29
existing findings. The preview's new run rolled 2, 2, 2 and 3 paths across its
four forks.
The refreshed preview is local run `q87wofzc9fpi`, left at its first fork after
winning battle `nuiiilvcad1x`. Its two choices, Patrol and Resting Shrine, occupy
two full columns with the remaining map preserved. The current production Vite
build also passes with the existing chunk-size warning.
