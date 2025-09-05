import { cn } from "@/lib/utils";
import type { Entity } from "@loot-game/game/types";
import { BotIcon, CheckIcon, SkullIcon } from "lucide-react";
import type { BattleState } from "../../../../server/src/battle-ws";
import type { Stats } from "./-hooks/use-stats-timeline";

type Params = {
  participants: Entity[];
  stats: Map<string, Stats>;
  battleState?: BattleState;
  validTargets?: string[];
  chosenTargets?: string[];
  setChosenTargets?: (targets: string[]) => void;
  activeSpell?: string;
  castSpell?: (spellId: string, targetIds: string[]) => void;
  cancelSpell?: () => void;
  getTargets?: (spellId: string) => void;
  isLive?: boolean;
};

export const BattleRender = ({
  participants,
  battleState,
  stats,
  validTargets,
  activeSpell,
  chosenTargets,
  setChosenTargets,
  cancelSpell,
  getTargets,
  isLive,
}: Params) => {
  return (
    <div className="p-4">
      <div className="mb-6 grid grid-cols-2 gap-4">
        {participants.map((entity) => {
          console.log("entity", entity);
          console.log("battleState", battleState);
          // Calculate current health and mana based on processed events
          const currentStats = stats.get(entity.id)!;
          console.log("currentStats", currentStats, entity.id);
          const activeEntity =
            battleState?.round.order[battleState.currentInRound];

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

          const isValidTarget = validTargets?.includes(entity.id);
          console.log("targest", validTargets);
          const isChosenTarget = chosenTargets?.includes(entity.id);

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
                    isValidTarget &&
                      activeSpell &&
                      "cursor-pointer text-blue-400",
                  )}
                  onClick={() => {
                    console.log("isTarget", isValidTarget, activeSpell);
                    if (isValidTarget && activeSpell) {
                      if (isChosenTarget) {
                        setChosenTargets?.([
                          ...(chosenTargets ?? []).filter(
                            (t) => t !== entity.id,
                          ),
                        ]);
                      } else {
                        setChosenTargets?.([
                          ...(chosenTargets ?? []),
                          entity.id,
                        ]);
                      }
                    }
                  }}
                >
                  {entity.name} {entity.isBot && <BotIcon />}{" "}
                  {isChosenTarget && (
                    <CheckIcon className="h-4 w-4 text-green-500" />
                  )}
                  {currentStats?.roll ? (
                    <span className="text-sm text-gray-500">
                      {currentStats.roll}
                    </span>
                  ) : null}
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

                        if (validTargets || activeSpell) {
                          cancelSpell?.();
                        } else {
                          getTargets?.(spell.config.id);
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
};
