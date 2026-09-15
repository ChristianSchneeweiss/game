# Might and tiers in Shards of Affinity

This research preceded the [Might specification](spec.md) and the implemented
[Library controls](../features/library.md). Use the [v3 assessments](assessments.md)
for current reference conditions and Estimated values. Proposals and future-tense
discussion below describe the original research.

Every spell, item, passive, and enemy can have a power budget. **Might values a game element's overall power; its tier is derived from the Might range it falls into.** Crossing the next threshold promotes it to the next tier. An unusual effect contributes to that valuation through the advantage it creates: better actions, prevented enemy actions, additional useful targets, resource savings, or a new strategy.

Some effects also need explicit mechanical limits. Extra activations, copying, permanent recovery, and effects that invalidate an encounter cannot always be made healthy by subtracting a few damage points. Their duration, eligible recipients, stacking, recursion, and interaction with bosses belong in the design alongside their numerical budget.

The agreed direction is **higher tiers are stronger overall**, with both numerical strength and unusual abilities contributing to that advantage. A higher-tier ability can still be simple, and a lower-tier ability can still be interesting. The detailed framework below is a research proposal, not an accepted balance specification. Numerical examples illustrate methods; they are not calibrated tier assignments or results from combat simulations.

The chosen name for the valuation is **Might**. The Library will show a content entry's Might alongside its derived tier; its power allowance is its **Might budget**. Promotion thresholds grow exponentially, with entry to S at approximately five times a reference E valuation at comparable character stats. The presentation and calibration requirements are described in section 10; the [first calibration record](calibration.md) develops the chosen scale and current-rule probes.

## 1. What the precedents establish

Published design explanations support the budget idea, but do not establish a universal price list for unique abilities. In particular, community-style League gold efficiency should not be treated as Riot's complete internal balance formula.

| Evidence | Relevant finding | Application here |
| --- | --- | --- |
| Riot, *Addressing Mythics*, 2023 | Champion abilities and items compete for a total power allowance. Powerful item mechanics became easier to permit under a one-Mythic restriction. Item mobility also imposed constraints on future champion design. | Budget complete builds and define combination limits. Decide how much of a character's identity comes from collected equipment and spells. [^1] |
| Riot, *Updated Approach to Item Balancing*, 2020 | Item win rates reflect purchase timing, champion selection, and whether a player was already ahead. Numerically acceptable items can still create mandatory choices. | Compare controlled substitutions and examine dependence on particular items. Do not copy League's historical numerical thresholds. [^2] |
| TFT, *Remix Rumble Learnings*, 2024 | Broadly usable stat items improved flexibility but lost some creativity; composition-enabling mechanics were assigned to Artifacts. | Mechanical unusualness and numerical strength can be separate design dimensions. Their relationship is a product choice. [^3] |
| Grinding Gear Games, *The Design of Unique Items*, 2012 | Uniques could enable builds through special mechanics, with weaker ordinary modifiers or drawbacks. | A special effect can replace some ordinary power instead of being added for free. This is a historical philosophy, not a claim about every current Path of Exile unique. [^4] |
| Grinding Gear Games, developer Q&A, 2016 | Players discover unexpected combinations; some builds avoid a supposed drawback and receive its compensating benefit effectively for free. | Evaluate costs in the builds that will actually use an ability. [^5] |
| Paizo, *GM Core*, Building Items | Compare new effects with existing spells and items. Consider special abilities together with bonuses, activation actions, and actual frequency of use. | Use reference content to price unfamiliar effects. A nominal restriction only matters if it constrains play. [^6] |
| Wizards, *Play Design Lessons Learned*, 2019 | Oko and Teferi showed how effects can invalidate broad categories of options; expected counterplay proved less reliable than assumed. | Test what a strong mechanic removes from the game, as well as how much output it adds. [^7] |

These games differ from Shards of Affinity. League and TFT contain competitive economies that reset each match. Pathfinder has its own action system and a human game master. Magic has cards, formats, and rotation. Borrow the design principles; derive the conversion rates from this game's rules and intended experience.

Research also supports using simulations to refine point estimates. The STEP paper estimates unit costs from played matches, but reports important limitations around nonlinear relationships, unit combinations, and composition generation. A separate Pokémon study models both battle decisions and team construction because fixed teams miss changes in the metagame. Neither supplies transferable prices for this game's spells. [^8] [^9]

## 2. The starting point in this game

The current game is a small-party tactical dungeon RPG with one or two characters. A spell includes physical attacks, healing, and defensive actions; Basic Attack is also a spell. An extra action means an additional activation, with its own movement allowance and spell use. Health and mana persist through an expedition. These distinctions make activation value and expedition resources central to balance. [^10] [^11]

