import { trpc } from "@/utils/trpc";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ScrollText, Sparkles } from "lucide-react";
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
    data.timelineData,
    data.participants,
    data.startEntityData,
  );

  const [visibleEvents, setVisibleEvents] = useState(0);
  const stats = statsTimeline[visibleEvents]?.stats;
  const currentEvent = data.timelineData[visibleEvents];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.12),transparent_20%),radial-gradient(circle_at_82%_16%,rgba(96,165,250,0.08),transparent_18%),linear-gradient(180deg,#030712_0%,#111827_46%,#020617_100%)] px-6 py-8 text-stone-100">
      <div className="mx-auto max-w-7xl">
        <Link
          to="/dungeons"
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-stone-300 transition-all duration-300 hover:border-white/20 hover:bg-white/8 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dungeons
        </Link>

        <section className="relative overflow-hidden rounded-4xl border border-white/10 bg-black/25 p-8 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-10">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(rgba(248,250,252,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(248,250,252,0.04)_1px,transparent_1px)] bg-size-[64px_64px] opacity-15"
          />
          <div
            aria-hidden="true"
            className="absolute right-0 top-0 h-56 w-56 rounded-full bg-amber-300/10 blur-3xl"
          />

          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-3 rounded-full border border-amber-300/18 bg-amber-300/10 px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-amber-100/85">
                <Sparkles className="h-3.5 w-3.5" />
                Battle replay
              </div>
              <h1 className="mt-5 font-['Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Palatino,Georgia,serif] text-5xl leading-[0.92] font-semibold tracking-[-0.05em] text-stone-50 sm:text-6xl">
                Replay the encounter.
              </h1>
              <p className="mt-5 max-w-2xl font-['Avenir_Next','Segoe_UI',sans-serif] text-base leading-8 text-stone-300 sm:text-lg">
                Scrub through the event timeline, inspect the arena state, and
                see exactly how the fight resolved.
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                Replay pulse
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <ReplayPill label="Step" value={`${visibleEvents + 1}`} />
                <ReplayPill label="Total" value={`${data.timelineData.length}`} />
              </div>
              <div className="mt-5 rounded-3xl border border-white/8 bg-black/20 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  <ScrollText className="h-4 w-4" />
                  Battle ID
                </div>
                <p className="mt-2 font-mono text-sm text-stone-100">{id}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-4xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200/70">
                Timeline scrubber
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-stone-50">
                Visible event {visibleEvents + 1} of {data.timelineData.length}
              </h2>
            </div>
            <input
              type="range"
              min={0}
              max={data.timelineData.length - 1}
              value={visibleEvents}
              onChange={(e) => setVisibleEvents(Number(e.target.value))}
              className="w-full accent-amber-300"
            />
          </div>
        </section>

        <section className="mt-8 rounded-4xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200/70">
              Event snapshot
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-stone-50">
              Current event payload
            </h2>
          </div>
          <pre className="overflow-x-auto rounded-3xl border border-white/8 bg-black/20 p-4 text-xs leading-6 text-stone-300">
            {JSON.stringify(serialize(currentEvent).json, null, 2)}
          </pre>
        </section>

        <div className="mt-8 flex flex-col gap-4">
        <BattleRender
          participants={data.participants}
          stats={stats}
          effectTracking={data.effectTracking}
          battleId={id}
          mode="replay"
        />
        </div>
      </div>
    </main>
  );
}

function ReplayPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/8 bg-black/20 p-4 text-center">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-stone-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-stone-50">{value}</p>
    </div>
  );
}
