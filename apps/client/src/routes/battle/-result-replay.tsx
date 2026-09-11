import { useState } from "react";
import type { BattleResultData } from "@/features/expedition/run-info";
import { BattleRender } from "./-battle-render";
import { useStatsTimeline } from "./-hooks/use-stats-timeline";
import { PresentationBoundary } from "./-presentation-boundary";
import RecordedBattle from "./-presentation/recorded-battle";

export default function ResultReplay({ data }: { data: BattleResultData }) {
  const [threeD, setThreeD] = useState(true);
  if (threeD)
    return (
      <PresentationBoundary onFallback={() => setThreeD(false)}>
        <RecordedBattle data={data} onFallback={() => setThreeD(false)} />
      </PresentationBoundary>
    );
  return <CardReplay data={data} />;
}
function CardReplay({ data }: { data: BattleResultData }) {
  const { statsTimeline } = useStatsTimeline(
    data.timelineData,
    data.participants,
    data.startEntityData,
  );
  const [step, setStep] = useState(0);
  return (
    <section className="p-6" aria-label="Battle replay in Cards">
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
      <BattleRender
        participants={data.participants}
        stats={statsTimeline[step]?.stats}
        effectTracking={data.effectTracking}
        mode="replay"
      />
    </section>
  );
}