Current tier labels are not a reliable calibration set. The grid conversion documents 39 spells and explicitly defers tier and scaling redesign; most spells have carried A labels. The Library orders tiers S, A, B, C, D, E and exposes useful numerical previews, but those previews omit damage over time and reactive effects and do not represent complete combat performance. [^11] [^12]

Several existing rules make simple stat addition misleading:

| Current behavior | Budget implication |
| --- | --- |
| Iron Sword is E with +6 Strength; Oakwarden Staff is D with +8 Intelligence. Their Basic Attacks have different ranges and attribute scaling. | A weapon's budget includes its attack profile, attribute bonuses, and effects on its owner's other spells. |
| Int Armor is E with +10 Intelligence; Iron Cuirass is D with +12 armor. | Attribute counts alone cannot establish tier. Slots and the value of different attributes matter. |
| Intelligence contributes to mana regeneration; several abilities also scale with it. | One stat can increase both spell output and access to future casts. |
| Ordinary damage subtracts effective armor or magic resistance, then clamps at zero before later effects. | Defense has important breakpoints and interacts strongly with the size and number of hits. |
| Some spells affect local footprints; others retain global targeting. | Reach and target availability depend on encounter geometry and enemy composition. |
| Fleetfoot Gambit spends a cast to grant an additional activation next combat round. | Its benefit depends on who gives up an action and who receives one. |

These observations come from the local definitions and rules, not live player statistics. The implementation references are listed at the end. [^11] [^13] [^14] [^15]

The game does not need a credited gold economy to use budgets. Internal balance points are an authoring tool. Their conversion into shop prices, drop probabilities, or crafting costs would be a separate economic design decision.

## 3. Define what a tier promises

Use these dimensions separately in design records, even if the player interface eventually combines some of them.

| Dimension | Question it answers |
| --- | --- |
| Tier, E–S | Which Might interval contains this option's valuation? |
| Progression and scaling | How does it behave as the character's attributes and opposition grow? |
| Mechanic | What distinctive action, interaction, or build does it enable? |
| Acquisition rarity | How difficult is it to obtain? |
| Complexity | How much must a player understand to use and respond to it? |

No new item-level or upgrade system is required to make these distinctions. Initially, “progression stage” can simply mean specified low, middle, and high attribute/build snapshots. Those snapshots must be chosen from the intended progression curve before numerical tiers become authoritative.

### Higher tiers and early content

Two coherent progression models are available:

| Model | Result | Main cost |
| --- | --- | --- |
| Strong replacement progression | Higher-tier versions generally replace lower-tier options with the same role. | Much of the early collection becomes temporary. |
| Stronger options with continuing niches | Higher tiers offer more power or a stronger capability; some lower-tier choices remain efficient, reliable, or particularly suitable. | Costs and weaknesses must remain meaningful in mature builds. |

The intended direction is real overall upgrades. Let straightforward early equipment and spells become obsolete when an improved replacement is earned. Preserve selected lower-tier niches through low resource costs, short recovery, reliable targeting, or valuable setup interactions where that improves build choices. There is no requirement that every early spell remain competitive with top-tier content.

There is a real constraint here: if two options occupy the same slot, have the same availability and costs, and one does everything better, the weaker option has little mechanical reason to be chosen. Scarcity can postpone that comparison. For permanently owned content, scarcity usually stops constraining the player's battle decisions once the item is acquired.

Higher tier therefore follows a higher overall valuation, with some situational exceptions in actual play. A modest low-tier action may still be the correct choice when conserving mana or finishing a weakened enemy. However, if its supposed low-cost advantage never changes available actions, it is not a functioning niche. An ineffective spell cannot earn S from its name or intended design: its Might must reach the S threshold, supported by comparisons with reference content.

### Mechanical permission

A provisional progression could move from direct effects in E/D, through stronger combinations and positional payoffs in C/B, to substantial action manipulation and encounter-shaping effects in A/S. Treat this as guidance for pacing discovery, not a rule that novelty itself earns a high tier.

A simple S-tier attack is valid if its performance belongs there. An imaginative E-tier spell is valid if its effect remains appropriately bounded. Conversely, an ineffective extra-action spell does not deserve S solely because extra actions sound powerful.

## 4. A practical budget model

The authoring workflow has three layers:

1. **Estimate the components.** Useful damage, recovery, protection, control, reach, resource effects, and synergy establish an initial allowance.
2. **Measure the complete option in context.** Compare whole casts or builds under the same resource, progression, and encounter conditions.
3. **Apply mechanical limits.** Check prohibited loops, denial of interaction, and encounter bypass independently of the average score.

