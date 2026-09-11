import { EnemyTypeSchema } from "@loot-game/game/enemies/base/enemy-types";
import { ItemTypeSchema } from "@loot-game/game/items/item-types";
import { PassiveTypeSchema } from "@loot-game/game/passive-skills/base/passive-types";
import { SpellTypeSchema } from "@loot-game/game/spells/base/spell-types";
import { LootEntitySchema } from "@loot-game/game/types";
import SuperJSON, { type SuperJSONResult } from "superjson";
import z from "zod";
import type { StartingBuilds } from "./starting-builds";

const attributes = z.object({
  strength: z.number(),
  intelligence: z.number(),
  vitality: z.number(),
  agility: z.number(),
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
export function decodeStartingBuilds(value: unknown): StartingBuilds {
  const parsed = z.array(buildSchema).safeParse(value);
  if (
    !parsed.success ||
    new Set(parsed.data.map((build) => build.id)).size !== parsed.data.length
  )
    throw new Error("Invalid saved battle starting builds");
  return parsed.data.map((build) => ({
    ...build,
    character: build.character,
    enemy: build.enemy,
  }));
}

/** Additive envelope metadata keeps old SuperJSON readers compatible with the same v1 payload. */
export function serializeStartingBuilds(
  builds: StartingBuilds,
): SuperJSONResult & { version: 1 } {
  return { ...SuperJSON.serialize(builds), version: 1 };
}

export function deserializeStartingBuilds(
  value: SuperJSONResult & { version?: number },
): StartingBuilds {
  if ("version" in value && value.version !== 1)
    throw new Error("Unsupported saved battle build version");
  return decodeStartingBuilds(SuperJSON.deserialize(value));
}
