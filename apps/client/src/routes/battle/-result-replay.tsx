import { useState } from "react";
import type { BattleResultData } from "@/features/expedition/run-info";
import { BattleRender } from "./-battle-render";
import { useStatsTimeline } from "./-hooks/use-stats-timeline";
import { PresentationBoundary } from "./-presentation-boundary";
import RecordedBattle from "./-presentation/recorded-battle";
import { TacticalBoard } from "./-presentation/tactical-board";

type ReplayData = Pick<
  BattleResultData,
  "timelineData" | "participants" | "startEntityData" | "effectTracking"
>;

export default function ResultReplay({ data }: { data: ReplayData }) {
  const [threeD, setThreeD] = useState(true);
  if (threeD)
    return (
      <PresentationBoundary onFallback={() => setThreeD(false)}>
        <RecordedBattle data={data} onFallback={() => setThreeD(false)} />
      </PresentationBoundary>
    );
  return <CardReplay data={data} onShow3D={() => setThreeD(true)} />;
}
function CardReplay({
  data,
  onShow3D,
}: {
  data: ReplayData;
  onShow3D: () => void;
}) {
  const { statsTimeline } = useStatsTimeline(
    data.timelineData,
    data.participants,
    data.startEntityData,
    data.effectTracking,
  );
  const [step, setStep] = useState(0);
  return (
    <section className="p-6" aria-label="Battle replay in Cards">
      <div
        className="mb-4 flex justify-end gap-2"
        aria-label="Battle presentation"
      >
        <button className="rpg-badge" aria-pressed={true}>
          Cards
        </button>
        <button className="rpg-badge" aria-pressed={false} onClick={onShow3D}>
          3D battlefield
        </button>
      </div>
      <label className="mb-6 flex items-center gap-4">
        Replay step {step} / {statsTimeline.length - 1}
        <input
          className="flex-1"
          aria-label="Replay step"
          type="range"
          min={0}
          max={statsTimeline.length - 1}
          value={step}
          onChange={(event) => setStep(Number(event.target.value))}
        />
      </label>
      {statsTimeline[step]?.grid && (
        <TacticalBoard
          grid={statsTimeline[step].grid!}
          participants={data.participants}
          stats={statsTimeline[step].stats}
        />
      )}
      <BattleRender
        participants={data.participants}
        stats={statsTimeline[step]?.stats}
        effectTracking={data.effectTracking}
        mode="replay"
      />
    </section>
  );
}
