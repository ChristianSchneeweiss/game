import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";
import type { InBetweenCharacterData } from "@loot-game/game/dungeons/types";
import type { Entity, Spell, TimelineEventFull } from "@loot-game/game/types";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { SkullIcon } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { useEventTimer } from "./-hooks/event-timer";

const roundTime = 1500;

export const Route = createFileRoute("/battle/$id")({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(
    trpc.getBattle.queryOptions(id, { staleTime: Infinity }),
  );
  const { timelineEvents, participants, startEntityData } = data;
  const { visibleEvents } = useEventTimer(timelineEvents, roundTime);

  const spellMap = useMemo(() => createSpellMap(participants), [participants]);

  const timelineEventsNode = useMemo(() => {
    const events: ReactNode[] = [];

    timelineEvents.forEach((event, index) => {
      //   if (index === 0 || event.round !== timelineEvents[index - 1].round) {
      //     events.push(
      //       <div key={`round-${event.round}`} className="my-6 flex items-center">
      //         <div className="h-px flex-grow bg-gray-300"></div>
      //         <div className="mx-4 font-bold text-gray-700">
      //           Round {event.round}
      //         </div>
      //         <div className="h-px flex-grow bg-gray-300"></div>
      //       </div>,
      //     );
      //   }

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
    () =>
      calculateStatsTimeline(
        startEntityData,
        participants,
        timelineEvents,
        visibleEvents,
        spellMap,
      ),
    [participants, timelineEvents, visibleEvents, spellMap],
  );

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
                currentStats.deltaHealth > 0 && "border-green-400",
                currentStats.deltaHealth < 0 && "border-red-400",
              )}
            >
              <div className={cn("flex justify-between")}>
                <h3 className="flex items-center gap-2 font-bold">
                  {entity.name}{" "}
                  {currentStats.flags.dead && (
                    <SkullIcon className="h-4 w-4 text-red-500" />
                  )}
                </h3>
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
                    {currentStats.deltaHealth !== 0 && (
                      <span
                        className={
                          currentStats.deltaHealth > 0
                            ? "ml-1 text-green-500"
                            : "ml-1 text-red-500"
                        }
                      >
                        {currentStats.deltaHealth > 0
                          ? `+${currentStats.deltaHealth}`
                          : currentStats.deltaHealth}
                      </span>
                    )}
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
              <div className="mt-2">
                {entity.spells.map((spell) => {
                  const cooldown = currentStats.cooldowns.get(spell.config.id);
                  return (
                    <div
                      key={spell.config.id}
                      className="flex justify-between text-sm"
                    >
                      <span>{spell.config.name}</span>
                      {cooldown ? (
                        <span className="text-orange-500">{cooldown}</span>
                      ) : (
                        <span className="text-green-500">Ready</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-4">
        {timelineEventsNode.slice(0, visibleEvents)}
      </div>
    </div>
  );
}

type Stats = {
  health: number;
  mana: number;
  deltaHealth: number;
  cooldowns: Map<string, number>;
  flags: {
    casting: boolean;
    dead: boolean;
  };
};

function calculateStatsTimeline(
  startEntityData: InBetweenCharacterData[],
  participants: Entity[],
  timelineEvents: TimelineEventFull[],
  visible: number,
  spellMap: SpellMap,
) {
  const timeline = new Map<string, Stats>();
  participants.forEach((entity) => {
    const statsTimeline = timelineEvents.slice(0, visible).reduce(
      (stats, event) => {
        // reset stuff as we otherwise carry over the previous events stuff
        stats.deltaHealth = 0;
        stats.flags.casting = false;
        // dont reset dead flag

        switch (event.event.eventType) {
          case "SPELL_CAST": {
            const spellId = event.event.data.spellId;
            const { damageApplied, healingApplied } = event.event.data;

            if (damageApplied && damageApplied.has(entity.id)) {
              const damage = damageApplied.get(entity.id) || 0;
              stats.health -= damage;
              stats.deltaHealth -= damage;
            }

            if (healingApplied && healingApplied.has(entity.id)) {
              const healing = healingApplied.get(entity.id) || 0;
              stats.health += healing;
              stats.deltaHealth += healing;
            }

            if (entity.spells.some((s) => s.config.id === spellId)) {
              const { spell } = spellMap.get(spellId)!;
              console.log(entity.id, spellId, spell.config.manaCost);
              stats.mana = Math.max(0, stats.mana - spell.config.manaCost);

              stats.flags.casting = true;

              // if the spell has a cooldown of 0 we leave it. otherwise we add 1
              // to make sure its working the same as the server
              const cooldown =
                spell.config.cooldown === 0 ? 0 : spell.config.cooldown + 1;
              if (cooldown) {
                stats.cooldowns.set(spellId, cooldown);
              }
            }
            break;
          }
          case "REDUCE_COOLDOWN": {
            const { spellId, amount } = event.event.data;
            const cooldown = stats.cooldowns.get(spellId);
            if (cooldown) {
              stats.cooldowns.set(spellId, cooldown - amount);
            }
            break;
          }
          case "DEATH": {
            if (entity.id !== event.event.data.id) break;
            stats.flags.dead = true;
            break;
          }
          case "HEALTH_REGEN": {
            if (entity.id !== event.event.data.entityId) break;
            const { amount } = event.event.data;
            stats.health = Math.min(stats.health + amount, entity.maxHealth);
            stats.deltaHealth += amount;
            break;
          }
          case "MANA_REGEN": {
            if (entity.id !== event.event.data.entityId) break;
            const { amount } = event.event.data;
            stats.mana = Math.min(stats.mana + amount, entity.maxMana);
            // stats.deltaMana += amount;
            break;
          }
        }

        return stats;
      },
      {
        health:
          startEntityData.find((e) => e.characterId === entity.id)?.health ??
          entity.maxHealth,
        mana:
          startEntityData.find((e) => e.characterId === entity.id)?.mana ??
          entity.maxMana,
        cooldowns: new Map(),
        flags: {
          casting: false,
          dead: false,
        },
      } as Stats,
    );

    timeline.set(entity.id, statsTimeline);
  });

  return timeline;
}

type SpellMap = Map<string, { spell: Spell; caster: Entity }>;

function createSpellMap(entities: Entity[]): SpellMap {
  const spellMap = new Map<string, { spell: Spell; caster: Entity }>();
  for (const entity of entities) {
    for (const spell of entity.spells) {
      spellMap.set(spell.config.id, { spell, caster: entity });
    }
  }
  return spellMap;
}
