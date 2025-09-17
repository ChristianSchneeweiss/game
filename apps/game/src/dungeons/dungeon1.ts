import type { DungeonConfig } from "./types";

export const dungeon1 = () =>
  ({
    key: "dungeon1",
    name: "Dungeon 1",
    description: "This is the first dungeon",
    availableEnemies: [
      // ["sky-serpent"],
      // ["water-elemental"],
      ["thunder-drake"],
      ["commander-kelvaris"],
      ["thundermaw"],
      ["goblin", "goblin"],
      ["goblin", "goblin", "goblin"],
    ],
    maxPartySize: 2,
  }) satisfies DungeonConfig;
