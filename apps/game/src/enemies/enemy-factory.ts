import { AshenSkeleton } from "@loot-game/game/enemies/ashen-skeleton";
import { BarkhideShaman } from "@loot-game/game/enemies/barkhide-shaman";
import type { EnemyType } from "@loot-game/game/enemies/base/enemy-types";
import { CommanderKelvaris } from "@loot-game/game/enemies/commander-kelvaris";
import { CryptCrawler } from "@loot-game/game/enemies/crypt-crawler";
import { ElderTreant } from "@loot-game/game/enemies/elder-treant";
import { EmberboundRevenant } from "@loot-game/game/enemies/emberbound-revenant";
import { FishfolkScout } from "@loot-game/game/enemies/fishfolk-scout";
import { FishfolkShaman } from "@loot-game/game/enemies/fishfolk-shaman";
import { GhoulKnightIvern } from "@loot-game/game/enemies/ghoul-knight-ivern";
import { Goblin } from "@loot-game/game/enemies/goblin";
import { HollowedOakwarden } from "@loot-game/game/enemies/hollowed-oakwarden";
import { LurkingFlameWraith } from "@loot-game/game/enemies/lurking-flame-wraith";
import { MossCoveredGolem } from "@loot-game/game/enemies/moss-covered-golem";
import { RottingCorpse } from "@loot-game/game/enemies/rotting-corpse";
import { SkeletonGrunt } from "@loot-game/game/enemies/skeleton-grunt";
import { SkySerpent } from "@loot-game/game/enemies/sky-serpent";
import { SkyboltWyvern } from "@loot-game/game/enemies/skybolt-wyvern";
import { StormHatchling } from "@loot-game/game/enemies/storm-hatchling";
import { ThunderDrake } from "@loot-game/game/enemies/thunder-drake";
import { Thundermaw } from "@loot-game/game/enemies/thundermaw";
import { WaterElemental } from "@loot-game/game/enemies/water-elemental";
import { WispOfRegret } from "@loot-game/game/enemies/wisp-of-regret";

export const createEnemyFromType = (type: EnemyType, id?: string) => {
  switch (type) {
    case "goblin":
      return new Goblin(id);
    case "skeleton-grunt":
      return new SkeletonGrunt(id);
    case "rotting-corpse":
      return new RottingCorpse(id);
    case "wisp-of-regret":
      return new WispOfRegret(id);
    case "ghoul-knight-ivern":
      return new GhoulKnightIvern(id);
    case "emberbound-revenant":
      return new EmberboundRevenant(id);
    case "ashen-skeleton":
      return new AshenSkeleton(id);
    case "lurking-flame-wraith":
      return new LurkingFlameWraith(id);
    case "crypt-crawler":
      return new CryptCrawler(id);
    case "moss-covered-golem":
      return new MossCoveredGolem(id);
    case "barkhide-shaman":
      return new BarkhideShaman(id);
    case "hollowed-oakwarden":
      return new HollowedOakwarden(id);
    case "elder-treant":
      return new ElderTreant(id);
    case "thundermaw":
      return new Thundermaw(id);
    case "thunder-drake":
      return new ThunderDrake(id);
    case "sky-serpent":
      return new SkySerpent(id);
    case "storm-hatchling":
      return new StormHatchling(id);
    case "skybolt-wyvern":
      return new SkyboltWyvern(id);
    case "commander-kelvaris":
      return new CommanderKelvaris(id);
    case "fishfolk-shaman":
      return new FishfolkShaman(id);
    case "fishfolk-scout":
      return new FishfolkScout(id);
    case "water-elemental":
      return new WaterElemental(id);
    default:
      throw new Error(`Unknown enemy type: ${type}`);
  }
};