The first layer makes design fast. The second catches nonlinear interactions. The third addresses failures that a higher point price cannot repair.

### Separate comparison families

Use different reference comparisons for spells, weapons, armor, and passives. They share an outcome vocabulary, but they do not spend the same opportunities.

A spell competes for a loadout slot, an activation when used, mana, and future availability. A weapon changes a persistent build, including Basic Attack. A passive can act repeatedly without spending another cast. An enemy contributes as part of an encounter, where its teammates, placement, and control effects matter.

Define 100 points as the contribution of an agreed reference within a family and progression stage. A 100-point armor piece and a 100-point spell are **not interchangeable quantities** unless their reference contributions have deliberately been normalized against a common whole-build objective.

For weapons, compare against another weapon in that slot. Comparing every new weapon with being unarmed would hide displacement costs. For spells, keep two questions separate: does equipping this spell improve the available build, and when is casting it better than the available alternative?

### The authoring estimate

A useful initial ledger is:

> Useful output + useful prevention + tactical access + enabling value, with real costs and interactions evaluated in context.

Avoid a universal formula such as “one stun = 30 points” or “one tile of range = 5 points.” Those can become local estimates after a reference environment exists. They are unreliable as global laws.

For repetitive numerical effects, the estimate can use expected magnitude, effective recipients, actual activations, and useful duration. For unusual effects, estimate the difference they make compared with a reference action or build. Record a plausible range and confidence level when evidence is limited.

Do not count the same gain twice. A simulation already capturing the damage and healing produced by an extra activation should not receive another full “extra activation bonus.” Likewise, damage that kills an enemy already changes future enemy actions; adding a separate kill-denial reward needs careful accounting. If the outcome comparison already includes mana depletion, delayed delivery, and the forgone action, do not subtract those costs again from its result.

### Outcome measurements

Keep a small vector of measurements before compressing anything into points:

- Clear probability and surviving party members.
- Resources carried into the next encounter.
- Activations or rounds required to finish.
- Burst damage, useful healing, and enemy activations denied.
- Setup investment and performance in the intended build.

Choose the primary objective for each experiment. A boss test may prioritize survival and a reliable kill; an attrition test may prioritize expedition completion. Remaining HP is not universally interchangeable with damage, and a 100% clear-rate test may need harder encounters to distinguish alternatives. Any weighted utility must define units and direction: more survival is beneficial, while more rounds might be costly. Keep explanatory measurements separate when they overlap; damage, resulting kills, prevented attacks, and improved survival must not all automatically earn independent rewards for the same event.

If a scalar becomes useful, one possible normalization is:

```text
score(x) = 100 × weighted contribution of x
                 / weighted contribution of the family reference

contribution = outcome with the tested option
               − outcome with the declared baseline replacement
```

Use the same scenarios, objective, baseline, and progression stage for numerator and denominator. The reference contribution must be positive and sufficiently large to measure. A nearly zero reference makes this ratio unstable; retain the raw outcomes instead. This is a proposed calibration method, not an established formula for the game.

### Tier spacing

A geometric threshold curve implements the agreed exponential progression:

```text
reference value = 100
promotion threshold(step) = round(100 × 5 ^ (step / 5))
step = 1 for D, 2 for C, 3 for B, 4 for A, 5 for S
```

Starting from a reference E valuation of 100, each step multiplies the threshold by approximately 1.37973 before a single rounding step. The proposed canonical integer ranges are:

| Tier | Might interval |
| --- | ---: |
| E | 0–137 |
| D | 138–189 |
| C | 190–262 |
| B | 263–361 |
| A | 362–499 |
| S | 500 and above |

The range model and approximately fivefold exponential growth are agreed design decisions. The concrete integers use 100 as the normalization convention for this first calibration. That is a reference inside E, not its minimum: weaker content remains E. The S entry threshold is five times that reference; not every possible E/S pair has an exact 5:1 ratio. S is currently the highest grade and has no promotion beyond it; finite design limits still apply to each S ability.

Use Might as the source of truth: 189 is D, 190 is C, 499 is A, and 500 is S. Numerical payloads and special effects need calibration to justify their Might. Do not reverse this relationship by assigning every existing A spell 362 points. Account for intended optimized performance; averaging weak generic use with a dominant specialist case can disguise an obvious best choice for that specialist.

## 5. Scaling belongs inside the budget

Balancing a spell at one attribute value is insufficient. A modest base value with a large coefficient can overtake a stronger early spell; a coefficient that itself grows with an attribute can eventually overwhelm a linear progression.

For a simple damage formula, start with:

```text
damage = base + strength coefficient × Strength
              + intelligence coefficient × Intelligence
```

