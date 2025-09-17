import type { DungeonConfig } from "./types";

export const dungeon1 = () =>
  ({
    key: "dungeon1",
    name: "Dungeon 1",
    description: "This is the first dungeon",
    availableEnemies: [
      // ["sky-serpent"],
      // ["water-elemental"],
      // ["goblin"],
      ["thunder-drake"],
      ["commander-kelvaris"],
      ["thundermaw"],
    ],
    maxPartySize: 2,
  }) satisfies DungeonConfig;
