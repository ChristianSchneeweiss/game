import { Goblin } from "../enemies/goblin";
import type { DungeonConfig } from "./types";

export const dungeon1 = () =>
  ({
    key: "dungeon1",
    name: "Dungeon 1",
    description: "This is the first dungeon",
    availableEnemies: [
      ["goblin", "goblin"],
      ["goblin", "goblin", "goblin"],
    ],
    rollEnemies: () => {
      return [
        [new Goblin(), new Goblin()],
        [new Goblin(), new Goblin(), new Goblin()],
      ];
    },
  }) satisfies DungeonConfig;
