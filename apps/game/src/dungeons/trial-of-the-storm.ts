import type { DungeonConfig } from "./types";
import { ENCOUNTER_LAYOUTS } from "../tactical/encounters";

export const trialOfTheStorm = () =>
  ({
    key: "trial-of-the-storm",
    name: "Trial of the Storm",
    description: "This is the fifth dungeon",
    availableEnemies: [
      [
        "storm-hatchling",
        "storm-hatchling",
        "storm-hatchling",
        "storm-hatchling",
      ],
      ["skybolt-wyvern", "skybolt-wyvern"],
      ["sky-serpent"],
      ["thunder-drake"],
      ["thundermaw"],
    ],
    maxPartySize: 2,
    battlefields: ENCOUNTER_LAYOUTS["trial-of-the-storm"],
  }) satisfies DungeonConfig;