All terms spend the same allowance. For `D = b + cI`, increasing both `b` and `c` by 20% increases damage by exactly 20% at fixed Intelligence; it does not compound into a 44% increase. Multiplication can arise when damage per hit, useful target count, cast frequency, or other interacting factors rise together. Evaluate that combined growth rather than treating each increase as independent budget headroom.

Prefer simple linear scaling for the first calibration pass. Keep nonlinear formulas only when their growth is a deliberate part of the ability's identity and remains bounded over supported progression. Numerical magnitude can grow with attributes without also growing duration, number of targets, trigger frequency, and resource efficiency.

Use at least three progression snapshots and inspect each formula breakpoint. As a diagnostic illustration, the current Arcane Channeling formula is:

```text
Intelligence × (1.5 + 0.1 × floor(Intelligence / 20))
```

That produces 32 raw damage per target at 20 Intelligence, 85 at 50, 200 at 100, and 500 at 200. The values are direct arithmetic from the definition. The function grows approximately quadratically at high Intelligence, with jumps at multiples of 20. Global targeting and its charging restriction still have to be evaluated separately. This calculation does not establish that the spell is overpowered at any actual progression stage. [^16]

Percent-of-target-health effects deserve another progression axis: target health. Their payoff can rise dramatically against a boss even when the caster's attributes remain unchanged. Relative defenses, party size, and enemy density should likewise vary in validation.

## 6. Pricing unusual abilities

| Effect | Starting valuation | What must also be checked |
| --- | --- | --- |
| Direct damage | Useful damage after defenses and overkill, with actual target availability. | Kill thresholds, concentration of damage, reactive hooks. |
| Damage over time | Damage actually delivered before death, cleanse, or encounter end. | Application opportunity, stacking, clock semantics, delayed kills. |
| Healing or shields | Health restored or damage absorbed when it matters. | Overheal, expiration, preserving a future activation, expedition carryover. |
| Stun or other action denial | Value of activations the target actually loses. | Target importance, timing, immunity, repeated denial, solo bosses. |
| Extra activation | Recipient's additional useful action and movement, compared with the caster's forgone alternative. | Delay, survival, available spells, mana, lifecycle effects, recursion. |
| Area or global effect | Joint outcome across actual recipients and access to otherwise unreachable targets. | Formation, density, enemy deaths, shared versus independent random rolls. |
| Armor or penetration | Change in actual damage over the relevant attack distribution. | Many small hits versus one large hit, zero-damage thresholds. |
| Summon | Contribution over its life, including damage absorbed, occupied space, and actions. | Separate turns, movement blocking, lifetime, count, inheritance, summon-generated summons. |
| Cleanse, immunity, resurrection | Outcomes recovered from a defined threat or failure. | Breadth of threats bypassed, repeated use, future resources and activations restored. |
| Copying, resetting, refunds | Best eligible effect or future action sequence enabled. | Restrictions that disappear with new content; loops and resource generation. |

Summons, resurrection, and copying are design examples here, not claims that these are current playable features.

### Restrictions must bind

Paizo's item-building guidance explicitly warns that a limited-use bonus can be effectively permanent if the relevant opportunity occurs no more often than the use limit. Its action guidance also recognizes the substantial advantage of delivering an effect with fewer actions. [^6]

Applied here, increasing a cooldown from six to eight may change nothing in a short fight where both versions can only be used once. A nominal mana cost may become weak compensation in a build with abundant regeneration. A low-health requirement can become reliable setup if it is cheap and safe to maintain that state. Delayed damage is less costly if its intended victims cannot meaningfully escape or interfere.

This does not mean ignoring those restrictions. Measure their actual effect, including what building around them costs. If a specialized build spends several slots to eliminate a drawback, those sacrificed slots belong in the whole-build comparison.

### Mechanical limits

Some limits should apply across all tiers. A tier should never purchase an unintended infinite sequence. Other limits can deliberately widen at high tiers.

For each unusual mechanic, explicitly specify eligible recipients, frequency, duration clock, stacking, trigger origin, resource payment, and behavior against exceptional enemies. For extra activations, decide whether an additional activation may create further activations. For reactive effects, decide whether triggered damage can trigger the same effect again. For summons, define count, lifetime, and action ownership.

For bosses, choose an authored control policy: ordinary vulnerability, reduced denial, escalating resistance, or a different payoff. Avoid assuming blanket immunity is necessary, since that can erase control builds. The policy must be visible enough for players to plan around it. These are proposed design decisions, not assertions about current boss rules.

## 7. Worked examples

### Fireball and a staff attack: establish the anchor first

