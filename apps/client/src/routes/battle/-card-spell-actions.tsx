import { useState } from "react";
import type { Entity } from "@loot-game/game/entity-types";
import type { SpellDescription } from "@loot-game/game/types";
import { describeTargeting } from "@loot-game/game/tactical/queries";
import { CircleQuestionMarkIcon, Sparkles } from "lucide-react";
import { SpellAction } from "@/components/spell-action";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
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
  stats,
  canChoose,
  displayMana,
  activeSpell,
  cancelSpell,
  getTargets,
  spellDescription,
  getSpellDescription,
}: Props) {
  const [inspectedSpell, setInspectedSpell] = useState<string | null>(null);
  return (
    <div className="mt-5 space-y-3">
      <p className="rpg-title flex items-center gap-2 text-xs text-(--rpg-text-faint)">
        <Sparkles className="size-4 text-(--rpg-gold)" /> Spell actions
      </p>
      <div className="grid gap-2">
        {entity.spells.map(({ config }) => {
          const cooldown = stats.cooldowns.get(config.id) ?? 0;
          const hasMana = displayMana >= config.manaCost;
          const desc = spellDescription?.get(config.id);
          const inspect = (open: boolean) => {
            setInspectedSpell(open ? config.id : null);
            if (open) getSpellDescription?.(config.id);
          };
          return (
            <SpellAction
              key={config.id}
              name={config.name}
              type={config.type}
              selected={activeSpell === config.id}
              disabled={!canChoose || cooldown > 0 || !hasMana}
              onSelect={() =>
                activeSpell === config.id
                  ? cancelSpell?.()
                  : getTargets?.(config.id)
              }
              metadata={
                <>
                  <span>Mana {config.manaCost}</span>
                  {cooldown > 0 && <span>Cooldown {cooldown}</span>}
                  {!hasMana && <span>Insufficient mana</span>}
                </>
              }
              inspection={
                <HoverCard
                  open={inspectedSpell === config.id}
                  onOpenChange={inspect}
                  openDelay={300}
                  closeDelay={100}
                >
                  <HoverCardTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`About ${config.name}`}
                      onFocus={() => inspect(true)}
                      onBlur={() => inspect(false)}
                      onClick={() => inspect(true)}
                    >
                      <CircleQuestionMarkIcon className="size-4" />
                    </Button>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-[min(26rem,calc(100vw-2rem))] p-4">
                    <h4 className="rpg-heading text-lg">{config.name}</h4>
                    {desc ? (
                      <p className="rpg-copy mt-3 text-sm">{desc.text}</p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rpg-badge">
                        Mana {desc?.manaCost ?? config.manaCost}
                      </span>
                      <span className="rpg-badge">
                        Cooldown {desc?.cooldown ?? config.cooldown}
                      </span>
                      {config.targeting && (
                        <span className="rpg-badge">
                          {describeTargeting(config.targeting)}
                        </span>
                      )}
                    </div>
                  </HoverCardContent>
                </HoverCard>
              }
            />
          );
        })}
      </div>
    </div>
  );
}
