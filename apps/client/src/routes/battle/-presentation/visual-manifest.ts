import { enemyMiniatures } from "./enemy-miniatures";
// Visible controls on the development replay page exercise real failure paths.
export const sceneFault =
  import.meta.env?.DEV && typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("sceneFault")
    : null;
const loadSample =
  import.meta.env?.DEV && typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("loadSample")
    : null;
export const impactFraction = 0.45;
export type MiniatureAction =
  | "idle"
  | "attack"
  | "cast"
  | "heal"
  | "hit"
  | "death";
export type MiniatureDefinition = {
  id: string;
  url: string;
  name: string;
  scale: number;
  facing: number;
  labelHeight: number;
  offset?: [number, number, number];
  deathOffsetY?: number;
  halfDepth?: number;
  clips: Record<MiniatureAction, string | null>;
};
function modelUrl(name: string) {
  const suffix = loadSample ? `?sample=${encodeURIComponent(loadSample)}` : "";
  return `/models/battle-v2/${name}.glb${suffix}`;
}
export const miniatures: Record<"party" | "enemy", MiniatureDefinition> = {
  party: {
    id: "knight",
    url:
      sceneFault === "model"
        ? "/models/missing-knight.glb"
        : modelUrl("knight"),
    name: "KayKit Knight",
    scale: 1,
    facing: Math.PI / 3,
    labelHeight: 2.6,
    clips: {
      idle: "Idle",
      attack:
        sceneFault === "clip"
          ? "Missing_Attack"
          : "1H_Melee_Attack_Slice_Diagonal",
      cast: "Spellcast_Shoot",
      heal: "Spellcast_Raise",
      hit: "Hit_A",
      death: "Death_A",
    },
  },
  enemy: {
    id: "dragon",
    url: modelUrl("dragon"),
    name: "Quaternius Dragon",
    scale: 0.65,
    facing: -Math.PI / 3,
    labelHeight: 2.45,
    clips: {
      idle: "Flying_Idle",
      attack: "Headbutt",
      cast: "Punch",
      heal: "Punch",
      hit: "HitReact",
      death: "Death",
    },
  },
};
export function miniatureFor(entity: { team: string; type?: unknown }) {
  if (entity.team === "TEAM_A") return miniatures.party;
  // Older recordings can lack a type. Display names are not model identifiers.
  return typeof entity.type === "string" &&
    Object.hasOwn(enemyMiniatures, entity.type)
    ? enemyMiniatures[entity.type as keyof typeof enemyMiniatures]
    : miniatures.enemy;
}