Current Fireball has 0–20 base damage plus 0.10 × Intelligence, costs 10 mana, and has cooldown 2. Oakwarden Staff gives Basic Attack 0–15 base damage plus 0.25 × Intelligence, with zero mana and cooldown. Both use magical damage and single-target range 1–3 under the conversion defaults. [^11] [^17]

For the same caster with the stated **already modified** Intelligence:

| Intelligence | Fireball raw midpoint | Staff Basic Attack raw midpoint |
| ---: | ---: | ---: |
| 20 | 12 | 12.5 |
| 50 | 15 | 20 |
| 100 | 20 | 32.5 |

These are pre-defense roll midpoints, not simulated average outcomes. Fireball has a different damage range, and discrete mitigation, rounding, critical effects, and reactive interactions can change comparisons. The staff's +8 Intelligence is already included in the stated caster value; adding it again would be an error.

The result is enough to identify a calibration priority: the current A label and resource cost do not establish Fireball's intended advantage over the free ranged attack. Decide whether Fireball should deliver stronger immediate damage, serve a specific interaction, or occupy another deliberate niche before using it to price the rest of the catalogue.

### Damage plus stun: a local estimate

Consider an invented reference scenario where an ordinary action deals 20 useful damage. A candidate action deals 12 and has a 50% chance to prevent one enemy activation that would otherwise deal 18 useful damage. Assume equal action/resource costs, an enemy that survives either attack, no cleanse or immunity, no later interaction changes, and equal local value assigned to HP removed and HP preserved.

```text
reference proxy = 20
candidate proxy = 12 + 0.50 × 18 = 21
relative proxy = 105% of the reference
```

This makes the special effect priceable in a narrowly specified case. It does not make “stun = 9 damage” a general rule. The target might instead heal, enable allies, or lose an encounter-defining attack. If it would die before acting anyway, the stun adds no denial value. Repeated control might remove all meaningful opposition even when a single cast looks reasonable.

### Fleetfoot Gambit: transfer, timing, and specialization

Fleetfoot Gambit currently costs 50 mana with cooldown 8 and grants one extra activation in the next combat round. The extra occurrence is appended through the turn-order effect; the tactical rules grant fresh movement to an actionable activation. [^11] [^15]

Consider an invented two-character scenario. The support's best alternative now is worth 12 units of useful output. The ally can use the granted activation for 40. Assume the support would otherwise have the same future actions, the extra action does not displace one, and all other consequences are held fixed. If there is an 80% chance the extra activation remains usable, its initial net proxy is:

```text
0.80 × 40 − 12 = 20 units of additional value
```

Mana spending and its effect on later casts still have to be included. If the target only produces 12, that same simplified trade becomes 9.6 − 12 = −2.4 before mana consequences. Those are illustrative scenarios, not measured Fleetfoot results.

Self-casting often resembles exchanging an action now for one later rather than creating a free net action. It can still change positioning, timing, cooldown availability, and other activation-dependent behavior. The intended specialist case must include the strongest eligible partner and actual future spell availability. A damage-only Library preview cannot rank this spell meaningfully.

### A unique weapon: account for the sacrificed weapon

Imagine a staff that gives less Intelligence than the ordinary same-tier staff but makes healing mark an enemy; the next qualifying attack consumes that mark for bonus damage. Price its actual added damage and setup benefit across a representative sequence, while measuring the damage, healing, and mana regeneration lost from reduced Intelligence.

Define whether the mark triggers once per cast or once per recipient, whether repeated healing overwrites it, and whether triggered damage can apply or consume another mark. A multi-target heal must not accidentally multiply the bonus beyond its intended allowance.

The final comparison is the complete healer-and-partner build against the build using the reference staff. If the mark's output is already measured there, do not add a separate arbitrary synergy premium to that measured result. An initial designer estimate can reserve room for uncertainty, but that reserve is not an empirical price.

### Final Verdict: separate the threshold case

Current Final Verdict deals physical damage with an 18–24 base and 0.8 × Strength scaling normally. At or below 10% target health, it replaces the Strength contribution with the target's maximum health. Defenses and the remaining damage pipeline still apply. It is not implemented as an unconditional execution. [^18]

Test targets just above and at the threshold, ordinary enemies and bosses, and low and high physical defense. Count actual remaining health removed and the enemy actions avoided. Adding thousands of raw damage against a nearly dead boss does not mean thousands of useful damage. Conversely, reliably bypassing a dangerous final phase could be disproportionately valuable if such a phase exists in a future encounter.

### Defense and dungeon recovery

With the current flat-defense structure, consider attacks without criticals, penetration, or reactive effects. Twelve armor changes a 10-damage hit to zero and a 30-damage hit to 18. Two 15-damage hits fall from 30 combined damage to 6; one 30-damage hit falls to 18. The same nominal attack total therefore gives armor very different value. [^14]

