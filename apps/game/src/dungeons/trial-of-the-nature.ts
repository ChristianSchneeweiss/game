import type { DungeonConfig } from "./types";

export const trialOfTheNature = () =>
  ({
    key: "trial-of-the-nature",
    name: "Trial of the Nature",
    description: "This is the fourth dungeon",
    availableEnemies: [
      ["moss-covered-golem", "moss-covered-golem"],
      ["barkhide-shaman", "moss-covered-golem"],
      ["elder-treant"],
      ["barkhide-shaman", "barkhide-shaman"],
      ["hollowed-oakwarden"],
    ],
    maxPartySize: 2,
  }) satisfies DungeonConfig;
