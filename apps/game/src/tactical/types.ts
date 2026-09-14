import { z } from "zod";
import type { AllAttributeKeys, Team } from "../entity-types";
import type { DamageType } from "../types";

export type Tile = { x: number; y: number };
export type Direction = "north" | "east" | "south" | "west";
export type Footprint = readonly (readonly [number, number])[];
export type Recipients = "enemies" | "allies" | "everyone";
export type Targeting = { recipients: Recipients } & (
  | {
      aim: "tile";
      range: { min: number; max: number };
      affectedTiles: Footprint;
    }
  | { aim: "direction" | "caster"; affectedTiles: Footprint }
  | { aim: "global" }
);
export type CastSelection =
  | { aim: "tile"; tile: Tile }
  | { aim: "direction"; direction: Direction }
  | { aim: "caster" }
  | { aim: "global" };
export type Battlefield = {
  width: number;
  height: number;
  blocked: Tile[];
  layoutVersion: string;
};
export type GridSetup = {
  rulesVersion: 2;
  battlefield: Battlefield;
  positions: Record<string, Tile>;
};
export type Activation = {
  id: string;
  entityId: string;
  allowance: number;
  spent: number;
};
export type GridState = GridSetup & { activation: Activation | null };
export type SpatialActor = { id: string; team: Team; health: number };
export type WeaponAttackProfile = {
  targeting: Targeting;
  damageType: DamageType;
  baseDamage: { min: number; max: number };
  scaling: { attribute: AllAttributeKeys; multiplier: number }[];
};

export const TileSchema = z.object({ x: z.int(), y: z.int() }).strict();
const FootprintSchema = z.array(z.tuple([z.int(), z.int()])).min(1);
const RecipientsSchema = z.enum(["enemies", "allies", "everyone"]);
const RangeSchema = z
  .object({ min: z.int().nonnegative(), max: z.int().nonnegative() })
  .strict()
  .refine(({ min, max }) => min <= max, "Minimum exceeds maximum");
export const TargetingSchema = z.discriminatedUnion("aim", [
  z
    .object({
      aim: z.literal("tile"),
      range: RangeSchema,
      affectedTiles: FootprintSchema,
      recipients: RecipientsSchema,
    })
    .strict(),
  z
    .object({
      aim: z.literal("direction"),
      affectedTiles: FootprintSchema,
      recipients: RecipientsSchema,
    })
    .strict(),
  z
    .object({
      aim: z.literal("caster"),
      affectedTiles: FootprintSchema,
      recipients: RecipientsSchema,
    })
    .strict(),
  z.object({ aim: z.literal("global"), recipients: RecipientsSchema }).strict(),
]);
export const CastSelectionSchema = z.discriminatedUnion("aim", [
  z.object({ aim: z.literal("tile"), tile: TileSchema }).strict(),
  z
    .object({
      aim: z.literal("direction"),
      direction: z.enum(["north", "east", "south", "west"]),
    })
    .strict(),
  z.object({ aim: z.literal("caster") }).strict(),
  z.object({ aim: z.literal("global") }).strict(),
]);
export const BattlefieldSchema = z
  .object({
    width: z.int().positive(),
    height: z.int().positive(),
    blocked: z.array(TileSchema),
    layoutVersion: z.string().min(1),
  })
  .strict();
export const GridSetupSchema = z
  .object({
    rulesVersion: z.literal(2),
    battlefield: BattlefieldSchema,
    positions: z.record(z.string(), TileSchema),
  })
  .strict()
  .superRefine(({ battlefield, positions }, ctx) => {
    const used = new Set<string>();
    for (const tile of [...battlefield.blocked, ...Object.values(positions)]) {
      const key = `${tile.x},${tile.y}`;
      if (
        tile.x < 0 ||
        tile.y < 0 ||
        tile.x >= battlefield.width ||
        tile.y >= battlefield.height ||
        used.has(key)
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Layout cells must be distinct and inside the battlefield",
        });
      }
      used.add(key);
    }
  });
export const ActivationSchema = z
  .object({
    id: z.string(),
    entityId: z.string(),
    allowance: z.int().nonnegative(),
    spent: z.int().nonnegative(),
  })
  .strict()
  .refine(
    ({ allowance, spent }) => spent <= allowance,
    "Movement exceeds allowance",
  );
export const GridStateSchema = z
  .object({
    rulesVersion: z.literal(2),
    battlefield: BattlefieldSchema,
    positions: z.record(z.string(), TileSchema),
    activation: ActivationSchema.nullable(),
  })
  .strict();

export const WeaponAttackProfileSchema = z
  .object({
    targeting: TargetingSchema,
    damageType: z.enum(["PHYSICAL", "MAGICAL"]),
    baseDamage: z
      .object({ min: z.number().nonnegative(), max: z.number().nonnegative() })
      .strict()
      .refine(({ min, max }) => min <= max, "Minimum exceeds maximum"),
    scaling: z.array(
      z
        .object({
          attribute: z.enum([
            "strength",
            "intelligence",
            "vitality",
            "agility",
            "movement",
            "lifesteal",
            "omnivamp",
            "armor",
            "magicResistance",
            "armorPenetration",
            "magicPenetration",
            "healthRegen",
            "manaRegen",
            "blessed",
            "critChance",
            "critDamage",
            "fire",
            "lightning",
            "earth",
            "water",
            "dark",
          ]),
          multiplier: z.number(),
        })
        .strict(),
    ),
  })
  .strict();

/** Starting occupancy is stricter than live occupancy: corpses may later share tiles. */
export function validateGridSetup(
  setup: GridSetup,
  actors: readonly SpatialActor[],
): GridSetup {
  const parsed = GridSetupSchema.parse(setup);
  if (
    new Set(actors.map(({ id }) => id)).size !== actors.length ||
    Object.keys(parsed.positions).length !== actors.length ||
    actors.some(({ id }) => !Object.hasOwn(parsed.positions, id))
  ) {
    throw new Error("The layout must place every participant exactly once");
  }
  return parsed;
}
