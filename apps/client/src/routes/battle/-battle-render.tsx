import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import { useUser } from "@clerk/clerk-react";
import { Character } from "@loot-game/game/base-entity";
import type { EffectTracking } from "@loot-game/game/bm";
import type {
  EffectType,
  Entity,
  EntityAttributes,
  SpecialAttributes,
  SpellDescription,
  Team,
} from "@loot-game/game/types";
import {
  BotIcon,
  CheckIcon,
  CircleQuestionMarkIcon,
  Droplets,
  Eye,
  Flame,
  Heart,
  Lock,
  Shield,
  ShieldCheck,
  SkullIcon,
  Sparkles,
  TargetIcon,
  TrendingDown,
  TrendingUp,
  Zap,
  Zap as ZapIcon,
} from "lucide-react";
import { useState } from "react";
import type { BattleState } from "../../../../server/src/battle-ws";
import type { Stats } from "./-hooks/use-stats-timeline";

type Params = {
  participants: Entity[];
  stats: Map<string, Stats>;
  effectTracking: EffectTracking;

  battleState?: BattleState;
  validTargets?: string[];
  chosenTargets?: string[];
  setChosenTargets?: (targets: string[]) => void;
  activeSpell?: string;
  castSpell?: (spellId: string, targetIds: string[]) => void;
  cancelSpell?: () => void;
  getTargets?: (spellId: string) => void;
  isLive?: boolean;

  characterAttributes?: Map<
    string,
    {
      baseAttributes: EntityAttributes;
      specialAttributes: SpecialAttributes;
    }
  >;
  getCharacterAttributes?: (characterId: string) => void;
  resetCharacterAttributes?: () => void;

  spellDescription?: Map<string, SpellDescription>;
  getSpellDescription?: (spellId: string) => void;
};

