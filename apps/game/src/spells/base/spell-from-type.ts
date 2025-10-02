import { AegisWallSpell } from "../aegis-wall";
import { AquaWaveSpell } from "../aqua-wave";
import { ArcaneChannelingSpell } from "../arcane-channeling";
import { BasicAttackSpell } from "../basic-attack";
import { BattleRoarSpell } from "../battle-roar";
import { BladestormRhythmSpell } from "../bladestorm-rythm";
import { BulwarkBashSpell } from "../bulwark-bash";
import { CharredChainsSpell } from "../charred-chains";
import { CinderWispSpell } from "../cinder-wisp";
import { CinderbrandSpell } from "../cinderbrand";
import { CrudeStrikeSpell } from "../crude-strike";
import { CrushingBlowSpell } from "../crushing-blow";
import { DeflectingStanceSpell } from "../deflecting-stance";
import { EarthshatterSpell } from "../earthshatter";
import { FesteringBlowSpell } from "../festering-blow";
import { FinalVerdictSpell } from "../final-verdict";
import { FireballSpell } from "../fireball";
import { FleetfootGambitSpell } from "../fleetfoot-gambit";
import { IronWillSpell } from "../iron-will";
import { LightningSurgeSpell } from "../lightning-surge";
import { NaturesEmbrace } from "../natures-embrace";
import { OceanBlessingSpell } from "../ocean-blessing";
import { PreciseThrustSpell } from "../precise-thrust";
import { RootgraspSpell } from "../rootgrasp";
import { RuptureSpell } from "../rupture";
import { SingleHealSpell } from "../single-heal";
import { SoulflareSpell } from "../soulflare";
import { SplinterShotSpell } from "../splinter-shot";
import { StaggeringJabSpell } from "../staggering-jab";
import { StoneBarkSpell } from "../stone-bark";
import { StormPulseSpell } from "../storm-pulse";
import { StreamOfLifeSpell } from "../stream-of-life";
import { StunningStrikeSpell } from "../stunning-strike";
import { TidalPulseSpell } from "../tidal-pulse";
import { TidepiercerThrustSpell } from "../tidepiercer-thrust";
import { TorrentSpiralSpell } from "../torrent-spiral";
import { VerdantSmiteSpell } from "../verdant-smite";
import { VitalStrikeSpell } from "../vital-strike";
import { VoltLashSpell } from "../volt-lash";
import type { SpellType } from "./spell-types";

export const createSpellFromType = (id: string, type: SpellType) => {
  switch (type) {
    case "basic-attack":
      return new BasicAttackSpell(id);
    case "fireball":
      return new FireballSpell(id);
    case "single-heal":
      return new SingleHealSpell(id);
    case "crude-strike":
      return new CrudeStrikeSpell(id);
    case "festering-blow":
      return new FesteringBlowSpell(id);
    case "cinder-wisp":
      return new CinderWispSpell(id);
    case "vital-strike":
      return new VitalStrikeSpell(id);
    case "splinter-shot":
      return new SplinterShotSpell(id);
    case "cinderbrand":
      return new CinderbrandSpell(id);
    case "precise-thrust":
      return new PreciseThrustSpell(id);
    case "soulflare":
      return new SoulflareSpell(id);
    case "charred-chains":
      return new CharredChainsSpell(id);
    case "crushing-blow":
      return new CrushingBlowSpell(id);
    case "stone-bark":
      return new StoneBarkSpell(id);
    case "rootgrasp":
      return new RootgraspSpell(id);
    case "verdant-smite":
      return new VerdantSmiteSpell(id);
    case "natures-embrace":
      return new NaturesEmbrace(id);
    case "lightning-surge":
      return new LightningSurgeSpell(id);
    case "stunning-strike":
      return new StunningStrikeSpell(id);
    case "staggering-jab":
      return new StaggeringJabSpell(id);
    case "battle-roar":
      return new BattleRoarSpell(id);
    case "torrent-spiral":
      return new TorrentSpiralSpell(id);
    case "tidepiercer-thrust":
      return new TidepiercerThrustSpell(id);
    case "ocean-blessing":
      return new OceanBlessingSpell(id);
    case "aqua-wave":
      return new AquaWaveSpell(id);
    case "tidal-pulse":
      return new TidalPulseSpell(id);
    case "stream-of-life":
      return new StreamOfLifeSpell(id);
    case "rupture":
      return new RuptureSpell(id);
    case "volt-lash":
      return new VoltLashSpell(id);
    case "storm-pulse":
      return new StormPulseSpell(id);
    case "final-verdict":
      return new FinalVerdictSpell(id);
    case "aegis-wall":
      return new AegisWallSpell(id);
    case "bulwark-bash":
      return new BulwarkBashSpell(id);
    case "earthshatter":
      return new EarthshatterSpell(id);
    case "deflecting-stance":
      return new DeflectingStanceSpell(id);
    case "bladestorm-rhythm":
      return new BladestormRhythmSpell(id);
    case "iron-will":
      return new IronWillSpell(id);
    case "arcane-channeling":
      return new ArcaneChannelingSpell(id);
    case "fleetfoot-gambit":
      return new FleetfootGambitSpell(id);
    default:
      throw new Error(`Unknown spell type: ${type}`);
  }
};
