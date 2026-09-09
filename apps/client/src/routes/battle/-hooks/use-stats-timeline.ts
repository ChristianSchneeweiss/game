import type { InBetweenCharacterData } from "@loot-game/game/dungeons/types";
import type { Entity } from "@loot-game/game/entity-types";
import type { EffectTracking } from "@loot-game/game/bm";
import type { TimelineEventFull } from "@loot-game/game/timeline-events";
import { useMemo } from "react";
import { buildTimeline } from "../-presentation/timeline";
export type { Stats } from "../-presentation/timeline";

export function useStatsTimeline(
  events: TimelineEventFull[],
  participants: Entity[],
  starts?: InBetweenCharacterData[],
  effects?: EffectTracking,
) {
  const statsTimeline = useMemo(
    () => buildTimeline(participants, events, starts, effects),
    [participants, events, starts, effects],
  );
  return { statsTimeline, defaultStats: statsTimeline[0].stats };
}
