import type { DungeonConfig } from "./types";

export const dungeon1 = () =>
  ({
    key: "dungeon1",
    name: "Avalanche Lair",
    description:
      "Avalanche Lair is a dungeon that is home to the avalanche lizard. It is a dangerous place to explore, and the lizards are known to be aggressive.",
    availableEnemies: [
      // ["sky-serpent"],
      // ["water-elemental"],
      ["goblin"],
      ["ashen-skeleton", "goblin"],
    ],
    maxPartySize: 2,
  }) satisfies DungeonConfig;
