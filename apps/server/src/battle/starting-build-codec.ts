import { EnemyTypeSchema } from "@loot-game/game/enemies/base/enemy-types";
import { ItemTypeSchema } from "@loot-game/game/items/item-types";
import { PassiveTypeSchema } from "@loot-game/game/passive-skills/base/passive-types";
import { SpellTypeSchema } from "@loot-game/game/spells/base/spell-types";
import { LootEntitySchema } from "@loot-game/game/types";
import {
  GridSetupSchema,
  TargetingSchema,
  WeaponAttackProfileSchema,
  validateGridSetup,
  type GridSetup,
} from "@loot-game/game/tactical/types";
import SuperJSON, { type SuperJSONResult } from "superjson";
import z from "zod";
import type { StartingBuilds } from "./starting-builds";

const attributes = z.object({
  strength: z.number(),
  intelligence: z.number(),
  vitality: z.number(),
  agility: z.number(),
  movement: z.number().optional(),
});
const special = z.object({
  lifesteal: z.number(),
  omnivamp: z.number(),
  armor: z.number(),
  magicResistance: z.number(),
  armorPenetration: z.number(),
  magicPenetration: z.number(),
  healthRegen: z.number(),
  manaRegen: z.number(),
  blessed: z.number(),
  critChance: z.number(),
  critDamage: z.number(),
});
const affinities = z.object({
  fire: z.number(),
  lightning: z.number(),
  earth: z.number(),
  water: z.number(),
  dark: z.number(),
});
const attributeKey = z.enum([
  ...attributes.keyof().options,
  ...special.keyof().options,
  ...affinities.keyof().options,
]);
// Infinity represents every eligible target in existing frozen spell definitions.
const targetCount = z.union([z.number().nonnegative(), z.literal(Infinity)]);
const buildSchema = z
  .object({
    id: z.string().min(1),
    name: z.string(),
    team: z.enum(["TEAM_A", "TEAM_B"]),
    health: z.number(),
    maxHealth: z.number(),
    mana: z.number(),
    maxMana: z.number(),
    baseAttributes: attributes,
    baseSpecialAttributes: special,
    baseAffinities: affinities,
    weaponAttackProfile: WeaponAttackProfileSchema.optional(),
    character: z
      .object({
        userId: z.string(),
        xp: z.number(),
        level: z.number(),
        statPointsAvailable: z.number(),
      })
      .optional(),
    enemy: z
      .object({
        type: EnemyTypeSchema,
        xp: z.number(),
        loot: z.object({ items: z.array(LootEntitySchema), gold: z.number() }),
      })
      .optional(),
    spells: z.array(
      z.object({
        config: z.object({
          id: z.string(),
          type: SpellTypeSchema,
          name: z.string(),
          manaCost: z.number(),
          cooldown: z.number(),
          targetType: z.object({ enemies: targetCount, allies: targetCount }),
          tier: z.enum(["E", "D", "C", "B", "A", "S"]),
          targeting: TargetingSchema.optional(),
        }),
        currentCooldown: z.number(),
      }),
    ),
    passives: z.array(z.object({ id: z.string(), type: PassiveTypeSchema })),
    equipment: z.array(
      z.object({
        id: z.string(),
        type: ItemTypeSchema,
        modifiers: z.array(
          z.object({
            id: z.string(),
            attribute: attributeKey,
            value: z.number(),
            operation: z.enum(["ADD", "MULTIPLY"]),
          }),
        ),
      }),
    ),
  })
  .refine(
    (build) => Boolean(build.character) !== Boolean(build.enemy),
    "A build needs exactly one actor kind",
  );

/** Validate saved data before invoking constructors; no current roster or combat hooks. */
export function decodeStartingBuilds(
  value: unknown,
  rulesVersion: 1 | 2 = 1,
): StartingBuilds {
  const parsed = z.array(buildSchema).safeParse(value);
  if (
    !parsed.success ||
    new Set(parsed.data.map((build) => build.id)).size !== parsed.data.length
  )
    throw new Error("Invalid saved battle starting builds");
  if (
    rulesVersion === 2 &&
    parsed.data.some(
      (build) =>
        !build.weaponAttackProfile ||
        build.spells.some(({ config }) => !config.targeting),
    )
  )
    throw new Error(
      "Invalid saved tactical build: frozen targeting and weapon profiles are required",
    );
  return parsed.data.map((build) => ({
    ...build,
    character: build.character,
    enemy: build.enemy,
    weaponAttackProfile: build.weaponAttackProfile,
  }));
}

/** The v2 envelope binds frozen builds to an explicit tactical ruleset and layout. */
export function serializeStartingBuilds(
  builds: StartingBuilds,
  grid?: GridSetup,
): SuperJSONResult & { version: 1 | 2; grid?: GridSetup } {
  if (!grid) return { ...SuperJSON.serialize(builds), version: 1 };
  const parsed = validateGridSetup(grid, builds);
  decodeStartingBuilds(builds, 2);
  return { ...SuperJSON.serialize(builds), version: 2, grid: parsed };
}

export function deserializeStartingBuilds(
  value: SuperJSONResult & { version?: number; grid?: unknown },
): StartingBuilds {
  if (
    ("version" in value && value.version !== 1 && value.version !== 2) ||
    (value.version === 2 && !value.grid)
  )
    throw new Error("Unsupported saved battle build version");
  const builds = decodeStartingBuilds(
    SuperJSON.deserialize(value),
    value.version === 2 ? 2 : 1,
  );
  if (value.version === 2)
    validateGridSetup(GridSetupSchema.parse(value.grid), builds);
  else if (value.grid !== undefined)
    throw new Error("Legacy builds cannot contain a tactical layout");
  return builds;
}

/** A v1 snapshot cannot be silently upgraded by today's encounter definitions. */
export function deserializeStartingGrid(
  value: SuperJSONResult & { version?: number; grid?: unknown },
): GridSetup | undefined {
  const builds = deserializeStartingBuilds(value);
  if (value.version !== 2) return undefined;
  return validateGridSetup(GridSetupSchema.parse(value.grid), builds);
}
