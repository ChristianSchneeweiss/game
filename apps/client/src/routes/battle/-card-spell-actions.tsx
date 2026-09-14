import { useState } from "react";
import type { Entity } from "@loot-game/game/entity-types";
import type { SpellDescription } from "@loot-game/game/types";
import { describeTargeting } from "@loot-game/game/tactical/queries";
import { CircleQuestionMarkIcon, Sparkles, Zap } from "lucide-react";
import { SkillIcon } from "@/components/skill-icon";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import type { Stats } from "./-presentation/timeline";

type Props = {
  entity: Entity;
  stats: Stats;
  canChoose: boolean;
  displayMana: number;
  activeSpell?: string;
  cancelSpell?: () => void;
  getTargets?: (id: string) => void;
  spellDescription?: Map<string, SpellDescription>;
  getSpellDescription?: (id: string) => void;
};

export function CardSpellActions({
  entity,
  stats: currentStats,
  canChoose,
  displayMana,
  activeSpell,
  cancelSpell,
  getTargets,
  spellDescription,
  getSpellDescription,
}: Props) {
  const [hoverSpellOpen, _setHoverSpellOpen] = useState<string | null>(null);
  return (
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
                "relative rounded-xl border px-2.5 py-2 transition-[border-color,background-color,color,box-shadow] duration-200 motion-reduce:transition-none",
                isReady && canChoose && hasEnoughMana
                  ? "cursor-pointer border-[#8a7753]/40 bg-[linear-gradient(180deg,rgba(56,47,34,0.94),rgba(27,23,18,0.98))] hover:border-[#b89656]/48 hover:bg-[linear-gradient(180deg,rgba(64,54,39,0.98),rgba(31,26,20,0.98))]"
                  : "border-[#65563d]/35 bg-[linear-gradient(180deg,rgba(37,31,24,0.95),rgba(24,20,17,0.98))]",
                activeSpell === spell.config.id &&
                  "border-[#b89656]/68 bg-[linear-gradient(180deg,rgba(80,63,35,0.98),rgba(34,28,21,0.98))] shadow-[0_0_0_1px_rgba(184,150,86,0.28)]",
              )}
            >
              <div className="flex items-start justify-between gap-2.5">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-start gap-2.5 rounded text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f2d393] disabled:cursor-default"
                  aria-label={`Prepare ${spell.config.name}`}
                  aria-pressed={activeSpell === spell.config.id}
                  disabled={!canChoose || !isReady || !hasEnoughMana}
                  onClick={() => {
                    if (activeSpell === spell.config.id) cancelSpell?.();
                    else getTargets?.(spell.config.id);
                  }}
                >
                  <SkillIcon type={spell.config.type} size={36} eager />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      {cooldown !== undefined && cooldown > 0 ? (
                        <span className="rpg-badge border-[#8a7753]/36 bg-[#251f18]/92 px-2 py-0.5 text-[0.6rem] text-[#dbcaa6]">
                          CD {cooldown}
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        "mt-2 block overflow-hidden text-[1rem] leading-none font-semibold tracking-[0.02em] whitespace-nowrap",
                        isReady && canChoose && hasEnoughMana
                          ? "text-[#f1e6cf]"
                          : "text-[#9c9079]",
                        activeSpell === spell.config.id && "text-[#f9ebc8]",
                      )}
                    >
                      {spell.config.name}
                    </span>
                    <span className="mt-1.5 flex items-center gap-2 text-[0.62rem] tracking-[0.16em] text-[#a99a7e] uppercase">
                      <span>Mana {spell.config.manaCost}</span>
                      {!hasEnoughMana ? <span>Insufficient</span> : null}
                    </span>
                  </span>
                </button>
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
                        aria-label={`About ${spell.config.name}`}
                        className="rpg-icon-frame h-8 w-8 text-[#d3c49b] transition-colors duration-200 hover:text-[#f5e3b8]"
                      >
                        <CircleQuestionMarkIcon className="size-3.5" />
                      </button>
                    </HoverCardTrigger>
                    {desc && (
                      <HoverCardContent className="max-w-[440px] min-w-[360px] p-4">
                        <div className="space-y-3">
                          <h4 className="rpg-heading text-lg tracking-[0.06em] uppercase">
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
                            {(desc.targeting || desc.targetType) && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-[#8a7753]/28 bg-[#261f18]/90 px-3 py-1 text-sm font-medium text-[#ddcfad]">
                                <span className="text-xs">🎯</span>
                                {desc.targeting ? (
                                  describeTargeting(desc.targeting)
                                ) : (
                                  <>
                                    {desc.targetType.enemies > 0 &&
                                      `Enemies: ${desc.targetType.enemies}`}
                                    {desc.targetType.allies > 0 &&
                                      `Allies: ${desc.targetType.allies}`}
                                    {desc.targetType.enemies === 0 &&
                                      desc.targetType.allies === 0 &&
                                      "Self"}
                                  </>
                                )}
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
  );
}
