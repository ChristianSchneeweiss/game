import { BM } from "../battle";
import { Goblin } from "../enemies/goblin";
import type { Entity } from "../types";
import type { DungeonRound } from "./types";

export class Dungeon1 {
  rounds: DungeonRound[] = [];
  player: Entity = undefined!;
  currentRound = 0;

  constructor() {
    this.rounds = [
      {
        battleManager: new BM([]),
      },
    ];
  }

  addPlayer(player: Entity) {
    this.player = player;
  }

  fightRound() {
    const bm = this.getRound().battleManager;
    bm.join(this.player);
    bm.join(new Goblin());
    bm.join(new Goblin());
    bm.join(new Goblin());
    bm.fight();
    return bm.roundEvents;
  }

  private getRound(): DungeonRound {
    return this.rounds[this.currentRound]!;
  }
}
