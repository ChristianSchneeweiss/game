import { cn } from "@/lib/utils";
import { trpcClient } from "@/utils/trpc";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { BotIcon, SkullIcon } from "lucide-react";
import { ReadyState } from "react-use-websocket";
import { useBattle } from "./-hooks/use-battle";

export const Route = createFileRoute("/battle/$id")({
  component: RouteComponent,
  beforeLoad: async ({ params }) => {
    const { id } = params;

    let data: any;
    try {
      data = await trpcClient.getBattle.query(id);
    } catch (error) {}
    if (data) {
      throw redirect({ to: "/battle/finished/$id", params: { id } });
    }
  },
});

function RouteComponent() {
  const { id } = Route.useParams();
  const {
    participants,
    battleState,
    targets,
    activeSpell,
    statsTimeline,
    defaultStats,
    currentEventCounter,
    isLive,
    readyState,
    castSpell,
    getTargets,
    cancelSpell,
  } = useBattle(id);

  const stats =
    statsTimeline.length === 0
      ? defaultStats
      : statsTimeline[currentEventCounter]?.stats;

  console.log("statsTimeline", statsTimeline);
  console.log("currentEventCounter", currentEventCounter, statsTimeline.length);
  console.log("stats", stats);

  if (readyState !== ReadyState.OPEN) return <p>Connecting...</p>;

  return (
    <div className="p-4">
      <h1 className="mb-4 text-2xl font-bold">Battle Timeline</h1>

      <div className="mb-6 grid grid-cols-2 gap-4">
        {participants.map((entity) => {
          console.log("entity", entity);
          console.log("battleState", battleState);
          if (!battleState) return null;
          // Calculate current health and mana based on processed events
          const currentStats = stats?.get(entity.id)!;
          const activeEntity =
            battleState.round.order[battleState.currentInRound];

          const myTurn = activeEntity === entity.id;
          // Ensure health doesn't go below 0 or above max
          const displayHealth = Math.max(
            0,
            Math.min(currentStats?.health, entity.maxHealth),
          );
          const healthPercent = (displayHealth / entity.maxHealth) * 100;

          // Ensure mana doesn't go below 0 or above max
          const maxMana = entity.maxMana;
          const displayMana = Math.max(
            0,
            Math.min(currentStats?.mana, maxMana),
          );
          const manaPercent = (displayMana / maxMana) * 100;

          const isTarget = targets?.includes(entity.id);
          console.log("targest", targets);

          return (
            <div
              key={entity.id}
              className={cn(
                "rounded border p-4 shadow",
                currentStats?.flags.casting && "border-blue-400",
                currentStats?.deltaHealth > 0 && "border-green-400",
                currentStats?.deltaHealth < 0 && "border-red-400",
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
                    console.log("isTarget", isTarget, activeSpell);
                    if (isTarget && activeSpell) {
                      castSpell(activeSpell, [entity.id]);
                    }
                  }}
                >
                  {entity.name} {entity.isBot && <BotIcon />}{" "}
                  {currentStats?.flags.dead && (
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
                          cancelSpell();
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
    </div>
  );
}
