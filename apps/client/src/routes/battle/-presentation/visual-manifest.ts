// Visible controls on the development replay page exercise real failure paths.
export const sceneFault =
  import.meta.env?.DEV && typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("sceneFault")
    : null;
const loadSample =
  import.meta.env?.DEV && typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("loadSample")
    : null;
export const miniature = {
  url:
    sceneFault === "model"
      ? "/models/missing-warrior.glb"
      : `/models/kaykit-skeletons-1.0/warrior.glb${loadSample ? `?sample=${encodeURIComponent(loadSample)}` : ""}`,
  name: "KayKit Skeleton Warrior 1.0",
  scale: 1.05,
  facing: Math.PI / 2,
  labelHeight: 2.7,
  impactFraction: 0.45,
  clips: {
    idle: "Idle",
    attack:
      sceneFault === "clip"
        ? "Missing_Attack"
        : "1H_Melee_Attack_Slice_Diagonal",
    hit: "Hit_A",
    death: "Death_A",
  },
} as const;
