import type { Entity } from "@loot-game/game/entity-types";
import type { DisplayFrame, VisualCue } from "./timeline";
import { conditionDetail, type ConditionDetail } from "./battle-effects";
import { entityLabel } from "./entity-label";

export type ActionHistoryEntry = {
  index: number;
  round: number;
  caster: string;
  label: string;
  iconType?: string;
  critical: boolean;
  results: string[];
};

export function cueLabel(
  cue: VisualCue,
  conditions: Map<string, ConditionDetail>,
) {
  if (!cue.effectId) return cue.label;
  const detail = conditionDetail(cue.effectId, conditions);
  if (cue.kind === "SPELL_CAST") return detail.name;
  return `${detail.name} ${cue.kind === "EFFECT_REMOVAL" ? "ends" : "triggers"}`;
}

/** Read-only summaries, indexed by the raw event cursor so replay never reveals future outcomes. */
export function buildActionHistory(
  frames: DisplayFrame[],
  participants: Entity[],
  conditions: Map<string, ConditionDetail>,
): ActionHistoryEntry[] {
  const names = new Map(
    participants.map((entity) => [
      entity.id,
      entityLabel(entity, participants),
    ]),
  );
  const history: ActionHistoryEntry[] = [];
  for (let index = 1; index < frames.length; index++) {
    const frame = frames[index];
    const cue = frame.cue;
    if (
      !cue ||
      cue.kind === "REGEN" ||
      cue.kind === "REDUCE_SPELL_COOLDOWN" ||
      cue.kind === "GRID_START" ||
      cue.kind === "ACTIVATION_START" ||
      (cue.kind === "ACTIVATION_END" &&
        frame.event?.event.eventType === "ACTIVATION_END" &&
        frame.event.event.data.reason !== "pass")
    )
      continue;
    const before = frames[index - 1].stats;
    if (
      cue.kind === "DEATH" &&
      cue.targetIds.every((id) => before.get(id)?.flags.dead)
    )
      continue;
    const results = cue.targetIds.map((id) => {
      const current = frame.stats.get(id);
      const previous = before.get(id);
      const parts: string[] = [];
      const healthChange =
        current && previous ? current.health - previous.health : 0;
      if (healthChange)
        parts.push(
          `${healthChange > 0 ? "+" : "−"}${Math.abs(healthChange)} HP`,
        );
      const applied =
        current?.activeEffects.filter(
          (effect) => !previous?.activeEffects.includes(effect),
        ) ?? [];
      for (const effect of applied) {
        const category = conditionDetail(
          effect,
          conditions,
        ).category.toLowerCase();
        parts.push(
          category === "stunned" || category === "controlled"
            ? category
            : category === "charging"
              ? "charging started"
              : `${category} applied`,
        );
      }
      if (cue.kind === "EFFECT_REMOVAL") parts.push("effect ended");
      if (current?.flags.dead && !previous?.flags.dead) parts.push("fallen");
      if (!parts.length && cue.kind === "SPELL_CAST" && cue.style === "effect")
        parts.push("passive active");
      return `${names.get(id) ?? "Unknown entity"}${parts.length ? `: ${parts.join(" · ")}` : ": no health change"}`;
    });
    if (cue.strikeOrder?.length)
      results.push(
        `Strike order: ${cue.strikeOrder.map((id) => names.get(id) ?? "Unknown entity").join(" → ")}`,
      );
    if (cue.kind === "MOVE" && cue.path?.length)
      results.push(
        `Path: ${cue.path.map((tile) => `${tile.x + 1},${tile.y + 1}`).join(" → ")}`,
      );
    history.push({
      index,
      round: (frame.event?.round ?? 0) + 1,
      caster: cue.casterId ? (names.get(cue.casterId) ?? "Unknown entity") : "",
      label: cueLabel(cue, conditions),
      iconType:
        cue.skillType ??
        (cue.effectId
          ? conditionDetail(cue.effectId, conditions).iconType
          : undefined),
      critical: !!cue.casterId && !!frame.stats.get(cue.casterId)?.flags.isCrit,
      results,
    });
  }
  return history;
}

export function visibleHistory(
  history: ActionHistoryEntry[],
  shownCursor: number,
  limit = 12,
) {
  return history
    .filter((entry) => entry.index <= shownCursor)
    .slice(-limit)
    .reverse();
}
