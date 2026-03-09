import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  RpgBadge,
  RpgInset,
  RpgMeter,
  RpgPage,
  RpgPanel,
  RpgSectionHeading,
} from "@/components/rpg-ui";
import { cn } from "@/lib/utils";
import { useUser } from "@clerk/clerk-react";
import { Character } from "@loot-game/game/base-entity";
import type { EffectTracking } from "@loot-game/game/bm";
import type {
  Affinities,
  Entity,
  EntityAttributes,
  SpecialAttributes,
  Team,
} from "@loot-game/game/entity-types";
import type { EffectType, SpellDescription } from "@loot-game/game/types";
import {
  BotIcon,
  CheckIcon,
  CircleQuestionMarkIcon,
  Droplets,
  Eye,
  Flame,
  Lock,
  PersonStandingIcon,
  Shield,
  ShieldCheck,
  SkullIcon,
  Sparkles,
  TargetIcon,
  TrendingDown,
  TrendingUp,
  SwordsIcon,
  Zap,
  Zap as ZapIcon,
} from "lucide-react";
import { useState } from "react";
import type { BattleState } from "../../../../server/src/durable-objects/battle-ws";
import type { Stats } from "./-hooks/use-stats-timeline";

type Params = {
  participants: Entity[];
  stats: Map<string, Stats>;
  effectTracking: EffectTracking;
  battleId?: string;
  mode?: "live" | "replay";

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
      affinities: Affinities;
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
  battleId,
  mode = "replay",
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
  const isLiveMode = mode === "live";
  const activeEntityId = battleState?.round.orderQueue[0];

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
    const myTurn =
      activeEntityId === entity.id &&
      entity instanceof Character &&
      entity.userId === user.user?.id;

    const displayHealth = Math.max(
      0,
      Math.min(currentStats?.health, entity.maxHealth),
    );
    const maxMana = entity.maxMana;
    const displayMana = Math.max(0, Math.min(currentStats?.mana, maxMana));

    const isValidTarget = validTargets?.includes(entity.id);
    const isChosenTarget = chosenTargets?.includes(entity.id);
    const entityAttributes = characterAttributes?.get(entity.id);
    const activeEffects = (stats.get(entity.id)?.activeEffects ?? [])
      .map((effect) => effectTracking.get(effect))
      .filter((effect) => effect !== undefined);
    const statusTone =
      currentStats?.flags.dead
        ? "border-[#7b2f27]/90"
        : myTurn && isLive
          ? "border-[#b89656] shadow-[0_0_0_1px_rgba(184,150,86,0.35),0_22px_48px_rgba(0,0,0,0.45)]"
          : currentStats?.flags.casting
            ? "border-[#3ca6ff]/80"
            : currentStats?.deltaHealth > 0
              ? "border-emerald-500/70"
              : currentStats?.deltaHealth < 0
                ? "border-[#ff6a2a]/70"
                : "";

    return (
      <RpgPanel
        key={entity.id}
        className={cn(
          "p-5 transition-all duration-300",
          statusTone,
          isChosenTarget && "shadow-[0_0_0_1px_rgba(184,150,86,0.4),0_0_26px_rgba(184,150,86,0.16)]",
        )}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-start gap-3">
              <div className="rpg-icon-frame h-12 w-12 text-lg">
                {team === "TEAM_A" ? <Shield className="h-5 w-5" /> : <SkullIcon className="h-5 w-5" />}
              </div>
              <div className="min-w-0">
                <p className="rpg-title text-[0.58rem] text-[#cfbf97]/70">
                  {team === "TEAM_A" ? "Ally dossier" : "Enemy dossier"}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <h3 className="rpg-heading text-2xl leading-none font-semibold tracking-[0.05em]">
                    {entity.name}
                  </h3>
                  {myTurn && isLive && (
                    <RpgBadge className="border-[#b89656]/60 bg-[#5d4522]/95 text-[#f6e4ba]">
                      Your turn
                    </RpgBadge>
                  )}
                  {entity.isBot && (
                    <BotIcon className="h-4 w-4 text-[#b9a980]" />
                  )}
                  {currentStats?.flags.dead && (
                    <RpgBadge className="border-[#8f342a]/40 bg-[#431914]/90 text-[#f0c8be]">
                      Fallen
                    </RpgBadge>
                  )}
                  {currentStats?.flags.isCrit && (
                    <RpgBadge className="border-[#e8d24a]/45 bg-[#5c4b1b]/95 text-[#faefb0]">
                      Critical
                    </RpgBadge>
                  )}
                  {currentStats.roll !== undefined && (
                    <RpgBadge className="border-[#8a7753]/40 bg-[#251f18]/92 text-[#e6d9bc]">
                      Roll {currentStats.roll}
                    </RpgBadge>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-start gap-2">
            {isValidTarget && activeSpell ? (
              <button
                type="button"
                onClick={() => {
                  if (!activeSpell) return;
                  if (isChosenTarget) {
                    setChosenTargets?.(
                      (chosenTargets ?? []).filter((target) => target !== entity.id),
                    );
                    return;
                  }

                  setChosenTargets?.([...(chosenTargets ?? []), entity.id]);
                }}
                className={cn(
                  "rpg-badge transition-all duration-200",
                  isChosenTarget
                    ? "border-emerald-500/40 bg-emerald-500/12 text-emerald-100"
                    : "border-[#b89656]/40 bg-[#372d22]/92 text-[#ecd8ab] hover:border-[#d8b56d]/55 hover:text-[#fff0c8]",
                )}
              >
                {isChosenTarget ? (
                  <CheckIcon className="h-4 w-4" />
                ) : (
                  <TargetIcon className="h-4 w-4" />
                )}
                {isChosenTarget ? "Marked" : "Target"}
              </button>
            ) : null}

            <HoverCard
              open={hoverCharacterOpen === entity.id}
              onOpenChange={setHoverCharacterOpen}
              openDelay={350}
              closeDelay={100}
            >
              <HoverCardTrigger asChild>
                <button
                  type="button"
                  className="rpg-icon-frame h-10 w-10 text-[#d3c49b] transition-colors duration-200 hover:text-[#f5e3b8]"
                >
                  <CircleQuestionMarkIcon className="h-4 w-4" />
                </button>
              </HoverCardTrigger>
              {entityAttributes ? (
                <HoverCardContent className="w-[min(38rem,calc(100vw-2rem))] p-5">
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="rpg-title text-[0.58rem] text-[#cfbf97]/70">
                        Character ledger
                      </p>
                      <h4 className="rpg-heading mt-1 text-lg uppercase tracking-[0.08em]">
                        Attributes
                      </h4>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <AttributeColumn
                        title="Core"
                        entries={Object.entries(entityAttributes.baseAttributes)}
                      />
                      <AttributeColumn
                        title="Special"
                        entries={Object.entries(entityAttributes.specialAttributes)}
                      />
                      <AttributeColumn
                        title="Affinity"
                        entries={Object.entries(entityAttributes.affinities)}
                      />
                    </div>
                  </div>
                </HoverCardContent>
              ) : null}
            </HoverCard>
          </div>
        </div>

        <div className="space-y-4">
          <RpgMeter
            label="Health"
            value={displayHealth}
            max={entity.maxHealth}
            tone="health"
            delta={currentStats.deltaHealth}
          />
          <RpgMeter
            label="Mana"
            value={displayMana}
            max={maxMana}
            tone="mana"
            delta={currentStats.deltaMana}
          />
        </div>

        {activeEffects.length > 0 && (
          <RpgInset variant="stone" className="mt-5 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#d8c48e]" />
              <p className="rpg-title text-[0.62rem] text-[#cfbf97]/80">
                Active effects
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {activeEffects.map((effect) => {
                const roundsLeft =
                  effect.round + effect.duration - currentRound;
                const sourceName = participants.find(
                  (p) => p.id === effect.sourceId,
                )?.name;

                return (
                  <div
                    key={effect.id}
                    className="group relative flex items-center gap-2 rounded-[0.9rem] border border-[#8a7753]/28 bg-[#251f18]/78 px-3 py-2.5 transition-all duration-200 hover:border-[#b89656]/40 hover:bg-[#302820]/96"
                  >
                    {getEffectIcon(effect.effectType)}
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-[#efe5d1]">
                        {effect.effectType}
                      </span>
                      {effect.effectType !== "PASSIVE" && (
                        <div className="flex items-center gap-1 text-xs text-[#ac9f85]">
                          <span className="rounded-full border border-[#8a7753]/28 bg-[#3a2f24] px-1.5 py-0.5 text-[#f0dfb0]">
                            {roundsLeft}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 transform group-hover:block">
                      <div
                        className="min-w-[260px] max-w-[420px] rounded-[0.95rem] border border-[#8a7753]/45 bg-[linear-gradient(180deg,rgba(56,46,34,0.98),rgba(30,25,19,0.99))] px-4 py-3 text-xs wrap-break-word whitespace-pre-line text-[#eadfc8] shadow-[0_18px_40px_rgba(0,0,0,0.42)]"
                        style={{ whiteSpace: "pre-line" }}
                      >
                        {effect.description}
                        <br />
                        {sourceName && (
                          <span className="inline-block max-w-[180px] truncate align-top">
                            from {sourceName}
                          </span>
                        )}
                        <div className="absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 transform border-t-4 border-r-4 border-l-4 border-transparent border-t-[#32291f]"></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </RpgInset>
        )}

        <div className="mt-5 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#d8c48e]" />
            <p className="rpg-title text-[0.62rem] text-[#cfbf97]/80">
              Spell actions
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2.5">
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
              const hasEnoughMana = displayMana >= spell.config.manaCost;
              return (
                <div
                  key={spell.config.id}
                  className={cn(
                    "relative rounded-xl border px-2.5 py-2 transition-all duration-200",
                    isReady && myTurn && hasEnoughMana
                      ? "cursor-pointer border-[#8a7753]/40 bg-[linear-gradient(180deg,rgba(56,47,34,0.94),rgba(27,23,18,0.98))] hover:border-[#b89656]/48 hover:bg-[linear-gradient(180deg,rgba(64,54,39,0.98),rgba(31,26,20,0.98))]"
                      : "border-[#65563d]/35 bg-[linear-gradient(180deg,rgba(37,31,24,0.95),rgba(24,20,17,0.98))]",
                    activeSpell === spell.config.id &&
                      "border-[#b89656]/68 bg-[linear-gradient(180deg,rgba(80,63,35,0.98),rgba(34,28,21,0.98))] shadow-[0_0_0_1px_rgba(184,150,86,0.28)]",
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
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {cooldown !== undefined && cooldown > 0 ? (
                          <RpgBadge className="border-[#8a7753]/36 bg-[#251f18]/92 px-2 py-0.5 text-[0.6rem] text-[#dbcaa6]">
                            CD {cooldown}
                          </RpgBadge>
                        ) : null}
                      </div>
                      <span
                        className={cn(
                          "mt-2 block overflow-hidden text-[1rem] leading-none font-semibold tracking-[0.02em] whitespace-nowrap",
                          isReady && myTurn && hasEnoughMana
                            ? "text-[#f1e6cf]"
                            : "text-[#9c9079]",
                          activeSpell === spell.config.id && "text-[#f9ebc8]",
                        )}
                      >
                        {spell.config.name}
                      </span>
                      <div className="mt-1.5 flex items-center gap-2 text-[0.62rem] uppercase tracking-[0.16em] text-[#a99a7e]">
                        <span>Mana {spell.config.manaCost}</span>
                        {!hasEnoughMana ? <span>Insufficient</span> : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 self-start">
                      <HoverCard
                        open={hoverSpellOpen === spell.config.id}
                        onOpenChange={setHoverSpellOpen}
                        key={spell.config.id}
                        openDelay={1000}
                        closeDelay={50}
                      >
                        <HoverCardTrigger asChild>
                          <button
                            type="button"
                            className="rpg-icon-frame h-8 w-8 text-[#d3c49b] transition-colors duration-200 hover:text-[#f5e3b8]"
                          >
                            <CircleQuestionMarkIcon className="size-3.5" />
                          </button>
                        </HoverCardTrigger>
                        {desc && (
                          <HoverCardContent className="min-w-[360px] max-w-[440px] p-4">
                            <div className="space-y-3">
                              <h4 className="rpg-heading text-lg uppercase tracking-[0.06em]">
                                {spell.config.name}
                              </h4>
                              <p className="rpg-copy text-sm leading-relaxed">
                                {desc.text}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {desc?.manaCost !== undefined && (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-[#3ca6ff]/30 bg-[#3ca6ff]/10 px-3 py-1 text-sm font-medium text-[#92ccff]">
                                    <Zap className="h-3 w-3" />
                                    {desc.manaCost} Mana
                                  </span>
                                )}
                                {desc?.cooldown !== undefined && (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-[#e8d24a]/26 bg-[#e8d24a]/10 px-3 py-1 text-sm font-medium text-[#f4e89a]">
                                    <span className="text-xs">⏱️</span>
                                    {desc.cooldown} CD
                                  </span>
                                )}
                                {desc?.targetType && (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-[#8a7753]/28 bg-[#261f18]/90 px-3 py-1 text-sm font-medium text-[#ddcfad]">
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
      </RpgPanel>
    );
  };

  const arenaState = isLiveMode
    ? activeSpell
      ? "Targeting"
      : battleState?.round.orderQueue[0]
        ? "Live"
        : "Syncing"
    : "Replay";

  return (
    <RpgPage>
      <div className="space-y-8">
      

      <RpgPanel className="px-6 py-6">
          <RpgSectionHeading
            icon={<Shield className="h-5 w-5" />}
            eyebrow="Vanguard entries"
            title="Allies"
          />
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {allies.map((entity) => (
              <EntityCard key={entity.id} entity={entity} team="TEAM_A" />
            ))}
          </div>
        </RpgPanel>

        <RpgPanel className="px-6 py-6">
          <RpgSectionHeading
            icon={<SwordsIcon className="h-5 w-5" />}
            eyebrow="Hostile entries"
            title="Enemies"
          />
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {enemies.map((entity) => (
              <EntityCard key={entity.id} entity={entity} team="TEAM_B" />
            ))}
          </div>
        </RpgPanel>
      </div>
    </RpgPage>
  );
};

function BattleOverviewTile({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("rpg-stat-tile min-w-[110px] text-center", className)}>
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[#b6ab92]">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold uppercase tracking-[0.12em] text-[#f1e6cf]">
        {value}
      </p>
    </div>
  );
}

function AttributeColumn({
  title,
  entries,
}: {
  title: string;
  entries: [string, unknown][];
}) {
  return (
    <RpgInset variant="stone" className="p-3">
      <p className="rpg-title text-[0.58rem] text-[#cfbf97]/70">{title}</p>
      <div className="mt-3 space-y-2">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-center justify-between gap-3">
            <span className="text-[0.7rem] uppercase tracking-[0.12em] text-[#aea182]">
              {formatStatLabel(key)}
            </span>
            <span className="font-mono text-xs text-[#f0e6d2]">
              {String(value)}
            </span>
          </div>
        ))}
      </div>
    </RpgInset>
  );
}

function formatStatLabel(value: string) {
  return value.replace(/([A-Z])/g, " $1").replaceAll("_", " ").trim();
}

const getEffectIcon = (effectType: EffectType) => {
  switch (effectType) {
    case "DOT":
      return <Flame className="h-4 w-4 text-[#ff8c64]" />;
    case "HOT":
      return <Droplets className="h-4 w-4 text-[#9ad26d]" />;
    case "SHIELD":
      return <ShieldCheck className="h-4 w-4 text-[#88cbff]" />;
    case "BUFF":
      return <TrendingUp className="h-4 w-4 text-[#abd989]" />;
    case "DEBUFF":
      return <TrendingDown className="h-4 w-4 text-[#f29e81]" />;
    case "CURSE":
      return <ZapIcon className="h-4 w-4 text-[#b691e2]" />;
    case "STUN":
      return <Lock className="h-4 w-4 text-[#f5e487]" />;
    case "CONTROL":
      return <Eye className="h-4 w-4 text-[#d8a2ee]" />;
    case "PASSIVE":
      return <PersonStandingIcon className="h-4 w-4 text-[#88cbff]" />;
    default:
      return <Sparkles className="h-4 w-4 text-[#e2d39d]" />;
  }
};
