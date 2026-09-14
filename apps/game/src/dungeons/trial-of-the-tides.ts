import type { DungeonConfig } from "./types";
import { ENCOUNTER_LAYOUTS } from "../tactical/encounters";

export const trialOfTheTides = () =>
  ({
    key: "trial-of-the-tides",
    name: "Trial of the Tides",
    description: "This is the sixth dungeon",
    availableEnemies: [
      ["fishfolk-scout", "fishfolk-scout"],
      ["fishfolk-scout", "fishfolk-shaman"],
      ["water-elemental"],
      ["fishfolk-shaman", "fishfolk-shaman", "fishfolk-scout"],
      ["commander-kelvaris"],
    ],
    maxPartySize: 2,
    battlefields: ENCOUNTER_LAYOUTS["trial-of-the-tides"],
  }) satisfies DungeonConfig;
