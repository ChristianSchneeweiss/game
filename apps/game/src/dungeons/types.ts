import z from "zod";
import type { Character } from "../base-entity";
import type { BM } from "../bm";
import type { BaseEnemy } from "../enemies/base/base.enemy";
import type { EnemyType } from "../enemies/base/enemy-types";
import type { DungeonKey } from "./dungeon-keys";

export type DungeonRound = {
  battleManager: BM;
};

export type AvailableEnemies = EnemyType[];

export type DungeonData = {
  id: string;
  key: string;
  playerTeam: Character[];
  round: number;
  actualEnemies: BaseEnemy[][];
  cleared: boolean;
};

export type DungeonConfig = {
  key: DungeonKey;
  name: string;
  description: string;
  availableEnemies: AvailableEnemies[];
};

export const inBetweenCharacterData = z.object({
  characterId: z.string(),
  health: z.number(),
  mana: z.number(),
});

export type InBetweenCharacterData = z.infer<typeof inBetweenCharacterData>;
