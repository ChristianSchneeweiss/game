import { cn } from "@/lib/utils";
import { userStore } from "@/utils/user-store";
import type { InBetweenCharacterData } from "@loot-game/game/dungeons/types";
import type { TimelineEventFull } from "@loot-game/game/timeline-events";
import type { Entity, Spell } from "@loot-game/game/types";
import { createFileRoute } from "@tanstack/react-router";
import { BotIcon, SkullIcon } from "lucide-react";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import SuperJSON from "superjson";
import type z from "zod";
import type {
  BattleState,
  ResponseMessage,
  messageSchema,
} from "../../../../server/src/battle-ws";
import { useEventTimer } from "./-hooks/event-timer";

const roundTime = 1000;

export const Route = createFileRoute("/battle/$id")({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const [participants, setParticipants] = useState<Entity[]>([]);
  const [battleState, setBattleState] = useState<BattleState>();
  const [currentEventCounter, setCurrentEvents] = useState<number>(0);
  const [targets, setTargets] = useState<string[] | null>(null);
  const [activeSpell, setActiveSpell] = useState<string | null>(null);

  const castSpell = useCallback(
    (spellId: string, targetIds: string[]) => {
      if (!targets) return;
      if (!battleState) return;
      const activeEntity = battleState.round.order[battleState.currentInRound];

      sendMessage(
        SuperJSON.stringify({
          type: "castSpell",
          data: { entityId: activeEntity, spellId, targetIds },
        } satisfies z.infer<typeof messageSchema>),
      );
      setTargets(null);
      setActiveSpell(null);
    },
    [battleState],
  );

  const getTargets = useCallback(
    (spellId: string) => {
      if (!battleState) return;
      const activeEntity = battleState.round.order[battleState.currentInRound];
      setActiveSpell(spellId);

      sendMessage(
        SuperJSON.stringify({
          type: "getTargets",
          data: { entityId: activeEntity, spellId },
        } satisfies z.infer<typeof messageSchema>),
      );
    },
    [battleState],
  );

  const { visibleEvents } = useEventTimer(
    currentEventCounter,
    battleState?.events.length ?? 0,
    roundTime,
  );
  const isLive = visibleEvents === battleState?.events.length;

  console.log(visibleEvents, currentEventCounter, battleState?.events.length);
  console.log("targets", targets);

  const accessToken = userStore((s) => s.user?.access_token);
  const { sendMessage, lastMessage, readyState } = useWebSocket(
    `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/battle/${id}?access_token=${accessToken}`,
    {
      onMessage: (event) => {
        const response = SuperJSON.parse(event.data) as ResponseMessage;
        switch (response.type) {
          case "entities":
            setParticipants(response.data.entities);
            break;
          case "state":
            setCurrentEvents(battleState?.events.length ?? 0);
            setBattleState(response.data);
            break;
          case "targets":
            setTargets(response.data.targets);
            break;
          case "finished":
            alert(response.data.winner);
            break;
        }
      },
    },
  );

  // const { data } = useSuspenseQuery(
  //   trpc.getBattle.queryOptions(id, { staleTime: Infinity }),
  // );
  // const { timelineEvents, participants, startEntityData } = data;
  const startEntityData = participants.map((p) => ({
    characterId: p.id,
    health: p.maxHealth,
    mana: p.maxMana,
  }));

  const spellMap = useMemo(() => createSpellMap(participants), [participants]);

  const timelineEventsNode = useMemo(() => {
    const events: ReactNode[] = [];

    battleState?.events.forEach((event, index) => {
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
  }, [lastMessage]);

  const statsTimeline = useMemo(() => {
    return calculateStatsTimeline(
      startEntityData,
      participants,
      battleState?.events ?? [],
      visibleEvents,
      spellMap,
    );
  }, [participants, battleState, visibleEvents, spellMap]);

  if (readyState !== ReadyState.OPEN) return <p>Connecting...</p>;

  return (
    <div className="p-4">
      <h1 className="mb-4 text-2xl font-bold">Battle Timeline</h1>

      <div className="mb-6 grid grid-cols-2 gap-4">
        {participants.map((entity) => {
          if (!battleState) return null;
          // Calculate current health and mana based on processed events
          const currentStats = statsTimeline.get(entity.id)!;
          const activeEntity =
            battleState.round.order[battleState.currentInRound];

          const myTurn = activeEntity === entity.id;
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
          const enemy = participants.find(
            (p) => p.team === "TEAM_B" && p.health > 0,
          );
          const isTarget = targets?.includes(entity.id);

          return (
            <div
              key={entity.id}
              className={cn(
                "rounded border p-4 shadow",
                currentStats.flags.casting && "border-blue-400",
                currentStats.deltaHealth > 0 && "border-green-400",
                currentStats.deltaHealth < 0 && "border-red-400",
                myTurn && isLive && "scale-105 border-yellow-400",
              )}
            >
              <div className={cn("flex justify-between")}>
                <h3
                  className={cn(
                    "flex items-center gap-2 font-bold",
                    isTarget && activeSpell && "cursor-pointer text-blue-400",
                  )}
                  onClick={() => {
                    if (isTarget && activeSpell) {
                      castSpell(activeSpell, [entity.id]);
                    }
                  }}
                >
                  {entity.name} {entity.isBot && <BotIcon />}{" "}
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
                  const isReady = cooldown === 0 || !cooldown;

                  return (
                    <div
                      key={spell.config.id}
                      className="flex justify-between text-sm"
                      onClick={() => {
                        if (!myTurn) return;
                        if (!isReady) return;

                        if (targets || activeSpell) {
                          setTargets(null);
                          setActiveSpell(null);
                        } else {
                          getTargets(spell.config.id);
                        }
                      }}
                    >
                      <span
                        className={cn(
                          isReady && myTurn && "cursor-pointer",
                          activeSpell === spell.config.id && "text-blue-400",
                        )}
                      >
                        {spell.config.name}
                      </span>
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
