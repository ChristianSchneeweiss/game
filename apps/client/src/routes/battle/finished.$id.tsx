import { trpc } from "@/utils/trpc";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ScrollText, Sparkles } from "lucide-react";
import { useState } from "react";
import { serialize } from "superjson";
import {
  RpgBackLink,
  RpgInset,
  RpgPage,
  RpgPanel,
  RpgSectionHeading,
  RpgStatTile,
} from "@/components/rpg-ui";
import { BattleRender } from "./-battle-render";
import { useStatsTimeline } from "./-hooks/use-stats-timeline";

export const Route = createFileRoute("/battle/finished/$id")({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(trpc.getBattle.queryOptions(id));

  const { statsTimeline } = useStatsTimeline(
    data.timelineData,
    data.participants,
    data.startEntityData,
  );

  const [visibleEvents, setVisibleEvents] = useState(0);
  const stats = statsTimeline[visibleEvents]?.stats;
  const currentEvent = data.timelineData[visibleEvents];

  return (
    <RpgPage>
      <div className="space-y-8">
        <RpgBackLink to="/dungeons">Back to dungeons</RpgBackLink>

        <RpgPanel className="px-6 py-6 sm:px-8 sm:py-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div className="max-w-3xl">
              <div className="rpg-badge">
                <Sparkles className="h-3.5 w-3.5" />
                Battle replay
              </div>
              <h1 className="rpg-heading mt-5 text-4xl font-semibold uppercase tracking-[0.06em] sm:text-5xl lg:text-6xl">
                Replay the encounter
              </h1>
              <p className="rpg-copy mt-5 max-w-2xl text-base leading-8 sm:text-lg">
                Scrub the battle ledger, inspect the current event payload, and
                trace the exact state that produced the final result.
              </p>
            </div>

            <RpgInset variant="parchment" className="p-5">
              <p className="rpg-title text-[0.62rem] text-[#cfbf97]/75">
                Replay pulse
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <RpgStatTile label="Step" value={`${visibleEvents + 1}`} />
                <RpgStatTile label="Total" value={`${data.timelineData.length}`} />
              </div>
              <RpgInset variant="stone" className="mt-4 p-4">
                <div className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#b6ab92]">
                  <ScrollText className="h-4 w-4" />
                  Battle ID
                </div>
                <p className="mt-2 font-mono text-sm text-[#f1e8d4]">{id}</p>
              </RpgInset>
            </RpgInset>
          </div>
        </RpgPanel>

        <RpgPanel className="px-6 py-6">
          <RpgSectionHeading
            icon={<ArrowLeft className="h-5 w-5" />}
            eyebrow="Timeline control"
            title={`Visible event ${visibleEvents + 1} of ${data.timelineData.length}`}
          />
          <RpgInset variant="parchment" className="mt-5 p-5">
            <input
              type="range"
              min={0}
              max={data.timelineData.length - 1}
              value={visibleEvents}
              onChange={(e) => setVisibleEvents(Number(e.target.value))}
              className="w-full"
            />
          </RpgInset>
        </RpgPanel>

        <RpgPanel className="px-6 py-6">
          <RpgSectionHeading
            icon={<ScrollText className="h-5 w-5" />}
            eyebrow="Event snapshot"
            title="Current event payload"
          />
          <pre className="rpg-scroll-frame mt-5 overflow-x-auto p-4 text-xs leading-6 text-[#e7dcc7]">
            {JSON.stringify(serialize(currentEvent).json, null, 2)}
          </pre>
        </RpgPanel>

        <BattleRender
          participants={data.participants}
          stats={stats}
          effectTracking={data.effectTracking}
          battleId={id}
          mode="replay"
        />
      </div>
    </RpgPage>
  );
}
