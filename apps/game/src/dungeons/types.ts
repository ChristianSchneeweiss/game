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
  playerTeam: Entity[];
  round: number;
  actualEnemies: Entity[][];
};

export type DungeonConfig = {
  key: string;
  name: string;
  description: string;
  availableEnemies: AvailableEnemies[];
  rollEnemies: () => Entity[][];
};
