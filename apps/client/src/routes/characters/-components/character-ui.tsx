import type { ReactNode } from "react";
import type { Character } from "@loot-game/game/base-entity";
import { Brain, Heart, MoveUpRight, Swords, Zap } from "lucide-react";

export const coreAttributes = [
  { key: "strength", label: "Strength", short: "STR", Icon: Swords },
  { key: "vitality", label: "Vitality", short: "VIT", Icon: Heart },
  { key: "agility", label: "Agility", short: "AGI", Icon: MoveUpRight },
  { key: "intelligence", label: "Intelligence", short: "INT", Icon: Brain },
] as const;

export function CharacterEmblem() {
  return (
    <div className="character-emblem" aria-hidden="true">
      <Swords strokeWidth={1.2} />
    </div>
  );
}

export function CharacterVitals({ character }: { character: Character }) {
  return (
    <dl className="character-vitals">
      <div data-resource="health">
        <dt>
          <Heart size={14} aria-hidden="true" />
          Health
        </dt>
        <dd>{character.health}</dd>
      </div>
      <div data-resource="mana">
        <dt>
          <Zap size={14} aria-hidden="true" />
          Mana
        </dt>
        <dd>{character.mana}</dd>
      </div>
    </dl>
  );
}

export function CharacterSectionHeading({
  title,
  children,
  aside,
}: {
  title: string;
  children?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <header className="character-section-heading">
      <div>
        <h2>{title}</h2>
        {children && <p>{children}</p>}
      </div>
      {aside}
    </header>
  );
}

export function formatCharacterLabel(value: string) {
  return value.replaceAll("-", " ").replaceAll("_", " ");
}

export function characterActionError(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
