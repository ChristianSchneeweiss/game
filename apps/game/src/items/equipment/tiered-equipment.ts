import type { EnemyType } from "../../enemies/base/enemy-types";
import type { AllAttributeKeys } from "../../entity-types";
import { tierFromMight } from "../../might/might";
import type { AttributeModifier } from "../../types";
import type { EquipmentSlot } from "./equipment";

type Piece = {
  name: string;
  might: number;
  bonuses: Partial<Record<AllAttributeKeys, number>>;
  source: EnemyType;
  description: string;
};

function piece(equipmentSlot: EquipmentSlot, definition: Piece) {
  return {
    ...definition,
    equipmentSlot,
    tier: tierFromMight(definition.might),
    bonuses: Object.entries(definition.bonuses).map(([attribute, value]) => ({
      attribute: attribute as AttributeModifier["attribute"],
      value,
    })),
  };
}

/** One option per missing slot/tier. Might determines tier; bonuses are additive. */
export const TIERED_EQUIPMENT = {
  "sunforged-greatsword": piece("WEAPON", {
    name: "Sunforged Greatsword",
    might: 310,
    bonuses: { strength: 16, armorPenetration: 6 },
    source: "emberbound-revenant",
    description:
      "A heavy ember-forged blade. Strong melee attacks and physical spell scaling reward closing the distance.",
  }),
  "starfall-staff": piece("WEAPON", {
    name: "Starfall Staff",
    might: 430,
    bonuses: { intelligence: 20, magicPenetration: 8, manaRegen: 3 },
    source: "hollowed-oakwarden",
    description:
      "A fallen star grants four-tile magical reach, ward-breaking power and mana sustain.",
  }),
  "kingsfall-edge": piece("WEAPON", {
    name: "Kingsfall Edge",
    might: 560,
    bonuses: { strength: 24, agility: 12, critChance: 0.12 },
    source: "commander-kelvaris",
    description:
      "A sovereign's dueling blade. Melee attacks scale with strength and agility, with critical chance for every damaging skill.",
  }),
  "runebound-vestments": piece("ARMOR", {
    name: "Runebound Vestments",
    might: 220,
    bonuses: { intelligence: 12, magicResistance: 10 },
    source: "barkhide-shaman",
    description:
      "Woven wards support casting and resist magical pressure, but offer no physical armor.",
  }),
  "citadel-carapace": piece("ARMOR", {
    name: "Citadel Carapace",
    might: 310,
    bonuses: { armor: 26, magicResistance: 14, movement: -1 },
    source: "ghoul-knight-ivern",
    description:
      "Layered burial plate withstands mixed attacks at the cost of one movement tile each activation.",
  }),
  "astral-regalia": piece("ARMOR", {
    name: "Astral Regalia",
    might: 430,
    bonuses: { intelligence: 20, magicResistance: 18, manaRegen: 4 },
    source: "hollowed-oakwarden",
    description:
      "Starlit robes strengthen spells and replenish mana under magical pressure. Physical hits remain a weakness.",
  }),
  "dawnwarden-aegis": piece("ARMOR", {
    name: "Dawnwarden Aegis",
    might: 560,
    bonuses: { armor: 38, magicResistance: 26, vitality: 10 },
    source: "thundermaw",
    description:
      "Masterwork plate protects against blades and magic without slowing its wearer. Vitality strengthens regeneration.",
  }),
  "copper-band": piece("RING", {
    name: "Copper Band",
    might: 100,
    bonuses: { strength: 3 },
    source: "goblin",
    description:
      "A humble fighter's band that adds strength to physical attacks and spells.",
  }),
  "emberseal-ring": piece("RING", {
    name: "Emberseal Ring",
    might: 160,
    bonuses: { strength: 5, armorPenetration: 2 },
    source: "lurking-flame-wraith",
    description: "A warm seal sharpens physical strikes against armored foes.",
  }),
  "tidecallers-ring": piece("RING", {
    name: "Tidecaller's Ring",
    might: 220,
    bonuses: { intelligence: 7, manaRegen: 1 },
    source: "water-elemental",
    description:
      "A captured current improves spell scaling and sustained casting.",
  }),
  "duelist-signet": piece("RING", {
    name: "Duelist Signet",
    might: 310,
    bonuses: { agility: 7, critChance: 0.06 },
    source: "commander-kelvaris",
    description:
      "A dueling crest rewards initiative and critical hits, especially alongside Keen Instincts.",
  }),
  "wardens-loop": piece("RING", {
    name: "Warden's Loop",
    might: 430,
    bonuses: { armor: 10, magicResistance: 8 },
    source: "ghoul-knight-ivern",
    description:
      "An unbroken ward protects against repeated physical and magical hits.",
  }),
  "sovereign-signet": piece("RING", {
    name: "Sovereign Signet",
    might: 560,
    bonuses: { strength: 12, intelligence: 12, critChance: 0.08 },
    source: "commander-kelvaris",
    description:
      "A royal seal supports mixed physical and magical builds with critical chance for both.",
  }),
  "apprentice-pendant": piece("AMULET", {
    name: "Apprentice Pendant",
    might: 100,
    bonuses: { intelligence: 3 },
    source: "goblin",
    description:
      "A first focusing crystal improves spell scaling and derived mana regeneration.",
  }),
  "thornwood-charm": piece("AMULET", {
    name: "Thornwood Charm",
    might: 160,
    bonuses: { intelligence: 4, manaRegen: 1 },
    source: "barkhide-shaman",
    description:
      "Living thorns channel a steady reserve for sustained spellcasting.",
  }),
  "emberheart-amulet": piece("AMULET", {
    name: "Emberheart Amulet",
    might: 220,
    bonuses: { strength: 6, armorPenetration: 4 },
    source: "emberbound-revenant",
    description:
      "A banked coal empowers physical skills and helps them pierce armor.",
  }),
  "moonwell-pendant": piece("AMULET", {
    name: "Moonwell Pendant",
    might: 310,
    bonuses: { intelligence: 8, manaRegen: 3 },
    source: "hollowed-oakwarden",
    description:
      "A moonwell fragment feeds repeated spells; its mana matters most in longer encounters.",
  }),
  "storm-eye-amulet": piece("AMULET", {
    name: "Storm Eye Amulet",
    might: 430,
    bonuses: { agility: 12, critChance: 0.1 },
    source: "thundermaw",
    description:
      "The eye of a storm grants initiative and critical chance to aggressive builds.",
  }),
  "lifewell-talisman": piece("AMULET", {
    name: "Lifewell Talisman",
    might: 560,
    bonuses: { vitality: 12, magicResistance: 10, healthRegen: 4 },
    source: "hollowed-oakwarden",
    description:
      "An ancient seed restores wounded defenders each activation and wards against magic.",
  }),
  "trailworn-boots": piece("BOOTS", {
    name: "Trailworn Boots",
    might: 100,
    bonuses: { agility: 3 },
    source: "skeleton-grunt",
    description:
      "Reliable boots improve initiative without changing movement range.",
  }),
  "scouts-treads": piece("BOOTS", {
    name: "Scout's Treads",
    might: 160,
    bonuses: { agility: 5, armor: 2 },
    source: "fishfolk-scout",
    description:
      "Reinforced scouting boots combine initiative with light physical protection.",
  }),
  "gale-striders": piece("BOOTS", {
    name: "Gale Striders",
    might: 220,
    bonuses: { agility: 5, movement: 1 },
    source: "skybolt-wyvern",
    description:
      "Wind-caught soles add one movement tile each activation, helping melee builds reach their target.",
  }),
  "bastion-greaves": piece("BOOTS", {
    name: "Bastion Greaves",
    might: 310,
    bonuses: { armor: 8, magicResistance: 6, movement: 1 },
    source: "ghoul-knight-ivern",
    description:
      "Enchanted greaves combine mixed defenses with one extra movement tile, offsetting heavy plate's penalty.",
  }),
  "tempest-sabatons": piece("BOOTS", {
    name: "Tempest Sabatons",
    might: 430,
    bonuses: { agility: 12, movement: 2 },
    source: "thundermaw",
    description:
      "Storm-forged boots grant initiative and two extra movement tiles, with no flat defenses.",
  }),
  "horizon-walkers": piece("BOOTS", {
    name: "Horizon Walkers",
    might: 560,
    bonuses: { agility: 16, movement: 2, magicResistance: 10 },
    source: "commander-kelvaris",
    description:
      "Wave-skimming boots combine two extra movement tiles, initiative and protection from magic.",
  }),
  "brawlers-wraps": piece("GLOVES", {
    name: "Brawler's Wraps",
    might: 100,
    bonuses: { strength: 3 },
    source: "rotting-corpse",
    description:
      "Tightly bound wraps steady physical attacks and strengthen physical skills.",
  }),
  "acolytes-grips": piece("GLOVES", {
    name: "Acolyte's Grips",
    might: 160,
    bonuses: { intelligence: 5, magicPenetration: 2 },
    source: "fishfolk-shaman",
    description:
      "Runic fingertips improve spell scaling and cut through magical resistance.",
  }),
  "ironbreak-gauntlets": piece("GLOVES", {
    name: "Ironbreak Gauntlets",
    might: 220,
    bonuses: { strength: 6, armorPenetration: 4 },
    source: "moss-covered-golem",
    description:
      "Stone-knuckled gauntlets empower physical attacks against armored targets.",
  }),
  "stormgrip-gloves": piece("GLOVES", {
    name: "Stormgrip Gloves",
    might: 310,
    bonuses: { agility: 8, critChance: 0.06 },
    source: "thunder-drake",
    description:
      "Charged grips combine initiative with critical chance for an agile attacker.",
  }),
  "starweave-handwraps": piece("GLOVES", {
    name: "Starweave Handwraps",
    might: 430,
    bonuses: { intelligence: 12, magicPenetration: 5 },
    source: "hollowed-oakwarden",
    description:
      "Starlit thread strengthens magical offense, including spells and staff attacks.",
  }),
  "kingsguard-gauntlets": piece("GLOVES", {
    name: "Kingsguard Gauntlets",
    might: 560,
    bonuses: { strength: 16, armorPenetration: 8, lifesteal: 0.08 },
    source: "commander-kelvaris",
    description:
      "Royal gauntlets pierce armor and restore health from actual physical damage. Overkill provides no extra recovery.",
  }),
  "iron-cap": piece("HELMET", {
    name: "Iron Cap",
    might: 100,
    bonuses: { armor: 3 },
    source: "skeleton-grunt",
    description: "A simple iron cap reduces each incoming physical hit.",
  }),
  "mossguard-helm": piece("HELMET", {
    name: "Mossguard Helm",
    might: 160,
    bonuses: { armor: 4, vitality: 3 },
    source: "moss-covered-golem",
    description:
      "Living moss bolsters regeneration beneath a light physical guard.",
  }),
  "tidekeepers-circlet": piece("HELMET", {
    name: "Tidekeeper's Circlet",
    might: 220,
    bonuses: { intelligence: 6, magicResistance: 3 },
    source: "water-elemental",
    description:
      "A sea-glass circlet supports spells while offering a little protection from magic.",
  }),
  "sentinel-greathelm": piece("HELMET", {
    name: "Sentinel Greathelm",
    might: 310,
    bonuses: { armor: 10, magicResistance: 6 },
    source: "ghoul-knight-ivern",
    description:
      "A sealed sentinel's helm protects against repeated physical and magical pressure.",
  }),
  "conquerors-crown": piece("HELMET", {
    name: "Conqueror's Crown",
    might: 430,
    bonuses: { strength: 12, armor: 8 },
    source: "emberbound-revenant",
    description:
      "A battle crown combines strong physical offense with protection on the front line.",
  }),
  "dawnwarden-halo": piece("HELMET", {
    name: "Dawnwarden Halo",
    might: 560,
    bonuses: { armor: 20, magicResistance: 14, vitality: 8 },
    source: "thundermaw",
    description:
      "A luminous helm brings mixed defenses and regeneration without a movement penalty.",
  }),
  "travelers-cloak": piece("CLOAK", {
    name: "Traveler's Cloak",
    might: 100,
    bonuses: { magicResistance: 3 },
    source: "rotting-corpse",
    description: "A weathered warding cloak softens incoming magical hits.",
  }),
  "mistwoven-cape": piece("CLOAK", {
    name: "Mistwoven Cape",
    might: 160,
    bonuses: { intelligence: 4, magicResistance: 3 },
    source: "wisp-of-regret",
    description:
      "Cool mist strengthens spellcasting while retaining a light magical ward.",
  }),
  "shadowstalker-cloak": piece("CLOAK", {
    name: "Shadowstalker Cloak",
    might: 220,
    bonuses: { agility: 5, armor: 4 },
    source: "crypt-crawler",
    description:
      "Layered shadow-silk improves initiative and cushions physical blows.",
  }),
  "spellward-mantle": piece("CLOAK", {
    name: "Spellward Mantle",
    might: 310,
    bonuses: { intelligence: 8, magicResistance: 8 },
    source: "hollowed-oakwarden",
    description:
      "Interlocking runes protect a caster from magic while strengthening their own spells.",
  }),
  "phoenix-shroud": piece("CLOAK", {
    name: "Phoenix Shroud",
    might: 430,
    bonuses: { armor: 10, magicResistance: 10, healthRegen: 4 },
    source: "emberbound-revenant",
    description:
      "Warm ash guards against mixed attacks and restores health each activation while wounded.",
  }),
  "celestial-mantle": piece("CLOAK", {
    name: "Celestial Mantle",
    might: 560,
    bonuses: { intelligence: 12, magicResistance: 16, manaRegen: 6 },
    source: "hollowed-oakwarden",
    description:
      "A starry mantle sustains long spell rotations under magical pressure, without physical armor.",
  }),
  "rope-girdle": piece("BELT", {
    name: "Rope Girdle",
    might: 100,
    bonuses: { vitality: 3 },
    source: "goblin",
    description:
      "A dependable girdle strengthens vitality-based regeneration. Equipment vitality does not raise maximum health.",
  }),
  "raiders-belt": piece("BELT", {
    name: "Raider's Belt",
    might: 160,
    bonuses: { strength: 4, vitality: 3 },
    source: "fishfolk-scout",
    description:
      "A raider's sash balances physical skill scaling with regeneration.",
  }),
  "rootbound-cinch": piece("BELT", {
    name: "Rootbound Cinch",
    might: 220,
    bonuses: { vitality: 6, armor: 4 },
    source: "elder-treant",
    description:
      "Knotted roots improve regeneration and protect against physical hits.",
  }),
  "champions-girdle": piece("BELT", {
    name: "Champion's Girdle",
    might: 310,
    bonuses: { strength: 8, vitality: 6 },
    source: "commander-kelvaris",
    description:
      "A champion's belt supports sustained melee through strength and regeneration.",
  }),
  "archmages-sash": piece("BELT", {
    name: "Archmage's Sash",
    might: 430,
    bonuses: { intelligence: 10, vitality: 10, manaRegen: 3 },
    source: "hollowed-oakwarden",
    description:
      "A woven reservoir combines spell scaling with health and mana regeneration for prolonged fights.",
  }),
  "worldroot-girdle": piece("BELT", {
    name: "Worldroot Girdle",
    might: 560,
    bonuses: { vitality: 16, armor: 12, healthRegen: 5 },
    source: "hollowed-oakwarden",
    description:
      "Ancient roots anchor a defender with armor and sustained recovery. Healing at full health is wasted.",
  }),
};

export type TieredEquipmentType = keyof typeof TIERED_EQUIPMENT;
export const tieredEquipmentTypes = Object.keys(
  TIERED_EQUIPMENT,
) as TieredEquipmentType[];
