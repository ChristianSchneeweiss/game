import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";
import type { Entity, TimelineEventFull } from "@loot-game/game/types";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";

export const Route = createFileRoute("/battle/$id")({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(
    trpc.getBattle.queryOptions(id, { staleTime: Infinity }),
  );
  const { timelineEvents, participants } = data;
  const [visibleEvents, setVisibleEvents] = useState(0);

  const timelineEventsNode = useMemo(() => {
    const events: ReactNode[] = [];

    timelineEvents.forEach((event, index) => {
      // Add a round divider if this is the first event of a new round
      if (index === 0 || event.round !== timelineEvents[index - 1].round) {
        events.push(
          <div key={`round-${event.round}`} className="my-6 flex items-center">
            <div className="h-px flex-grow bg-gray-300"></div>
            <div className="mx-4 font-bold text-gray-700">
              Round {event.round}
            </div>
            <div className="h-px flex-grow bg-gray-300"></div>
          </div>,
        );
      }

      // Add the event
      events.push(
        <div key={`event-${index}`} className="rounded border p-3 shadow">
          <div className="font-semibold">{event.event.eventType}</div>
          <pre className="mt-2 overflow-auto rounded p-2 text-sm">
            {JSON.stringify(event.event.data, null, 2)}
          </pre>
        </div>,
      );
    });

    return events;
  }, [timelineEvents]);

  const statsTimeline = useMemo(
    () => calculateStatsTimeline(participants, timelineEvents, visibleEvents),
    [participants, timelineEvents, visibleEvents],
  );

  useEffect(() => {
    if (visibleEvents < timelineEvents.length) {
      const timer = setTimeout(() => {
        setVisibleEvents((prev) => prev + 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [visibleEvents, timelineEvents.length]);

  return (
    <div className="p-4">
      <h1 className="mb-4 text-2xl font-bold">Battle Timeline</h1>

      <div className="mb-6 grid grid-cols-2 gap-4">
        {participants.map((entity) => {
          // Calculate current health and mana based on processed events
          const currentStats = statsTimeline.get(entity.id)!;

          // Ensure health doesn't go below 0 or above max
          const displayHealth = Math.max(
            0,
            Math.min(currentStats.health, entity.maxHealth),
          );
          const healthPercent = (displayHealth / entity.maxHealth) * 100;

          // Ensure mana doesn't go below 0 or above max
          const maxMana = entity.maxMana;
          const displayMana = Math.max(0, Math.min(currentStats.mana, maxMana));
          const manaPercent = (displayMana / maxMana) * 100;

          return (
            <div
              key={entity.id}
              className={cn(
                "rounded border p-4 shadow",
                currentStats.flags.casting && "border-blue-400",
              )}
            >
              <div className={cn("flex justify-between")}>
                <h3 className="font-bold">{entity.name}</h3>
                <span
                  className={`text-sm ${entity.team === "TEAM_A" ? "text-blue-600" : "text-red-600"}`}
                >
                  {entity.team === "TEAM_A" ? "Allies" : "Enemies"}
                </span>
              </div>

              <div className="mt-2">
                <div className="flex justify-between text-sm">
                  <span>Health</span>
                  <span>
                    {displayHealth}/{entity.maxHealth}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-red-500"
                    style={{ width: `${healthPercent}%` }}
                  ></div>
                </div>
              </div>

              <div className="mt-2">
                <div className="flex justify-between text-sm">
                  <span>Mana</span>
                  <span>
                    {displayMana}/{maxMana}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-blue-500"
                    style={{ width: `${manaPercent}%` }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-4">
        {timelineEventsNode.slice(0, visibleEvents)}
      </div>

      {visibleEvents < timelineEvents.length && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setVisibleEvents(timelineEvents.length)}
            className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            Show All
          </button>
        </div>
      )}
    </div>
  );
}

type Stats = {
  health: number;
  mana: number;
  flags: {
    casting: boolean;
  };
};

function calculateStatsTimeline(
  participants: Entity[],
  timelineEvents: TimelineEventFull[],
  visible: number,
) {
  const timeline = new Map<string, Stats>();
  participants.forEach((entity) => {
    const statsTimeline = timelineEvents.slice(0, visible).reduce(
      (stats, event) => {
        if (event.event.eventType === "SPELL_CAST") {
          const spellId = event.event.data.spellId;
          const { damageApplied, healingApplied } = event.event.data;

          if (damageApplied && damageApplied.has(entity.id)) {
            stats.health -= damageApplied.get(entity.id) || 0;
          }

          if (healingApplied && healingApplied.has(entity.id)) {
            stats.health += healingApplied.get(entity.id) || 0;
          }

          if (entity.spells.some((s) => s.config.id === spellId)) {
            stats.mana = Math.max(0, stats.mana - 10); // we need the spell here
            stats.flags.casting = true;
          } else {
            stats.flags.casting = false;
          }
        }

        return stats;
      },
      {
        health: entity.maxHealth,
        mana: entity.maxMana,
        flags: {
          casting: false,
        },
      } as Stats,
    );

    timeline.set(entity.id, statsTimeline);
  });

  return timeline;
}