Now combine protection with persistent recovery. If a party can hold one harmless enemy alive and recover resources repeatedly, a spell that looked modest in an ordinary fight could undermine expedition attrition. This is a scenario to test, not a demonstrated exploit. The intended design must decide whether recovery through safe stalling is allowed, limited, or opposed by encounter pressure.

## 8. Calibration and validation

Start with a small collection of references: a direct melee attack, a ranged attack, a heal, a defensive option, a simple weapon, and simple armor. These define understandable comparisons before the unusual mechanics are assigned final tiers.

Build a scenario set that covers both authored content and deliberate stress cases:

| Axis | Required coverage |
| --- | --- |
| Party | Solo character and two-character party. |
| Progression | Intended early, middle, and late builds; important scaling thresholds. |
| Opposition | One substantial enemy, several weaker enemies, mixed threats, boss cases. |
| Geometry | Clustered and spread formations, access restrictions, different board sizes. |
| Duration/resources | Short fight, long fight, low initial mana, successive expedition encounters. |
| Build investment | Ordinary use, intended optimized use, combinations seeking to bypass costs. |
| Decisions | Straightforward use, purposeful setup, survival play, and human playtests. |

Choose scenario weights according to the intended game. Keep a separate stress suite: a rare but deterministic loop should not disappear into a low average weight. Synthetic stress tests establish mechanical behavior; authored encounters establish relevance.

Use controlled replacements and repeatable seeds. Compare the same starting builds, resources, maps, opponents, and decision policy with one option changed. Reusing seeds is useful, but different spells can consume randomness differently; the same seed alone does not guarantee matched random outcomes. Run enough seeds to report uncertainty and investigate close results.

Measure ordinary and optimized use separately. Reoptimize plausible builds around the candidate instead of assuming every ability should excel inside a build designed for something else. Also compare how much each build sacrifices to enable its payoff. Automated results remain dependent on the quality of the decision policies; a bot that never sets up combinations cannot validate combo abilities. The research on point costs and metagame discovery supports this methodological caution. [^8] [^9]

For each candidate, retain the estimated tier, observed outcomes, uncertainty, intended strengths, and failure cases. A narrow option can intentionally outperform its tier's reference in its niche. Among alternatives of comparable tier and investment, it should not become mandatory across most situations, or erase major encounter systems, unless that is the explicit design goal. A stronger tier replacing earlier content is compatible with the intended progression.

Do not optimize a PvE game toward a universal 50% win rate. Set desired challenge and attrition by encounter and progression. Competitive balance papers provide methods for comparison, not the appropriate success target for this dungeon game.

### Suggested acceptance criteria

An option is ready for a tier assignment when it has an identifiable role, an appropriate contribution under the agreed reference conditions, understood specialist performance, and no unresolved violation of its mechanical limits. Resource restrictions must demonstrably affect choices where they are used as compensation.

Numerical tolerance bands should follow observed variability and the desired separation between tiers. Before those exist, use “provisional” rather than an exact score that implies unsupported confidence. Human playtests should still assess clarity, satisfying decisions, and whether the promised distinctive ability actually feels useful.

## 9. A compact authoring record

The first version can be a table or document. It does not require a generic effect-pricing engine.

| Field | What to record |
| --- | --- |
| Identity | Name, content family, intended tier, mechanical role. |
| Reference | Replacement option, progression snapshots, encounter set. |
| Output | Base numbers, coefficients, useful target count, duration. |
| Cost | Activation, mana, cooldown, setup, occupied slots, foregone alternatives. |
| Special rules | Timing, eligible recipients, stacking, trigger origin, recursion and boss policy. |
| Intended build | Partners and investments needed for the promised payoff. |
| Performance | Ordinary, optimized, and stress-case outcomes, with uncertainty. |
| Decision | Provisional tier, supported weaknesses, unresolved questions. |

Apply this workflow to a few contrasting current abilities before the full catalogue: Fireball, one heal, one stun attack, Fleetfoot Gambit, Final Verdict, Arcane Channeling, and the existing weapons and armor. This selection tests the framework's difficult assumptions without inventing new content first.

Balance changes should eventually follow the game's existing frozen-build and rules-version compatibility approach. This research does not change executable content, saved characters, or replay behavior. [^11]

## 10. Naming and Library presentation

The chosen name is **Might**, used consistently in the Library and balance documentation. Its unit can simply be **Might**: an ability has 145 Might. Define it as the authored valuation of a content entry's overall contribution, including offensive, defensive, supportive, and unusual effects. It is separate from the existing Strength attribute.