export const BattleRender = ({
  participants,
  battleState,
  effectTracking,
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

  const user = useUser();

  // Separate allies and enemies
  const allies = participants.filter((p) => p.team === "TEAM_A");
  const enemies = participants.filter((p) => p.team === "TEAM_B");

  const currentRound = battleState?.round.round ?? 0;
  const orderQueue = battleState?.round.orderQueue ?? [];

  const EntityCard = ({ entity, team }: { entity: Entity; team: Team }) => {
    const setHoverCharacterOpen = (open: boolean | undefined) => {
      _setHoverCharacterOpen(open ? entity.id : null);
      if (open) {
        getCharacterAttributes?.(entity.id);
      } else {
        resetCharacterAttributes?.();
      }
    };

    const currentStats = stats.get(entity.id)!;
    const activeEntity = battleState?.round.orderQueue[0];
    const myTurn =
      activeEntity === entity.id &&
      entity instanceof Character &&
      entity.userId === user.user?.id;

    const displayHealth = Math.max(
      0,
      Math.min(currentStats?.health, entity.maxHealth),
    );
    const healthPercent = (displayHealth / entity.maxHealth) * 100;
    const maxMana = entity.maxMana;
    const displayMana = Math.max(0, Math.min(currentStats?.mana, maxMana));
    const manaPercent = (displayMana / maxMana) * 100;

    const isValidTarget = validTargets?.includes(entity.id);
    const isChosenTarget = chosenTargets?.includes(entity.id);
    const entityAttributes = characterAttributes?.get(entity.id);
    const activeEffects = (stats.get(entity.id)?.activeEffects ?? [])
      .map((effect) => effectTracking.get(effect))
      .filter((effect) => effect !== undefined);

    return (
      <div
        key={entity.id}
        className={cn(
          "relative rounded-xl border-2 bg-gradient-to-br from-slate-800/90 to-slate-900/90 p-6 shadow-2xl backdrop-blur-sm transition-all duration-300",
          currentStats?.flags.casting &&
            "border-blue-400 shadow-2xl shadow-blue-400/20",
          currentStats?.deltaHealth > 0 &&
            "border-green-400 shadow-2xl shadow-green-400/20",
          currentStats?.deltaHealth < 0 &&
            "border-red-400 shadow-2xl shadow-red-400/20",
          myTurn &&
            isLive &&
            "scale-105 border-yellow-400 shadow-2xl ring-4 shadow-yellow-400/30 ring-yellow-400/20",
        )}
      >
        {/* Turn Indicator */}
        {myTurn && isLive && (
          <div className="absolute -top-3 -right-3 animate-pulse rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 px-3 py-1 text-sm font-bold text-black">
            YOUR TURN
          </div>
        )}

        {/* Character Header */}
        <div className="mb-4 flex items-start justify-between">
          <h3
            className={cn(
              "flex items-center gap-2 text-xl font-bold text-white",
            )}
            onClick={() => {
              if (isValidTarget && activeSpell) {
                if (isChosenTarget) {
                  setChosenTargets?.([
                    ...(chosenTargets ?? []).filter((t) => t !== entity.id),
                  ]);
                } else {
                  setChosenTargets?.([...(chosenTargets ?? []), entity.id]);
                }
              }
            }}
          >
            {isValidTarget && activeSpell && !isChosenTarget && (
              <TargetIcon className="h-5 w-5 cursor-pointer text-red-400" />
            )}
            {isChosenTarget && <CheckIcon className="h-5 w-5 text-green-400" />}
            <span className="text-2xl">{team === "TEAM_A" ? "🧙‍♂️" : "👹"}</span>
            {entity.name}
            {entity.isBot && <BotIcon className="h-5 w-5 text-gray-400" />}
            {currentStats?.flags.isCrit && (
              <span className="flex animate-pulse items-center gap-1 rounded-lg border-2 border-yellow-300 bg-gradient-to-r from-red-600 via-yellow-400 to-red-600 px-3 py-1 text-base font-extrabold text-white shadow-lg">
                <svg
                  className="h-5 w-5 text-yellow-300 drop-shadow"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <polygon
                    points="12,2 15,10 23,10 17,15 19,23 12,18 5,23 7,15 1,10 9,10"
                    fill="currentColor"
                  />
                </svg>
                CRIT!
              </span>
            )}
            {currentStats?.roll && (
              <span className="rounded bg-slate-700 px-2 py-1 text-sm text-yellow-300">
                {currentStats.roll}
              </span>
            )}
            {currentStats?.flags.dead && (
              <SkullIcon className="h-5 w-5 text-red-500" />
            )}

            <HoverCard
              open={hoverCharacterOpen === entity.id}
              onOpenChange={setHoverCharacterOpen}
              openDelay={700}
              closeDelay={100}
            >
              <HoverCardTrigger asChild>
                <CircleQuestionMarkIcon className="size-5 cursor-help text-blue-400 hover:text-blue-300" />
              </HoverCardTrigger>
              {entityAttributes && (
                <HoverCardContent className="w-[400px] border-slate-600 bg-slate-800">
                  <div className="space-y-2 text-sm">
                    <h4 className="mb-2 font-bold text-white">
                      Character Attributes
                    </h4>
                    {Object.entries(entityAttributes.baseAttributes).map(
                      ([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="font-mono text-gray-400">{key}</span>
                          <span className="font-mono text-white">
                            {String(value)}
                          </span>
                        </div>
                      ),
                    )}
                    <hr />
                    <h4 className="mb-2 font-bold text-white">
                      Special Attributes
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(entityAttributes.specialAttributes).map(
                        ([key, value]) => (
                          <div
                            key={key}
                            className="flex justify-between text-xs"
                          >
                            <span className="font-mono text-gray-400">
                              {key}
                            </span>
                            <span className="font-mono text-white">
                              {String(value)}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                </HoverCardContent>
              )}
            </HoverCard>
          </h3>
        </div>

        {/* Health Bar */}
        <div className="mb-4">
          <div className="mb-2 flex justify-between text-sm">
            <span className="flex items-center gap-1 text-red-300">
              <Heart className="h-4 w-4" />
              Health
            </span>
            <span className="font-mono text-white">
              {displayHealth}/{entity.maxHealth}
              {currentStats.deltaHealth !== 0 && (
                <span
                  className={cn(
                    "ml-2 rounded px-2 py-0.5 text-xs font-bold",
                    currentStats.deltaHealth > 0
                      ? "bg-green-500/20 text-green-300"
                      : "bg-red-500/20 text-red-300",
                  )}
                >
                  {currentStats.deltaHealth > 0
                    ? `+${currentStats.deltaHealth}`
                    : currentStats.deltaHealth}
                </span>
              )}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full border border-slate-600 bg-slate-700">
            <div
              className="h-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-500 ease-out"
              style={{ width: `${healthPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Mana Bar */}
        <div className="mb-6">
          <div className="mb-2 flex justify-between text-sm">
            <span className="flex items-center gap-1 text-blue-300">
              <Zap className="h-4 w-4" />
              Mana
            </span>
            <span className="font-mono text-white">
              {displayMana}/{maxMana}
              {currentStats.deltaMana !== 0 && (
                <span
                  className={cn(
                    "ml-2 rounded px-2 py-0.5 text-xs font-bold",
                    currentStats.deltaMana > 0
                      ? "bg-blue-500/20 text-blue-300"
                      : "bg-orange-500/20 text-orange-300",
                  )}
                >
                  {currentStats.deltaMana > 0
                    ? `+${currentStats.deltaMana}`
                    : currentStats.deltaMana}
                </span>
              )}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full border border-slate-600 bg-slate-700">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500 ease-out"
              style={{ width: `${manaPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Active Effects */}
        {activeEffects.length > 0 && (
          <div className="mb-4">
            <h4 className="mb-3 flex items-center gap-1 text-sm font-bold text-purple-300">
              <Sparkles className="h-4 w-4" />
              Active Effects
            </h4>
            <div className="flex flex-wrap gap-2">
              {activeEffects.map((effect) => {
                const roundsLeft =
                  effect.round + effect.duration - currentRound;
                const sourceName = participants.find(
                  (p) => p.id === effect.sourceId,
                )?.name;

                return (
                  <div
                    key={effect.id}
                    className="group relative flex items-center gap-2 rounded-lg border border-slate-600/50 bg-slate-700/30 px-3 py-2 backdrop-blur-sm transition-all duration-200 hover:border-slate-500/70 hover:bg-slate-600/40"
                  >
                    {getEffectIcon(effect.effectType)}
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-white">
                        {effect.effectType}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <span className="rounded-full bg-orange-500/20 px-1.5 py-0.5 text-orange-300">
                          {roundsLeft}
                        </span>
                      </div>
                    </div>
                    {/* Tooltip with description */}
                    <div className="absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 transform group-hover:block">
                      <div
                        className="max-w-[420px] min-w-[260px] rounded-lg border border-slate-500 bg-slate-800 px-4 py-3 text-xs break-words whitespace-pre-line text-slate-200 shadow-lg"
                        style={{ whiteSpace: "pre-line" }}
                      >
                        {effect.description}
                        <br />
                        {sourceName && (
                          <span className="inline-block max-w-[180px] truncate align-top">
                            from {sourceName}
                          </span>
                        )}
                        <div className="absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 transform border-t-4 border-r-4 border-l-4 border-transparent border-t-slate-800"></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Spells */}
        <div className="space-y-2">
          <h4 className="flex items-center gap-1 text-sm font-bold text-purple-300">
            <Sparkles className="h-4 w-4" />
            Spells
          </h4>
          <div className="grid grid-cols-2 gap-2">
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
              const hasEnoughMana = entity.mana >= spell.config.manaCost;

              return (
                <div
                  key={spell.config.id}
                  className={cn(
                    "flex flex-col rounded-lg border p-2 transition-all duration-200",
                    isReady && myTurn && hasEnoughMana
                      ? "cursor-pointer border-slate-500 bg-slate-700/50 hover:border-slate-400 hover:bg-slate-600/50"
                      : "border-slate-600 bg-slate-800/50",
                    activeSpell === spell.config.id &&
                      "border-blue-400 bg-blue-600/20 ring-2 ring-blue-400/30",
                  )}
                  onClick={() => {
                    if (!myTurn) return;
                    if (!isReady) return;
                    if (!hasEnoughMana) return;

                    if (validTargets || activeSpell) {
                      cancelSpell?.();
                    } else {
                      getTargets?.(spell.config.id);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="text-sm">⚡</span>
                      <span
                        className={cn(
                          "truncate text-xs font-medium",
                          isReady && myTurn ? "text-white" : "text-gray-400",
                          activeSpell === spell.config.id && "text-blue-300",
                        )}
                      >
                        {spell.config.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {cooldown !== undefined && cooldown > 0 && (
                        <span className="rounded-full bg-orange-600/20 px-1.5 py-0.5 text-xs font-bold text-orange-300">
                          {cooldown}
                        </span>
                      )}
                      <HoverCard
                        open={hoverSpellOpen === spell.config.id}
                        onOpenChange={setHoverSpellOpen}
                        key={spell.config.id}
                        openDelay={1000}
                        closeDelay={50}
                      >
                        <HoverCardTrigger asChild>
                          <CircleQuestionMarkIcon className="size-3 cursor-help text-blue-400 hover:text-blue-300" />
                        </HoverCardTrigger>
                        {desc && (
                          <HoverCardContent className="min-w-[400px] border-slate-600 bg-slate-800 p-4">
                            <div className="space-y-3">
                              <h4 className="text-lg font-bold text-white">
                                {spell.config.name}
                              </h4>
                              <p className="text-sm leading-relaxed text-slate-300">
                                {desc.text}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {desc?.manaCost !== undefined && (
                                  <span className="flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-600/20 px-3 py-1 text-sm font-medium text-blue-300">
                                    <Zap className="h-3 w-3" />
                                    {desc.manaCost} Mana
                                  </span>
                                )}
                                {desc?.cooldown !== undefined && (
                                  <span className="flex items-center gap-1 rounded-full border border-orange-500/30 bg-orange-600/20 px-3 py-1 text-sm font-medium text-orange-300">
                                    <span className="text-xs">⏱️</span>
                                    {desc.cooldown} CD
                                  </span>
                                )}
                                {desc?.targetType && (
                                  <span className="flex items-center gap-1 rounded-full border border-purple-500/30 bg-purple-600/20 px-3 py-1 text-sm font-medium text-purple-300">
                                    <span className="text-xs">🎯</span>
                                    {desc.targetType.enemies > 0 &&
                                      `Enemies: ${desc.targetType.enemies}`}
                                    {desc.targetType.allies > 0 &&
                                      `Allies: ${desc.targetType.allies}`}
                                    {desc.targetType.enemies === 0 &&
                                      desc.targetType.allies === 0 &&
                                      "Self"}
                                  </span>
                                )}
                              </div>
                            </div>
                          </HoverCardContent>
                        )}
                      </HoverCard>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      {/* Battle Arena Header */}
      <div className="mb-8 text-center">
        <h1 className="mb-2 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-4xl font-bold text-transparent">
          ⚔️ BATTLE ARENA ⚔️
        </h1>
        <div className="mx-auto h-1 w-32 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500"></div>
      </div>

      <div className="mx-auto max-w-7xl">
        {/* Allies Section */}
        <div className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-blue-300">
            <Shield className="h-6 w-6" />
            ALLIES
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {allies.map((entity) => (
              <EntityCard key={entity.id} entity={entity} team="TEAM_A" />
            ))}
          </div>
        </div>

        {/* Order Queue Section */}
        <div className="mb-6">
          <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-yellow-300">
            <Zap className="h-4 w-4" />
            TURN ORDER
          </h2>
          <div className="flex flex-wrap justify-center gap-1.5">
            {orderQueue.map((entityId, index) => {
              const entity = participants.find((p) => p.id === entityId);
              if (!entity) return null;

              const isCurrentTurn = index === 0;
              const isAlly = entity.team === "TEAM_A";

              return (
                <div
                  key={entityId}
                  className={cn(
                    "flex items-center gap-1 rounded-md border px-2 py-1 text-sm transition-all duration-300",
                    isCurrentTurn
                      ? "scale-105 border-yellow-400 bg-yellow-400/20 shadow-md shadow-yellow-400/30"
                      : "border-slate-600 bg-slate-800/50",
                    isAlly ? "text-blue-300" : "text-red-300",
                  )}
                >
                  <span className="text-sm">{isAlly ? "🧙‍♂️" : "👹"}</span>
                  <span className="truncate font-medium">{entity.name}</span>
                  {isCurrentTurn && (
                    <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-400"></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Enemies Section */}
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-red-300">
            <SkullIcon className="h-6 w-6" />
            ENEMIES
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {enemies.map((entity) => (
              <EntityCard key={entity.id} entity={entity} team="TEAM_B" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to get icon for effect type
const getEffectIcon = (effectType: EffectType) => {
  switch (effectType) {
    case "DOT":
      return <Flame className="h-4 w-4 text-red-400" />;
    case "HOT":
      return <Droplets className="h-4 w-4 text-green-400" />;
    case "SHIELD":
      return <ShieldCheck className="h-4 w-4 text-blue-400" />;
    case "BUFF":
      return <TrendingUp className="h-4 w-4 text-green-300" />;
    case "DEBUFF":
      return <TrendingDown className="h-4 w-4 text-red-300" />;
    case "CURSE":
      return <ZapIcon className="h-4 w-4 text-purple-400" />;
    case "STUN":
      return <Lock className="h-4 w-4 text-yellow-400" />;
    case "CONTROL":
      return <Eye className="h-4 w-4 text-pink-400" />;
    default:
      return <Sparkles className="h-4 w-4 text-purple-300" />;
  }
};
