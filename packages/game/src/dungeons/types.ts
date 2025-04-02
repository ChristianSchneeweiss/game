import type { BaseEntity } from "../base-entity";
import type { BM } from "../battle";

export type DungeonRound = {
  battleManager: BM;
};

export type AvailableEnemies = {
  enemy: BaseEntity;
}[];
