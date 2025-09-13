import { z } from "zod";

export const EnemyTypeSchema = z.union([
  z.literal("goblin"),
  z.literal("skeleton-grunt"),
  z.literal("rotting-corpse"),
  z.literal("wisp-of-regret"),
  z.literal("ghoul-knight-ivern"),
  z.literal("emberbound-revenant"),
  z.literal("ashen-skeleton"),
  z.literal("lurking-flame-wraith"),
  z.literal("crypt-crawler"),
  z.literal("moss-covered-golem"),
  z.literal("barkhide-shaman"),
  z.literal("hollowed-oakwarden"),
  z.literal("elder-treant"),
]);
export type EnemyType = z.infer<typeof EnemyTypeSchema>;
