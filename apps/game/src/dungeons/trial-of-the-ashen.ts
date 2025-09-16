import type { DungeonConfig } from "./types";

export const trialOfTheAshen = () =>
  ({
    key: "trial-of-the-ashen",
    name: "Trial of the Ashen",
    description: "This is the third dungeon",
    availableEnemies: [
      ["ashen-skeleton", "ashen-skeleton"],
      ["lurking-flame-wraith"],
      ["crypt-crawler", "crypt-crawler"],
      ["emberbound-revenant"],
    ],
    maxPartySize: 2,
  }) satisfies DungeonConfig;
