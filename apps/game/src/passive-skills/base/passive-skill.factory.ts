import type { Entity } from "../../entity-types";
import { ArmorUpPassive } from "../armor-up.passive";
import { BlessedFortunePassive } from "../blessed-fortune.passive";
import { BloodfangPassive } from "../bloodfang.passive";
import { KeenInstinctsPassive } from "../keen-instincts.passive";
import { MysticFlowPassive } from "../mystic-flow.passive";
import { SoulleechPassive } from "../soulleech.passive";
import { StoneformResolvePassive } from "../stoneform-resolve.passive";
import { ThornCarapacePassive } from "../thorn-carapace.passive";
import { TitansResurgencePassive } from "../titans-resurgence.passive";
import { VitalWellspringPassive } from "../vital-wellspring.passive";
import { PredatorsFocusPassive } from "../predators-focus.passive";
import { FleetFootedPassive } from "../fleet-footed.passive";
import { ArcaneBarrierPassive } from "../arcane-barrier.passive";
import { LastBastionPassive } from "../last-bastion.passive";
import { MercifulLightPassive } from "../merciful-light.passive";
import { ExecutionerPassive } from "../executioner.passive";
import type { PassiveType } from "./passive-types";

export const passiveSkillFactory = (
  passiveType: PassiveType,
  id: string,
  entity: Entity,
) => {
  switch (passiveType) {
    case "armor-up":
      return new ArmorUpPassive({ holder: entity, id });
    case "thorn-carapace":
      return new ThornCarapacePassive({ holder: entity, id });
    case "blessed-fortune":
      return new BlessedFortunePassive({ holder: entity, id });
    case "bloodfang":
      return new BloodfangPassive({ holder: entity, id });
    case "soulleech":
      return new SoulleechPassive({ holder: entity, id });
    case "mystic-flow":
      return new MysticFlowPassive({ holder: entity, id });
    case "vital-wellspring":
      return new VitalWellspringPassive({ holder: entity, id });
    case "stoneform-resolve":
      return new StoneformResolvePassive({ holder: entity, id });
    case "titans-resurgence":
      return new TitansResurgencePassive({ holder: entity, id });
    case "keen-instincts":
      return new KeenInstinctsPassive({ holder: entity, id });
    case "predators-focus":
      return new PredatorsFocusPassive({ holder: entity, id });
    case "fleet-footed":
      return new FleetFootedPassive({ holder: entity, id });
    case "arcane-barrier":
      return new ArcaneBarrierPassive({ holder: entity, id });
    case "last-bastion":
      return new LastBastionPassive({ holder: entity, id });
    case "merciful-light":
      return new MercifulLightPassive({ holder: entity, id });
    case "executioner":
      return new ExecutionerPassive({ holder: entity, id });
    default:
      throw new Error(`Unknown passive type: ${passiveType}`);
  }
};
