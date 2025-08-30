import z from "zod";
import type { Character, Enemy } from "../base-entity";
import type { BM } from "../battle";
import type { Entity } from "../types";

export type DungeonRound = {
  battleManager: BM;
};

export type AvailableEnemies = {
  enemy: Entity;
}[];

export type DungeonData = {
  id: string;
  key: string;
  playerTeam: Character[];
  round: number;
  actualEnemies: Enemy[][];
  cleared: boolean;
};

export type DungeonConfig = {
  key: string;
  name: string;
  description: string;
  availableEnemies: AvailableEnemies[];
  rollEnemies: () => Entity[][];
};

export const inBetweenCharacterData = z.object({
  characterId: z.string(),
  health: z.number(),
  mana: z.number(),
});

export type InBetweenCharacterData = z.infer<typeof inBetweenCharacterData>;
