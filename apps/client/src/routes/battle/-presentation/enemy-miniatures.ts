import type { EnemyType } from "@loot-game/game/enemies/base/enemy-types";
import type { MiniatureDefinition } from "./visual-manifest";
import placements from "./enemy-model-placements.json";

type Clips = MiniatureDefinition["clips"];
const skeleton: Clips = {
  idle: "Idle",
  attack: "1H_Melee_Attack_Slice_Diagonal",
  cast: "Spellcast_Shoot",
  heal: "Spellcast_Raise",
  hit: "Hit_A",
  death: "Death_A",
};
const flying: Clips = {
  idle: "Flying_Idle",
  attack: "Headbutt",
  cast: "Punch",
  heal: "Punch",
  hit: "HitReact",
  death: "Death",
};
const biped: Clips = {
  idle: "Idle",
  attack: "Weapon",
  cast: "Punch",
  heal: "Punch",
  hit: "HitReact",
  death: "Death",
};
const treant: Clips = {
  idle: "Idle",
  attack: "Attack_1",
  cast: "Taunt",
  heal: "Taunt",
  hit: null,
  death: "Death1",
};
const original: Clips = {
  idle: "Idle",
  attack: "Attack",
  cast: "Cast",
  heal: "Cast",
  hit: "Hit",
  death: "Death",
};
const sample =
  import.meta.env?.DEV && typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("loadSample")
    : null;

function model(
  file: keyof typeof placements,
  clips: Clips,
  size = 1,
): MiniatureDefinition {
  const { min, max, deathMinY } = placements[file];
  // Bound both height and footprint. The idle envelope includes wing/limb motion.
  const scale =
    Math.min(
      2.05 / (max[1] - min[1]),
      2.7 / Math.max(max[0] - min[0], max[2] - min[2]),
    ) * size;
  const hover = clips.idle === "Flying_Idle" ? 0.12 : 0;
  return {
    id: file.slice(0, -4),
    name: file.slice(0, -4).replaceAll(/[-_]/g, " "),
    url: `/models/enemies-v1/${file}${sample ? `?sample=${encodeURIComponent(sample)}` : ""}`,
    scale,
    facing: -Math.PI / 3,
    labelHeight: 2.6,
    offset: [
      (-(min[0] + max[0]) * scale) / 2,
      -min[1] * scale + hover,
      (-(min[2] + max[2]) * scale) / 2,
    ],
    deathOffsetY: -deathMinY * scale,
    halfDepth: ((max[2] - min[2]) * scale) / 2,
    clips,
  };
}

// Exhaustive against the game roster. Related enemies currently share art bases.
// null means an intentionally absent native clip, handled by a procedural pose.
export const enemyMiniatures: Record<EnemyType, MiniatureDefinition> = {
  goblin: model("Big-Orc.glb", biped, 0.9),
  "skeleton-grunt": model("Skeleton_Minion.glb", skeleton),
  "rotting-corpse": model("Zombie.glb", {
    idle: "ZombieIdle",
    attack: "ZombieBite",
    cast: "ZombieBite",
    heal: "ZombieBite",
    hit: null,
    death: null,
  }),
  "wisp-of-regret": model("Flying-Ghost.glb", flying, 0.85),
  "ghoul-knight-ivern": model("Skeleton_Warrior.glb", skeleton, 1.1),
  "emberbound-revenant": model("Skeleton_Mage.glb", skeleton, 1.1),
  "ashen-skeleton": model("Skeleton_Minion.glb", skeleton),
  "lurking-flame-wraith": model("Flying-Ghost_Skull.glb", flying),
  "crypt-crawler": model("spider-animations.glb", {
    ...original,
    cast: "Bite",
    heal: "Bite",
  }),
  "moss-covered-golem": model("Moss_Golem.glb", original),
  "barkhide-shaman": model("Tree01.glb", treant, 0.95),
  "hollowed-oakwarden": model("Tree02.glb", treant, 1.1),
  "elder-treant": model("Tree01.glb", treant, 1.05),
  thundermaw: model("Flying-Dragon_Evolved.glb", flying, 1.1),
  "thunder-drake": model("Flying-Dragon_Evolved.glb", flying),
  "sky-serpent": model("snake-animations.glb", {
    ...original,
    attack: "Bite",
    cast: "Bite",
    heal: "Bite",
  }),
  "storm-hatchling": model("Flying-Dragon.glb", flying, 0.85),
  "skybolt-wyvern": model("Flying-Dragon_Evolved.glb", flying, 0.95),
  "commander-kelvaris": model("Big-Fish.glb", biped, 1.1),
  "fishfolk-shaman": model("Big-Fish.glb", biped),
  "fishfolk-scout": model("Big-Fish.glb", biped, 0.9),
  "water-elemental": model("Water_Elemental.glb", original),
};
