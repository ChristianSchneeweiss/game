import type { Entity } from "@loot-game/game/entity-types";
import type { EffectTracking } from "@loot-game/game/bm";
import type { EffectType } from "@loot-game/game/types";
import type { TimelineEventFull } from "@loot-game/game/timeline-events";
import { skillName } from "../../../lib/skill-icons";

export type ConditionDetail = {
  id: string;
  name: string;
  iconType: string;
  category: string;
  description: string;
  tone: "beneficial" | "harmful" | "neutral";
  sourceId?: string;
};
const categories: Record<EffectType, string> = {
  BUFF: "Buff",
  DEBUFF: "Debuff",
  DOT: "Damage over time",
  HOT: "Healing over time",
  CURSE: "Curse",
  STUN: "Stunned",
  CHARGE: "Charging",
  CONTROL: "Controlled",
  SHIELD: "Shield",
  PASSIVE: "Passive",
};
const harmful = new Set<EffectType>([
  "DEBUFF",
  "DOT",
  "CURSE",
  "STUN",
  "CONTROL",
]);
const beneficial = new Set<EffectType>(["BUFF", "HOT", "SHIELD"]);

/** Associate existing effect IDs with their recorded source, without invoking content methods. */
export function buildConditionDetails(
  participants: Entity[],
  events: TimelineEventFull[],
  effects: EffectTracking,
): Map<string, ConditionDetail> {
  const spells = new Map(
    participants.flatMap((entity) =>
      entity.spells.map((spell) => [spell.config.id, spell.config] as const),
    ),
  );
  const sources = new Map<string, { name: string; iconType: string }>();
  for (const entity of participants) {
    for (const passive of entity.passiveSkills ?? []) {
      if (
        !("passiveType" in passive) ||
        typeof passive.passiveType !== "string"
      )
        continue;
      sources.set(passive.id, {
        name: skillName(passive.passiveType),
        iconType: passive.passiveType,
      });
    }
  }
  for (const { event } of events) {
    if (
      event.eventType !== "SPELL_CAST" &&
      event.eventType !== "EFFECT_TRIGGER"
    )
      continue;
    const spell =
      event.eventType === "SPELL_CAST"
        ? spells.get(event.data.spellId)
        : undefined;
    const source = spell
      ? { name: spell.name, iconType: spell.type }
      : event.eventType === "EFFECT_TRIGGER"
        ? sources.get(event.data.effectId)
        : undefined;
    if (!source) continue;
    for (const ids of event.data.effectsApplied?.values() ?? []) {
      for (const id of ids) {
        // Join events can share an ID with Basic Attack. Preserve the passive's
        // explicit identity instead of treating that event as a cast source.
        if (effects.get(id)?.effectType === "PASSIVE" && sources.has(id))
          continue;
        sources.set(id, source);
      }
    }
  }
  return new Map(
    [...effects].map(([id, effect]) => {
      const source = sources.get(id);
      return [
        id,
        {
          id,
          name: source?.name ?? categories[effect.effectType],
          iconType:
            source?.iconType ?? `effect-${effect.effectType.toLowerCase()}`,
          category: categories[effect.effectType],
          description: effect.description,
          tone: harmful.has(effect.effectType)
            ? "harmful"
            : beneficial.has(effect.effectType)
              ? "beneficial"
              : "neutral",
          sourceId: effect.sourceId,
        } satisfies ConditionDetail,
      ];
    }),
  );
}

export function conditionDetail(
  id: string,
  details: Map<string, ConditionDetail>,
): ConditionDetail {
  return (
    details.get(id) ?? {
      id,
      name: "Unknown condition",
      iconType: "effect-passive",
      category: "Effect",
      description: "Details are unavailable for this condition.",
      tone: "neutral",
    }
  );
}

export function groupConditions(
  ids: string[],
  details: Map<string, ConditionDetail>,
) {
  const groups = new Map<string, { detail: ConditionDetail; count: number }>();
  for (const id of ids) {
    const detail = conditionDetail(id, details);
    const key = `${detail.iconType}:${detail.category}:${detail.description}`;
    const existing = groups.get(key);
    if (existing) existing.count++;
    else groups.set(key, { detail, count: 1 });
  }
  const order = { harmful: 0, beneficial: 1, neutral: 2 };
  return [...groups.values()].sort(
    (a, b) => order[a.detail.tone] - order[b.detail.tone],
  );
}
