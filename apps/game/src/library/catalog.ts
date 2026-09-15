import { BaseEntity } from "../base-entity";
import { BM } from "../bm";
import { EnemyTypeSchema } from "../enemies/base/enemy-types";
import { createEnemyFromType } from "../enemies/enemy-factory";
import { itemFactory } from "../items/equipment/item-factory";
import { ItemTypeSchema } from "../items/item-types";
import { passiveSkillFactory } from "../passive-skills/base/passive-skill.factory";
import { PassiveTypeSchema } from "../passive-skills/base/passive-types";
import { createSpellFromType } from "../spells/base/spell-from-type";
import { SpellTypeSchema } from "../spells/base/spell-types";
import { WEAPON_PROFILES } from "../tactical/catalogue";
import type { WeaponAttackProfile } from "../tactical/types";
import { mightAssessments } from "../might/assessments";
import { assessMight } from "../might/might";
import {
  DEFAULT_LIBRARY_ATTRIBUTES,
  type LibraryAttributes,
  type LibraryEntry,
  type LibraryReference,
} from "./types";

export function libraryName(type: string): string {
  return type
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/** Builds detached, serializable views. Never casts spells or changes a saved build. */
export function createSpellLibrary(
  attributes: LibraryAttributes = DEFAULT_LIBRARY_ATTRIBUTES,
): LibraryEntry[] {
  const caster = new BaseEntity(
    "library-caster",
    "Preview hero",
    "TEAM_A",
    100,
    100,
    { ...attributes },
  );
  caster.isBot = false;
  const target = new BaseEntity(
    "library-target",
    "Preview target",
    "TEAM_B",
    100,
    100,
    { ...attributes },
  );
  caster.spells = SpellTypeSchema.options.map(({ value }) =>
    createSpellFromType(`library:${value}`, value),
  );
  // Use the same tactical preparation as combat, including unarmed Basic Attack.
  new BM([caster, target], "library-preview", {
    rulesVersion: 2,
    battlefield: { width: 5, height: 5, blocked: [], layoutVersion: "library" },
    positions: { [caster.id]: { x: 1, y: 2 }, [target.id]: { x: 2, y: 2 } },
  });
  return caster.spells.map((spell) => {
    const { config } = spell;
    const directDamage = spell.estimateDamage?.(caster, target) ?? undefined;
    return {
      category: "spells",
      type: config.type,
      name: config.name,
      description: spell.description(caster).text,
      ...assessMight(
        `spells:${config.type}`,
        mightAssessments.spells[config.type],
      ),
      family: "spells",
      group: config.targeting?.recipients ?? "enemies",
      targeting: config.targeting,
      mana: config.manaCost,
      cooldown: config.cooldown,
      directDamage,
      stats: [
        { label: "Mana cost", value: config.manaCost },
        { label: "Cooldown", value: config.cooldown },
        ...(directDamage === undefined
          ? []
          : [
              {
                label: "Est. direct damage / target",
                value: round(directDamage),
              },
              ...(config.manaCost > 0
                ? [
                    {
                      label: "Est. damage / mana",
                      value: round(directDamage / config.manaCost),
                    },
                  ]
                : []),
            ]),
      ],
      related: [],
    };
  });
}

const round = (value: number) => Math.round(value * 100) / 100;

function weaponStats(profile: WeaponAttackProfile) {
  return [
    {
      label: "Attack damage type",
      value: libraryName(profile.damageType.toLowerCase()),
    },
    {
      label: "Base attack damage",
      value: `${profile.baseDamage.min}–${profile.baseDamage.max}`,
    },
    ...profile.scaling.map(({ attribute, multiplier }) => ({
      label: `${libraryName(attribute)} scaling`,
      value: `${round(multiplier * 100)}%`,
    })),
  ];
}

export function createItemLibrary(): LibraryEntry[] {
  const holder = new BaseEntity(
    "library-holder",
    "Holder",
    "TEAM_A",
    100,
    100,
    { ...DEFAULT_LIBRARY_ATTRIBUTES },
  );
  return ItemTypeSchema.options.map((type) => {
    const item = itemFactory(type, `library:${type}`, holder);
    const profile =
      type === "iron-sword" || type === "oakwarden-staff"
        ? WEAPON_PROFILES[type]
        : undefined;
    return {
      category: "items",
      type,
      name: item.name,
      description: item.description,
      ...assessMight(`items:${type}`, mightAssessments.items[type]),
      family: `items:${item.equipmentSlot.toLowerCase() as Lowercase<typeof item.equipmentSlot>}`,
      group: item.equipmentSlot.toLowerCase(),
      targeting: profile?.targeting,
      stats: [
        {
          label: "Equipment slot",
          value: libraryName(item.equipmentSlot.toLowerCase()),
        },
        ...item.modifiers.map((modifier) => ({
          label: libraryName(modifier.attribute.replace(/([A-Z])/g, " $1")),
          value:
            modifier.operation === "ADD"
              ? `${modifier.value >= 0 ? "+" : ""}${modifier.value}`
              : `×${modifier.value}`,
        })),
        ...(profile ? weaponStats(profile) : []),
      ],
      related: profile ? [{ category: "spells", type: "basic-attack" }] : [],
    };
  });
}

export function createPassiveLibrary(): LibraryEntry[] {
  const holder = new BaseEntity(
    "library-holder",
    "Holder",
    "TEAM_A",
    100,
    100,
    { ...DEFAULT_LIBRARY_ATTRIBUTES },
  );
  return PassiveTypeSchema.options.map(({ value: type }) => {
    const passive = passiveSkillFactory(type, `library:${type}`, holder);
    return {
      category: "passives",
      type,
      name: libraryName(type),
      description: passive.getDescription(),
      ...assessMight(`passives:${type}`, mightAssessments.passives[type]),
      family: "passives",
      group: "passive",
      stats: [{ label: "Active for", value: "Battle" }],
      related: [],
    };
  });
}

export function createEnemyLibrary(): LibraryEntry[] {
  return EnemyTypeSchema.options.map(({ value: type }) => {
    const enemy = createEnemyFromType(type, `library:${type}`);
    return {
      category: "enemies",
      type,
      name: enemy.name,
      ...assessMight(`enemies:${type}`, mightAssessments.enemies[type]),
      family: "enemies",
      description:
        "Base attributes before equipment, passive skills, and combat effects. Inspect the combat kit below for modifiers.",
      group: "enemy",
      health: enemy.maxHealth,
      stats: [
        { label: "Health", value: enemy.maxHealth },
        { label: "Mana", value: enemy.maxMana },
        { label: "XP reward", value: enemy.xp },
        ...Object.entries({
          ...enemy.baseAttributes,
          movement: enemy.baseAttributes.movement ?? 3,
          ...enemy.baseSpecialAttributes,
          ...enemy.baseAffinities,
          healthRegen: enemy.getAttribute("healthRegen"),
          manaRegen: enemy.getAttribute("manaRegen"),
        }).map(([attribute, value]) => ({
          label:
            attribute === "critDamage"
              ? "Critical damage bonus"
              : libraryName(attribute.replace(/([A-Z])/g, " $1")),
          value: ["lifesteal", "omnivamp", "critChance", "critDamage"].includes(
            attribute,
          )
            ? `${round(value * 100)}%`
            : round(value),
        })),
      ],
      related: [
        ...enemy.spells.map(
          (spell): LibraryReference => ({
            category: "spells",
            type: spell.config.type,
          }),
        ),
        ...enemy.passiveSkills.map(
          (passive): LibraryReference => ({
            category: "passives",
            type: passive.passiveType,
          }),
        ),
        ...Object.values(enemy.equipped).map(
          (item): LibraryReference => ({
            category: "items",
            type: item.itemType,
          }),
        ),
      ],
      drops: enemy.loot.items.map((loot) => {
        const reference: LibraryReference =
          loot.type === "SPELL"
            ? { category: "spells", type: loot.data.spellType }
            : loot.type === "PASSIVE"
              ? { category: "passives", type: loot.data.passiveType }
              : { category: "items", type: loot.data.itemType };
        return { ...reference, chance: loot.dropRate };
      }),
    };
  });
}
