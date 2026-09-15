import z from "zod";
import { EquipmentTypeSchema } from "../items/equipment-types";
import { routeActionSchema, type DungeonRoute } from "./route";

const resourceSchema = z.object({
  characterId: z.string().min(1),
  health: z.number().finite(),
  mana: z.number().finite(),
});
const routeV1Schema = z.object({
  version: z.literal(1),
  forks: z.array(
    z.object({
      wave: z.number().int().positive(),
      offers: z
        .array(
          z.object({
            id: z.string().min(1),
            encounter: z.object({
              id: z.string().min(1),
              name: z.string().min(1),
              kind: z.enum(["battle", "elite", "shrine", "treasure", "vault"]),
              rarity: z.enum([
                "common",
                "uncommon",
                "rare",
                "epic",
                "legendary",
              ]),
              actions: z.array(routeActionSchema).min(1),
            }),
          }),
        )
        .min(1),
    }),
  ),
  decisions: z.array(
    z.object({
      wave: z.number().int().positive(),
      offerId: z.string().min(1),
      action: routeActionSchema,
      outcome: z.enum(["passed", "elite", "restored", "treasure", "trap"]),
      rewards: z.array(EquipmentTypeSchema),
      resources: z.array(resourceSchema),
      eliteRewardChance: z.number().min(0).max(1).optional(),
    }),
  ),
});

/** NULL is the historical linear route. A future version must never run as v1. */
export function readDungeonRoute(value: unknown): DungeonRoute | null {
  if (value == null) return null;
  if (typeof value !== "object" || !("version" in value) || value.version !== 1)
    throw new Error("Unsupported saved dungeon route version");
  const parsed = routeV1Schema.safeParse(value);
  if (!parsed.success) throw new Error("Invalid saved dungeon route state");
  const route = parsed.data;
  const waves = new Set<number>();
  for (const fork of route.forks) {
    if (
      waves.has(fork.wave) ||
      new Set(fork.offers.map((offer) => offer.id)).size !== fork.offers.length
    )
      throw new Error("Invalid saved dungeon route: duplicate fork or offer");
    waves.add(fork.wave);
  }
  const chosen = new Set<number>();
  for (const decision of route.decisions) {
    const offer = route.forks
      .find((fork) => fork.wave === decision.wave)
      ?.offers.find((candidate) => candidate.id === decision.offerId);
    if (
      chosen.has(decision.wave) ||
      !offer?.encounter.actions.includes(decision.action)
    )
      throw new Error(
        "Invalid saved dungeon route: decision does not match an offer",
      );
    chosen.add(decision.wave);
  }
  return route;
}