| Candidate | Strength | Limitation |
| --- | --- | --- |
| **Might — selected** | Short, forceful, and appropriate to combat. | Needs a clear definition covering support and defense as well as offense. |
| **Power Rating / Power** | Clear, broad, and easy to explain beside a tier. | Functional rather than distinctive. |
| **Potency** | Concise and well suited to a fantasy setting. | May suggest magical or consumable strength more than armor or movement. |
| **Essence** | Strong thematic potential. | Suggests an ingredient or spendable currency; would need more explanation. |

Use **Might budget** for the designer's power allowance, and **Might** for the valuation assigned to a particular piece of content. A designer can choose an allowance within a desired tier's interval, but the completed content must justify its assessed Might; the derived grade follows that value. Might includes the contribution of its special effect as well as its ordinary numbers.

The name and intent to show it in the Library are agreed. The presentation below is a proposal; this report does not add the feature to the application.

### Proposed display

A compact Library row or card can show:

```text
D    Might 145
```

This is an illustrative layout and value, not a rating of current content. The tier is derived from the value: 145 falls in D. Store whole-number Might and use those same integers for display and threshold checks so an entry never displays 190 with a D badge.

In the detail view, show the rating, its status, and a short explanation of the ability's main strength. For a conditional ability, include the intended use: for example, “Strongest when a support grants a prepared ally another activation.” Detailed authoring ledgers belong in an optional balance view rather than on every card.

The initial model uses references by content family. Its public explanation must therefore say **“Might rates overall power, including special effects, relative to other content of this type under standard conditions.”** Keep sorting and comparisons inside the relevant spell, weapon, armor, or passive category. If a single cross-category number is desired, first normalize those references to a common whole-build contribution. Do not silently present unrelated 100-point baselines as universally comparable, or sum them into party Might.

Might should be a fixed authored value for that content definition. It updates when balance changes or an explicitly rated upgrade changes the definition. Library attribute-preview sliders continue to calculate context-dependent damage; they do not silently rewrite authored Might. This keeps tier and Might stable while still letting players examine build-specific performance.

### Unrated content and filtering

The existing catalogue lacks a calibrated reference set. Show **Might —** with an **Unrated** explanation until an ability has been assessed. A zero would imply measured absence of power. Provisional assessments can show **Might ~145** with an **Estimated** label and a derived D tier; the number must come from an actual assessment. Any retained old tier is explicitly a legacy grade, not a Might-derived result.

Once ratings exist, support Might sorting and a numeric range filter alongside the existing tier filters. Sort unrated entries consistently after rated entries in either direction. Make numeric Might, status, and comparison family explicit in the catalogue's data so text such as “~145” does not become the underlying sortable value.

The useful first Library delivery is a small calibrated set covering simple and unusual abilities, with the remaining entries clearly unrated. Assigning the same invented number to every A-tier spell would only repeat the current placeholder label.

## 11. Recommended decisions

Use Might as the Library-facing valuation and derive the tier from fixed, exponentially spaced thresholds. Higher tiers should be stronger overall, with broader mechanical possibilities toward the top. Keep acquisition rarity and complexity distinct. Allow stronger spells and equipment to replace earlier options, and preserve selected lower-tier niches where they create worthwhile choices.

Use comparable reference content to set initial numbers, then judge complete actions and builds across encounters. Apply explicit limits to unusual mechanics. Treat a special ability's price as a contextual estimate that improves with evidence, rather than an unknowable value or a permanent universal constant.

The intended progression uses exponential promotion thresholds, reaching S at approximately five times a reference E valuation at comparable character stats. The next calibration work is to establish useful reference abilities and test how numerical payload, resource restrictions, and special effects contribute to Might. The [first calibration record](calibration.md) develops those comparisons.

## Sources

External sources were consulted in September 2026. Dated developer articles are evidence of the design reasoning at publication, not assertions that their historical systems or balance targets remain current. All proposed coefficients, score definitions, limits, and hypothetical examples in this report are analytical recommendations unless explicitly attributed.

