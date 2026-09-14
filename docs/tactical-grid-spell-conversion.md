# Tactical grid spell and weapon conversion — initial defaults

These defaults are included in [Convert all battles to configurable tactical grids with movement and tile targeting](https://github.com/ChristianSchneeweiss/game/issues/3). **Status — 14 September 2026:** All 39 spells and the initial weapon profiles are implemented locally; the [implementation and verification record](tactical-grid-implementation.md) describes coverage and outstanding deployment qualification.

This table covers all 39 current spell types and both current equipped weapons, plus the unarmed fallback. **These are the agreed starting defaults for the grid conversion, with Fireball explicitly kept single-target.** Board dimensions are configured per encounter, with 7 × 7 as the default. Spell offsets and ranges remain measured in tiles on every board size; global spells use the actual battlefield. These defaults remain easy to change later; a proper tier and scaling pass is deferred.

The accepted rules live in [the approved specification](tactical-grid-spec.md); [the feasibility and design notes](tactical-grid-feasibility.md) preserve the earlier discussion. Movement is a separate stat with base 3, refreshed each actionable activation including extra actions; movement can be spent in several commands before casting; casting ends the activation; footprints use coordinate offsets and presets; directional patterns rotate from north; range limits the selected center; an immediate attack needs at least one eligible enemy in its area; selected higher-level spells can remain global.

## Reading the assignments

- **Tile, range a–b:** choose a center whose Manhattan distance from the caster is within the inclusive range, then translate the footprint to it. Range 0 permits the caster's tile. Board edges clip the footprint; aiming range does not clip it.
- **Direction:** choose north/east/south/west and rotate the caster-relative pattern. The pattern defines reach; there is no additional radius parameter.
- **Caster:** automatically center the footprint on the caster. A self spell uses `single`; a nearby area can use `ringOne`.
- **Global:** no tile selection or range limit. Target eligibility still checks living entities and team relationships.
- **Enemies/allies:** recipients are relative to the caster's current team. Allies include the caster. Secondary self effects remain part of spell execution, independent of the main attack's footprint.

Initial presets, using positive x to the right and positive y downward:

```ts
const AREAS = {
  single: [[0, 0]],
  plus: [[0, -1], [-1, 0], [0, 0], [1, 0], [0, 1]],
  frontThree: [[-1, -1], [0, -1], [1, -1]],
  lineTwo: [[0, -1], [0, -2]],
  lineThree: [[0, -1], [0, -2], [0, -3]],
  ringOne: [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0],          [1, 0],
    [-1, 1],  [0, 1], [1, 1],
  ],
} as const satisfies Record<string, TilePattern>;
```

Lines affect every eligible enemy on their listed cells. They do not stop at the first actor. Allies are ignored, and obstacles follow the initial policy of blocking movement without blocking attacks. A different stopping behavior would need an explicit rule; it must not emerge from a projectile animation.

## Complete spell assignments

“Current recipients” describes executable targeting, including custom spell behavior, rather than relying solely on descriptions. Existing spell damage formulas, tiers, mana, cooldowns, effect chances, and durations remain the starting baseline. New weapon damage defaults are listed separately below. Changes in target capacity are recorded for the later balance pass.

| Spell type | Current recipients | Initial aiming and footprint | Initial recipients and execution notes |
| --- | --- | --- | --- |
| `basic-attack` | One enemy | Equipped weapon profile | Enemies; weapon supplies damage and scaling too. |
| `fireball` | One enemy | Tile, range 1–3, `single` | One enemy. Explicitly remains single-target. |
| `single-heal` | One ally, including self | Tile, range 0–3, `single` | One ally; retain healing formula. |
| `crude-strike` | One enemy | Tile, range 1–1, `single` | One enemy; retain Agility debuff chance. |
| `festering-blow` | All enemies | Direction, `frontThree` | Covered enemies; local cleave replaces global reach. Retain vulnerability effect. |
| `cinder-wisp` | One enemy | Tile, range 1–3, `single` | One enemy; a simple ranged magical attack. |
| `vital-strike` | One enemy, then caster healing | Tile, range 1–1, `single` | One enemy; caster still heals from damage dealt even though outside the target footprint. |
| `splinter-shot` | One enemy | Tile, range 1–4, `single` | One enemy; retain armor debuff chance. |
| `cinderbrand` | One enemy | Tile, range 1–3, `single` | One enemy; an applied burn stays on that entity when it moves. |
| `precise-thrust` | One enemy | Direction, `lineTwo` | All covered enemies; gains a second possible victim. |
| `soulflare` | One enemy, then caster healing | Tile, range 1–3, `single` | One enemy; preserve healing from damage dealt. |
| `charred-chains` | All enemies | Tile, range 1–3, `plus` | Covered enemies; vulnerability effect stays entity-bound after application. |
| `crushing-blow` | One enemy | Tile, range 1–1, `single` | One enemy; retain stun behavior. |
| `stone-bark` | Caster | Caster, `single` | Self armor buff; preserve executable self-only behavior. |
| `rootgrasp` | All enemies | Tile, range 1–3, `plus` | Covered enemies; preserve actual stun, not a newly invented movement-only root. |
| `verdant-smite` | One enemy | Tile, range 1–3, `single` | One enemy; retain armor debuff. |
| `natures-embrace` | All allies, including caster | Global | All allies; retains a powerful party-wide heal. |
| `lightning-surge` | All enemies | Global | All enemies; retain damage and existing stun-roll scope. |
| `stunning-strike` | One enemy | Tile, range 1–1, `single` | One enemy; retain stun chance. |
| `staggering-jab` | One enemy | Tile, range 1–1, `single` | One enemy; retain stun chance. |
| `battle-roar` | One enemy | Tile, range 1–2, `single` | One enemy; retain status-only stun attempt. |
| `torrent-spiral` | All enemies | Caster, `ringOne` | All enemies in the eight surrounding cells; retain actual physical damage and vulnerability behavior. |
| `tidepiercer-thrust` | One enemy | Direction, `lineThree` | All covered enemies; preserve the per-target defense-ignoring proc. Gains target capacity. |
| `ocean-blessing` | One ally, including self | Tile, range 0–3, `single` | One ally; retain stronger single-target healing. |
| `aqua-wave` | One enemy | Direction, `frontThree` | Covered enemies; gains target capacity. Its Agility debuff does not automatically reduce Movement. |
| `tidal-pulse` | All enemies | Tile, range 1–3, `plus` | Covered enemies; no artificial three-target cap. Preserve Agility debuff. |
| `stream-of-life` | Caster | Caster, `single` | Self healing, automatic aim. |
| `rupture` | One enemy | Tile, range 1–1, `single` | One enemy; bleed follows the entity after application. |
| `storm-pulse` | Up to three distinct random enemies globally | Global candidate pool | Keep up to three distinct random recipients, without replacement. Preview potential recipients, not a promised exact victim set. |
| `volt-lash` | Up to four random strikes globally; repeats allowed | Global candidate pool | Keep up to four sequential strikes, choosing from currently living eligible candidates for each strike. A surviving enemy can be hit again; stop if the candidate pool is empty. |
| `final-verdict` | One enemy | Tile, range 1–1, `single` | One enemy; retain current health-threshold damage calculation and damage pipeline. |
| `aegis-wall` | All allies, including caster | Global | All allies; retain existing shield behavior. This is not a physical wall or obstacle. |
| `bulwark-bash` | One enemy | Tile, range 1–1, `single` | One enemy; retain guaranteed stun subject to existing effect rules. |
| `earthshatter` | All enemies | Global | All enemies; preserve cast-level stun roll and the bonus for at least two successful applications. |
| `deflecting-stance` | One ally, including self | Tile, range 0–2, `single` | One ally; retain ability to protect a partner despite the first-person description. |
| `bladestorm-rhythm` | One enemy, attacked twice | Tile, range 1–1, `single` | One enemy; two rolls/attacks, with liveness checked between hits. |
| `iron-will` | One ally, including self | Tile, range 0–3, `single` | One ally; retain cleanse, defenses, and recipient-health-based conditional healing. |
| `arcane-channeling` | Captured enemy identities, delayed | Global at cast time | Retain original target identities; after charging, hit surviving original targets still eligible under current team rules. Movement does not dodge this global spell. |
| `fleetfoot-gambit` | One ally, including self | Tile, range 0–3, `single` | One ally; extra action retains existing scheduling and receives the agreed fresh Movement allowance. |

The retained global attacks are Lightning Surge, Earthshatter, and Arcane Channeling. Storm Pulse and Volt Lash retain global candidate pools with random victim selection. Nature's Embrace and Aegis Wall remain party-wide support spells. Other formerly global attacks gain local geometry. These are initial content assignments, not a rule granting every high-tier spell global reach.

## Weapon profiles

These are the accepted provisional starting values. Damage is rolled base damage plus additive contributions from the entity's current modified attributes, before the existing damage pipeline. All values remain configurable for the later tier and scaling pass.

| Profile | Aiming and footprint | Initial damage |
| --- | --- | --- |
| Iron Sword | Tile, range 1–1, `single`, enemies | Physical, base 0–15 + 0.25 × Strength |
| Oakwarden Staff | Tile, range 1–3, `single`, enemies | Magical, base 0–15 + 0.25 × Intelligence |
| Unarmed | Tile, range 1–1, `single`, enemies | Physical, base 0–8 + 0.10 × Strength |
| Enemy default Basic Attack | Tile, range 1–1, `single`, enemies | Physical, base 0–15, no scaling |

Basic Attack keeps its existing zero mana cost and zero cooldown. The weapon profile controls Basic Attack only; collected physical attack spells keep their own configured targeting and formulas. There are currently no spear, bow, or axe equipment definitions to migrate; examples of those weapons illustrate future extension. Enemy-specific profiles can override the fallback through the same configuration.

Support multiple scaling contributions as a list, not a single hardcoded scaling attribute. Use existing attribute names and damage types. Add concrete conditional behavior at one shared weapon evaluation point when a weapon needs it. The initial profiles do not need invented condition kinds. Profiles used by an active battle must stay consistent with its frozen build and rule version.

## Special execution rules

**Random targeting:** The shared targeting module resolves an eligible candidate pool. Ordinary attacks apply to every eligible occupant of their area. Storm Pulse and Volt Lash perform their existing random selection from that pool; they must not bypass it by querying unrelated enemies. Volt Lash resolves the global candidate pool afresh through the shared targeting module for each strike, preserving its current behavior after deaths or team changes. Random selection runs only on committed execution, never preview. Actual selected victims and strike order are recorded in resolved events. A repeated hit in Volt Lash is deliberate execution behavior, distinct from accidental duplicate footprint offsets.

**Delayed targeting:** Keep Arcane Channeling global and tracking its original selected entity identities, matching the current implementation. Death or team changes can make a captured recipient ineligible. The delayed discharge does not spend mana or begin a new activation again. Charge restrictions continue to prevent movement as well as casting. A future delayed ground spell can store aimed tiles, but it is not required to convert this existing ability.

**Support targeting:** Include self among allies, preserve existing ally-selectable defensive spells, and require a living eligible recipient. Being at full health or already having a buff does not alone make a target illegal. Existing effect stacking and no-op resolution rules continue to decide the result.

**Lines and secondary effects:** Lines hit all listed enemy-occupied cells. Drains such as Vital Strike and Soulflare still heal the caster even though their offensive footprint excludes the caster. Existing damage/status effects remain attached to their recipients when those entities move. Agility penalties remain Agility penalties; they do not acquire Movement penalties by name alone.

## Historical source discrepancies

These observations were recorded against the pre-conversion code on 14 September 2026. They explain the specification's description corrections and retained execution behavior; they are not a current list of unresolved presentation defects. The initial conversion preserves executable behavior except for the explicit targeting changes above. Later spell redesign remains a separate effort.

- Almost all current spells, including Basic Attack, carry tier A. Global assignments therefore cannot be inferred from tier alone. Retiering the entire collection is deferred.
- Storm Pulse's config currently looks self-targeted, but its implementation attacks random enemies. It deals physical damage despite its magical theme.
- Volt Lash describes chaining between enemies, but its current implementation chooses a fresh random living enemy for each strike and may repeat targets. It does not implement distance-based hopping.
- Tidal Pulse's description says up to three enemies, but its configured recipient count is unlimited.
- Stone Bark's description mentions an ally, while its executable targeting is self-only.
- Earthshatter's description suggests separate stun chances, but the configured chance is cast-level with a follow-up requiring two successful effect applications.
- “DEX” in Aqua Wave and Tidal Pulse descriptions refers to the actual Agility attribute. Rootgrasp applies stun. Torrent Spiral applies physical damage and the existing vulnerability effect.
- Final Verdict's implementation adds target maximum health to its damage calculation at the threshold and still uses the damage pipeline; this is not an unconditional bypass of defenses. The grid conversion does not silently redesign it.

## Completion beyond this table

The [approved specification](tactical-grid-spec.md) also settles authored enemy/encounter placement, AI choices and passing, board controls in both presentations, saved-battle compatibility and replay, and verification criteria. These areas are covered by the [local implementation and its recorded checks](tactical-grid-implementation.md). Deployment qualification remains outstanding under the [release checklist](release-checklist.md). A full tier and scaling redesign is outside this conversion's scope and would need its own destination before further wayfinding.

## Local evidence

Initially inspected September 14, 2026, before the conversion. The authoritative spell inventory is [the spell type schema](../apps/game/src/spells/base/spell-types.ts); definitions are in [the spell directory](../apps/game/src/spells). Custom behavior was read in Storm Pulse, Volt Lash, Arcane Channeling, Vital Strike, Soulflare, Iron Will, Earthshatter, and Bladestorm Rhythm. Equipment is defined in [the item factory](../apps/game/src/items/equipment/item-factory.ts); the original Basic Attack and damage modules established the numerical baseline. Producing these defaults did not itself implement or balance the grid; subsequent implementation evidence lives in the [implementation record](tactical-grid-implementation.md).
