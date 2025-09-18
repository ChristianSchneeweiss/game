import type { DungeonConfig } from "./types";

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
  }) satisfies DungeonConfig;
