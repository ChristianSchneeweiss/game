import { SkySerpent } from "../enemies/sky-serpent";
import { SkyboltWyvern } from "../enemies/skybolt-wyvern";
import { StormHatchling } from "../enemies/storm-hatchling";
import { Thundermaw } from "../enemies/thundermaw";
import { ThunderDrake } from "../enemies/tunder-drake";
import type { DungeonConfig } from "./types";

export const trialOfTheStorm = () =>
  ({
    key: "trial-of-the-storm",
    name: "Trial of the Storm",
    description: "This is the fifth dungeon",
    availableEnemies: [
      ["storm-hatchling", "storm-hatchling", "storm-hatchling"],
      ["skybolt-wyvern", "skybolt-wyvern"],
      ["sky-serpent"],
      ["thunder-drake"],
      ["thundermaw"],
    ],
  }) satisfies DungeonConfig;
