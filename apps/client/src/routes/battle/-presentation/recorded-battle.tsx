import type { Entity } from "@loot-game/game/entity-types";
import type { TimelineEventFull } from "@loot-game/game/timeline-events";
import type { EffectTracking } from "@loot-game/game/bm";
import type { InBetweenCharacterData } from "@loot-game/game/dungeons/types";
import { usePlayback } from "./use-playback";
import BattleView3D from "./battle-view-3d";

export default function RecordedBattle({
  data,
  onFallback,
}: {
  data: {
    participants: Entity[];
    timelineData: TimelineEventFull[];
    effectTracking: EffectTracking;
    startEntityData: InBetweenCharacterData[];
  };
  onFallback: () => void;
}) {
  const playback = usePlayback(
    data.participants,
    data.timelineData,
    data.effectTracking,
    0,
    true,
    data.startEntityData,
  );
  return (
    <BattleView3D
      participants={data.participants}
      effects={data.effectTracking}
      playback={playback}
      onFallback={onFallback}
    />
  );
}
