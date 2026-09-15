import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  CHARACTER_HEALTH_REGEN_PER_VITALITY,
  type Character,
} from "@loot-game/game/base-entity";
import {
  Droplets,
  Flame,
  Info,
  Leaf,
  Moon,
  Plus,
  Sparkles,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { trpc } from "@/utils/trpc";
import { getCharacterSpecialAttributes } from "@/lib/character-stats";
import {
  CharacterSectionHeading,
  characterActionError,
  coreAttributes,
} from "./character-ui";

const affinities = [
  { key: "fire", label: "Fire", Icon: Flame },
  { key: "water", label: "Water", Icon: Droplets },
  { key: "earth", label: "Earth", Icon: Leaf },
  { key: "lightning", label: "Lightning", Icon: Zap },
  { key: "dark", label: "Dark", Icon: Moon },
] as const;
const specialAttributes = [
  {
    key: "armor",
    label: "Armor",
    unit: "flat",
    description:
      "Reduces incoming physical damage by this many points per hit.",
  },
  {
    key: "magicResistance",
    label: "Magic resistance",
    unit: "flat",
    description: "Reduces incoming magical damage by this many points per hit.",
  },
  {
    key: "armorPenetration",
    label: "Armor penetration",
    unit: "flat",
    description:
      "Subtracts this many points from the target's armor when you deal physical damage.",
  },
  {
    key: "magicPenetration",
    label: "Magic penetration",
    unit: "flat",
    description:
      "Subtracts this many points from the target's magic resistance when you deal magical damage.",
  },
  {
    key: "critChance",
    label: "Critical chance",
    unit: "percent",
    description:
      "Chance for a damage hit to critically strike. A 25% chance means roughly one in four hits.",
  },
  {
    key: "critDamage",
    label: "Critical damage bonus",
    unit: "percent",
    description:
      "Extra damage on a critical hit, before defenses. A 100% bonus doubles the damage.",
  },
  {
    key: "healthRegen",
    label: "Health regeneration",
    unit: "flat",
    description: `At the start of each actionable turn, regenerate ${CHARACTER_HEALTH_REGEN_PER_VITALITY * 100}% of your Vitality as health, plus base regeneration and stat modifiers. At 40 Vitality, that is ${40 * CHARACTER_HEALTH_REGEN_PER_VITALITY} health before healing modifiers and rounding.`,
  },
  {
    key: "manaRegen",
    label: "Mana regeneration",
    unit: "flat",
    description:
      "Inherent mana regeneration is one-fifth of your Intelligence, plus base regeneration and stat modifiers. For example, 40 Intelligence gives 8 mana per regeneration, before healing modifiers.",
  },
  {
    key: "lifesteal",
    label: "Lifesteal",
    unit: "percent",
    description:
      "Heals you for a percentage of physical damage actually dealt. At 10%, dealing 100 damage restores 10 health before healing modifiers.",
  },
  {
    key: "omnivamp",
    label: "Omnivamp",
    unit: "percent",
    description:
      "Heals you for a percentage of magical damage actually dealt. At 10%, dealing 100 damage restores 10 health before healing modifiers.",
  },
  {
    key: "blessed",
    label: "Blessed",
    unit: "flat",
    description:
      "Adds this many points to your spell power rolls, up to a maximum roll of 20. Higher rolls improve effects that scale with the roll.",
  },
] as const;
const percentage = new Intl.NumberFormat("en", {
  style: "percent",
  maximumFractionDigits: 2,
});
type CoreAttribute = (typeof coreAttributes)[number]["key"];

export function CharacterAttributes({
  character,
  hidden,
  onSaved,
}: {
  character: Character;
  hidden: boolean;
  onSaved: () => Promise<void>;
}) {
  const calculatedAttributes = getCharacterSpecialAttributes(character);
  const [queued, setQueued] = useState<CoreAttribute[]>([]);
  const save = useMutation(
    trpc.character.applyStatIncrease.mutationOptions({ onSuccess: onSaved }),
  );
  const remaining = character.statPointsAvailable - queued.length;
  const apply = async () => {
    try {
      await save.mutateAsync({ characterId: character.id, stats: queued });
      setQueued([]);
      toast.success("Applied stat changes.");
    } catch (error) {
      toast.error(characterActionError(error, "Failed to apply stat changes."));
    }
  };

  return (
    <div className="character-stats" hidden={hidden}>
      <section className="character-build-panel">
        <CharacterSectionHeading
          title="Core attributes"
          aside={
            <span className="character-points-badge" role="status">
              <Sparkles size={14} aria-hidden="true" />
              {remaining} {remaining === 1 ? "point" : "points"} available
            </span>
          }
        >
          Invest your points. Shape your next build.
        </CharacterSectionHeading>
        <div className="character-attribute-list">
          {coreAttributes.map(({ key, label, short, Icon }) => {
            const added = queued.filter((entry) => entry === key).length;
            return (
              <div className="character-attribute-row" key={key}>
                <span className="character-attribute-icon" aria-hidden="true">
                  <Icon size={20} strokeWidth={1.5} />
                </span>
                <div>
                  <span className="character-eyebrow">{short}</span>
                  <h3>{label}</h3>
                </div>
                <div className="character-attribute-value">
                  <strong>{character.baseAttributes[key]}</strong>
                  {added > 0 && <span>+{added}</span>}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={`Increase ${key}`}
                  disabled={remaining <= 0 || save.isPending}
                  onClick={() => setQueued((current) => [...current, key])}
                >
                  <Plus size={16} />
                </Button>
              </div>
            );
          })}
        </div>
        {queued.length > 0 ? (
          <div className="character-stat-confirm">
            <p role="status">
              {queued.length} {queued.length === 1 ? "point" : "points"} ready
              to apply
            </p>
            <div>
              <Button
                variant="ghost"
                disabled={save.isPending}
                onClick={() => setQueued([])}
              >
                Reset
              </Button>
              <Button pending={save.isPending} onClick={() => void apply()}>
                Apply stat changes
              </Button>
            </div>
          </div>
        ) : (
          <p className="character-panel-note">
            {character.statPointsAvailable > 0
              ? "Use + to allocate points, then confirm your changes."
              : "Earn more attribute points by levelling up."}
          </p>
        )}
      </section>
      <section className="character-build-panel">
        <CharacterSectionHeading title="Affinities">
          Your connection to the five elements.
        </CharacterSectionHeading>
        <dl className="character-affinities">
          {affinities.map(({ key, label, Icon }) => (
            <div key={key} data-affinity={key}>
              <dt>
                <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
                {label}
              </dt>
              <dd>{character.baseAffinities[key]}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="character-build-panel">
        <CharacterSectionHeading title="Special attributes">
          Calculated defenses, recovery, and combat modifiers.
        </CharacterSectionHeading>
        <dl className="character-special-attributes">
          {specialAttributes.map(({ key, label, unit, description }) => (
            <div key={key}>
              <dt>
                <span>{label}</span>
                <Tooltip delayDuration={250}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="character-attribute-info"
                      aria-label={`About ${label.toLowerCase()}`}
                    >
                      <Info size={14} aria-hidden="true" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    sideOffset={6}
                    className="max-w-72 text-left text-sm leading-relaxed"
                  >
                    {description}
                  </TooltipContent>
                </Tooltip>
              </dt>
              <dd>
                {unit === "percent"
                  ? percentage.format(calculatedAttributes[key])
                  : calculatedAttributes[key]}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
