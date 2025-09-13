import { BarkhideShaman } from "../enemies/barkhide-shaman";
import { ElderTreant } from "../enemies/elder-treant";
import { HollowedOakwarden } from "../enemies/hollowed-oakwarden";
import { MossCoveredGolem } from "../enemies/moss-covered-golem";
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
    rollEnemies: () => {
      return [
        [new MossCoveredGolem(), new MossCoveredGolem()],
        [new BarkhideShaman(), new MossCoveredGolem()],
        [new ElderTreant()],
        [new BarkhideShaman(), new BarkhideShaman()],
        [new HollowedOakwarden()],
      ];
    },
  }) satisfies DungeonConfig;
