import { EnemyTypeSchema } from "@loot-game/game/enemies/base/enemy-types";
import z from "zod";

export const characterDataSchema = z.object({
  id: z.string(),
  health: z.number(),
  mana: z.number(),
  dead: z.boolean(),
});

export const enemyDataSchema = z.object({
  id: z.string(),
  type: EnemyTypeSchema,
  health: z.number(),
  dead: z.boolean(),
});

export const battleResultSchema = z.object({
  winner: z.union([z.literal("TEAM_A"), z.literal("TEAM_B")]),
  teamA: z.array(characterDataSchema),
  teamB: z.array(enemyDataSchema),
});

export type CharacterData = z.infer<typeof characterDataSchema>;
export type BattleResult = z.infer<typeof battleResultSchema>;
