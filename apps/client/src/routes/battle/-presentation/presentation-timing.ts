import type { DisplayFrame, VisualCue } from "./timeline";

export function isBookkeeping(frame?: DisplayFrame) {
  return (
    frame?.cue?.kind === "REGEN" || frame?.cue?.kind === "REDUCE_SPELL_COOLDOWN"
  );
}

/** Keep the raw replay cursor while combining consecutive resource updates into one transition. */
export function afterBookkeeping(frames: DisplayFrame[], cursor: number) {
  let end = cursor;
  while (isBookkeeping(frames[end + 1])) end++;
  return end;
}

export function cueDuration(cue?: VisualCue): number {
  if (!cue) return 1000;
  if (cue.kind === "REGEN" || cue.kind === "REDUCE_SPELL_COOLDOWN") return 0;
  if (cue.kind === "DEATH") return 280;
  if (cue.kind === "EFFECT_REMOVAL") return 140;
  if (cue.kind === "EFFECT_TRIGGER") return 360;
  if (cue.style === "effect") return 140;
  if (cue.major) return 900;
  if (cue.style === "melee") return 540;
  if (cue.style === "heal" || cue.style === "ward") return 660;
  return 720;
}
