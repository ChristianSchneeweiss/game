# Game library

The **Library** navigation entry opens `/library`. It includes every registered
spell, equipment item, passive skill, and enemy, regardless of player ownership.
Search descriptions and names, filter by tier or recipients/slot, and sort by
name, tier, mana, cooldown, estimated damage, or enemy health as applicable.
Selected entries and filters are encoded in the URL.
Spells, items, and passives default to tier order S → A → B → C → D → E,
with names alphabetized within each tier. Enemies default to name order.

Details include targeting footprints, item attack profiles, enemy base stats,
combat kits, and drop chances. Links connect enemies to their abilities and loot,
and connect abilities and items back to their sources. Spell descriptions also
explain their effects and conditional behavior.

The catalogue is generated from the game package's schemas and factories in
`apps/game/src/library/catalog.ts`; it has no copied content catalogue or database
dependency. Changing an authored definition updates the library on the next
client build. The shared enemy factory also supplies the server through its
existing import path.

## Balance previews

Spell previews use detached tactical entities and the combat damage estimator.
Strength, Intelligence, Vitality, and Agility default to 20 and can be adjusted
locally. The caster and target share those attributes, have 100/100 health, and
have no equipment, passives, defense, critical chance, blessed, or affinities.
Basic Attack uses the current unarmed profile. Preview attributes reset on reload.

Estimated damage assumes one enemy and does not cap overkill. It is not DPS or a complete simulation: it excludes
damage over time and reactive effects, and conditional/multi-hit/delayed abilities
need their descriptions for context. Enemy stats show the base build, including
derived regeneration, before equipment or passives. Library controls do not save
balance changes or modify characters.

## Local verification

`/dev/library.html` renders the same screen through the Vite dev server without
requiring Clerk or the API. This development entry is not part of the production
build. The full `/library` route uses the normal game shell and local Clerk setup.

Run `bun test tests/battle/rules/library.test.ts` for catalogue coverage,
cross-reference validation, tactical preview/scaling, search, and numeric sorting.