[^1]: Riot Phroxzon / Riot Games. [Quick Gameplay Thoughts: Addressing Mythics](https://www.leagueoflegends.com/en-us/news/dev/quick-gameplay-thoughts-addressing-mythics/). 14 September 2023. Power distribution between systems, interaction restrictions, and item complexity.

[^2]: Summoner's Rift Team / Riot Games. [/dev: Updated Approach to Item Balancing](https://www.leagueoflegends.com/en-us/news/dev/dev-updated-approach-to-item-balancing/). 14 September 2020. Selection bias, intended users, situational strength, and meaningful item choice. Historical framework.

[^3]: Riot Mort / Riot Games. [/Dev Teamfight Tactics: Remix Rumble Learnings](https://teamfighttactics.leagueoflegends.com/en-us/news/dev/dev-teamfight-tactics-remix-rumble-learnings/). 20 February 2024. Broad core items, creative Artifacts, and restrictions on high-end combinations.

[^4]: Chris Wilson / Grinding Gear Games. [Dev Diary: The Design of Unique Items](https://www.pathofexile.com/forum/view-thread/55170). February 2012; page rendering and search indexing differ by one calendar day. Historical design goals for unique mechanics, ordinary modifiers, and drawbacks.

[^5]: Chris Wilson / Grinding Gear Games. [Developer Q&A Answers](https://www.pathofexile.com/forum/view-thread/1696913/page/1). 5 July 2016. Unanticipated combinations, changing perceived power, and avoidable penalties.

[^6]: Paizo. *Pathfinder Second Edition GM Core*, Building Items, beginning p. 130, [rules text](https://2e.aonprd.com/Rules.aspx?ID=2923), reproduced in Archives of Nethys. Remastered rulebook, 2023. Comparisons, special abilities, activation costs, and effective use frequency. The linked rules page does not provide a separate publication timestamp.

[^7]: Bryan Hawley / Wizards of the Coast. [Play Design Lessons Learned](https://magic.wizards.com/en/news/feature/play-design-lessons-learned-2019-11-18). November 2019; the page currently displays 19 November, while its URL records 18 November. Broad invalidation, Oko/Teferi, and assumptions about counterplay.

[^8]: George E. M. Long, Diego Perez-Liebana, and Spyridon Samothrakis. [STEP: A Framework for Automated Point Cost Estimation](https://repository.essex.ac.uk/39193/1/STEP-ToG24.pdf). *IEEE Transactions on Games* 16(4), 927–936, 2024. DOI: 10.1109/TG.2024.3450992. Accepted manuscript, particularly methods and conclusion. Simulation-based costs and limitations involving nonlinear relationships and combinations.

[^9]: Akash Saravanan and Matthew Guzdial. [A Framework for Predicting the Impact of Game Balance Changes through Meta Discovery](https://arxiv.org/html/2409.07340v1). Preprint, 11 September 2024; subsequently published in *IEEE Transactions on Games*. Sections III–V discuss battle agents, fixed-team limitations, and adaptive team construction. Findings concern competitive Pokémon, not this game's performance.

[^10]: Local project: [Domain model](../../CONTEXT.md) and [project overview](../../README.md). Party, spell, activation, and expedition definitions.

[^11]: Local project: [Tactical grid spell and weapon conversion](../features/tactical-grid/spell-conversion.md), recorded 14 September 2026, and [weighted dungeon routes](../features/branching-dungeon-milestone.md). Targeting, weapon formulas, movement, provisional tiers, compatibility, and expedition resource changes.

[^12]: Local project: [Game library](../features/library.md). Tier ordering and preview limitations.

[^13]: Local implementation: [equipment factory](../../apps/game/src/items/equipment/item-factory.ts), [Int Armor](../../apps/game/src/items/equipment/int-armor.ts), and [BaseEntity attributes and regeneration](../../apps/game/src/base-entity.ts#L170). Equipment tiers, attribute bonuses, and derived regeneration. Exact source reads take precedence over older milestone descriptions where numerical rounding differs.

[^14]: Local implementation: [damage and healing calculator](../../apps/game/src/calculator.ts) and [damage module](../../apps/game/src/modules/damage.module.ts). Flat defense, rounding, applied health changes, and estimator boundaries.

[^15]: Local implementation: [Fleetfoot Gambit](../../apps/game/src/spells/fleetfoot-gambit.ts#L6) and [extra-action effect](../../apps/game/src/effect/extra-action.effect.ts#L6). Cost, cooldown, and next-round turn-order addition.

[^16]: Local implementation: [Arcane Channeling](../../apps/game/src/spells/arcane-channeling.ts#L72). Nonlinear Intelligence formula, charge behavior, and surviving original targets.

[^17]: Local implementation: [Fireball](../../apps/game/src/spells/fireball.ts#L4) and [BaseSpell](../../apps/game/src/spells/base/base.spell.ts). Damage definition, mana payment, and cooldown bookkeeping; weapon comparisons use the conversion reference above.

[^18]: Local implementation: [Final Verdict](../../apps/game/src/spells/final-verdict.ts#L5). Threshold, maximum-health substitution, and normal Strength scaling.

Local implementation observations describe the working tree inspected on 14 September 2026, whose HEAD was `bec470f`; that identifier alone does not certify all working-tree files. The original research stage used source inspection and arithmetic. Subsequent controlled engine probes are documented in the [calibration record](calibration.md); no player-outcome measurements have been collected.
