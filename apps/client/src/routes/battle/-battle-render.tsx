import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import type {
  Entity,
  EntityAttributes,
  SpellDescription,
} from "@loot-game/game/types";
import {
  BotIcon,
  CheckIcon,
  CircleQuestionMarkIcon,
  SkullIcon,
} from "lucide-react";
import { useState } from "react";
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

  characterAttributes?: Map<string, EntityAttributes>;
  getCharacterAttributes?: (characterId: string) => void;
  resetCharacterAttributes?: () => void;

  spellDescription?: Map<string, SpellDescription>;
  getSpellDescription?: (spellId: string) => void;
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
  characterAttributes,
  getCharacterAttributes,
  resetCharacterAttributes,
  spellDescription,
  getSpellDescription,
}: Params) => {
  const [hoverCharacterOpen, _setHoverCharacterOpen] = useState<string | null>(
    null,
  );
  const [hoverSpellOpen, _setHoverSpellOpen] = useState<string | null>(null);

  return (
    <div className="p-4">
      <div className="mb-6 grid grid-cols-2 gap-4">
        {participants.map((entity) => {
          const setHoverCharacterOpen = (open: boolean | undefined) => {
            _setHoverCharacterOpen(open ? entity.id : null);
            if (open) {
              getCharacterAttributes?.(entity.id);
            } else {
              resetCharacterAttributes?.();
            }
          };

          // Calculate current health and mana based on processed events
          const currentStats = stats.get(entity.id)!;
          const activeEntity = battleState?.round.orderQueue[0];

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
          const isChosenTarget = chosenTargets?.includes(entity.id);
          const entityAttributes = characterAttributes?.get(entity.id);

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
                  <HoverCard
                    open={hoverCharacterOpen === entity.id}
                    onOpenChange={setHoverCharacterOpen}
                    openDelay={1000}
                    closeDelay={20}
                  >
                    <HoverCardTrigger asChild>
                      <CircleQuestionMarkIcon className="size-4 cursor-help" />
                    </HoverCardTrigger>
                    {entityAttributes && (
                      <HoverCardContent>
                        <div className="space-y-1 text-xs">
                          {Object.entries(entityAttributes).map(
                            ([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="font-mono text-gray-500">
                                  {key}
                                </span>
                                <span className="font-mono">
                                  {String(value)}
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      </HoverCardContent>
                    )}
                  </HoverCard>
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
                    {currentStats.deltaMana !== 0 && (
                      <span
                        className={cn(
                          currentStats.deltaMana > 0
                            ? "text-blue-500"
                            : "text-orange-500",
                        )}
                      >
                        {currentStats.deltaMana > 0
                          ? `+${currentStats.deltaMana}`
                          : currentStats.deltaMana}
                      </span>
                    )}
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
                  const setHoverSpellOpen = (open: boolean | undefined) => {
                    _setHoverSpellOpen(open ? spell.config.id : null);
                    if (open) {
                      getSpellDescription?.(spell.config.id);
                    } else {
                      _setHoverSpellOpen(null);
                    }
                  };

                  const cooldown = currentStats.cooldowns.get(spell.config.id);
                  const isReady = cooldown === 0 || !cooldown;
                  const desc = spellDescription?.get(spell.config.id);

                  return (
                    <div
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
                      <p
                        className={cn(
                          "flex items-center gap-2",
                          isReady && myTurn && "cursor-pointer",
                          activeSpell === spell.config.id && "text-blue-400",
                        )}
                      >
                        {spell.config.name}
                        <HoverCard
                          open={hoverSpellOpen === spell.config.id}
                          onOpenChange={setHoverSpellOpen}
                          key={spell.config.id}
                          openDelay={1000}
                          closeDelay={20}
                        >
                          <HoverCardTrigger asChild>
                            <CircleQuestionMarkIcon className="inline-block size-3 cursor-help" />
                          </HoverCardTrigger>
                          {desc && (
                            <HoverCardContent className="min-w-[360px] rounded-lg border p-4 shadow-2xl">
                              <div className="mb-2 flex flex-col gap-2">
                                <span className="text-sm drop-shadow">
                                  {desc.text}
                                </span>
                                <div className="mt-1 flex gap-4">
                                  {desc?.manaCost !== undefined && (
                                    <span className="flex items-center gap-1 rounded bg-blue-900/40 px-2 py-0.5 text-xs font-medium text-blue-300">
                                      <svg
                                        width="14"
                                        height="14"
                                        className="inline"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                      >
                                        <circle cx="10" cy="10" r="8" />
                                      </svg>
                                      Mana: {desc.manaCost}
                                    </span>
                                  )}
                                  {desc?.cooldown !== undefined && (
                                    <span className="flex items-center gap-1 rounded bg-orange-900/40 px-2 py-0.5 text-xs font-medium text-orange-300">
                                      <svg
                                        width="14"
                                        height="14"
                                        className="inline"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                      >
                                        <rect
                                          x="4"
                                          y="8"
                                          width="12"
                                          height="4"
                                          rx="2"
                                        />
                                      </svg>
                                      CD: {desc.cooldown}
                                    </span>
                                  )}
                                  {desc?.targetType && (
                                    <span className="flex items-center gap-1 rounded bg-purple-900/40 px-2 py-0.5 text-xs font-medium text-purple-300">
                                      <svg
                                        width="14"
                                        height="14"
                                        className="inline"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                      >
                                        <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 2a6 6 0 110 12A6 6 0 0110 4zm0 2a4 4 0 100 8 4 4 0 000-8z" />
                                      </svg>
                                      <span>
                                        Target:
                                        <ul className="inline pl-2">
                                          {desc.targetType.enemies > 0 && (
                                            <li>
                                              Enemies: {desc.targetType.enemies}
                                            </li>
                                          )}
                                          {desc.targetType.allies > 0 && (
                                            <li>
                                              Allies: {desc.targetType.allies}
                                            </li>
                                          )}
                                          {desc.targetType.enemies === 0 &&
                                            desc.targetType.allies === 0 && (
                                              <li>None</li>
                                            )}
                                        </ul>
                                      </span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </HoverCardContent>
                          )}
                        </HoverCard>
                      </p>
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
