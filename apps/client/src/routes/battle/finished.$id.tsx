import { trpc } from "@/utils/trpc";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { serialize } from "superjson";
import { BattleRender } from "./-battle-render";
import { useStatsTimeline } from "./-hooks/use-stats-timeline";

export const Route = createFileRoute("/battle/finished/$id")({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(trpc.getBattle.queryOptions(id));

  const { statsTimeline } = useStatsTimeline(
    data.timelineEvents,
    data.participants,
    data.startEntityData,
  );

  const [visibleEvents, setVisibleEvents] = useState(0);

  const stats = statsTimeline[visibleEvents]?.stats;

  return (
    <div>
      <h1>Battle finished</h1>
      <p>Battle ID: {id}</p>
      <input
        type="range"
        min={0}
        max={data.timelineEvents.length - 1}
        value={visibleEvents}
        onChange={(e) => setVisibleEvents(Number(e.target.value))}
      />
      <p>
        Visible events: {visibleEvents + 1} / {data.timelineEvents.length}
      </p>
      <pre>
        {JSON.stringify(
          serialize(data.timelineEvents[visibleEvents - 1]),
          null,
          2,
        )}
      </pre>
      <div className="flex flex-col gap-4">
        <BattleRender
          participants={data.participants}
          stats={stats}
          effectTracking={data.effectTracking}
        />
      </div>
    </div>
  );
}
