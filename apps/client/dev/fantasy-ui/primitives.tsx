// Prototype component library: compare both visual directions before production adoption.
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { Flame, Gem, Shield, Sparkles, Swords, Wind } from "lucide-react";

export const spells = [
  {
    id: "fireball",
    name: "Fireball",
    affinity: "Fire",
    tier: "C",
    mana: 18,
    might: 246,
    description:
      "Hurl a ball of flame at an enemy, scorching everything in its wake.",
  },
  {
    id: "aegis-wall",
    name: "Aegis Wall",
    affinity: "Earth",
    tier: "B",
    mana: 24,
    might: 382,
    description:
      "Raise a protective barrier and hold your ground against the coming assault.",
  },
  {
    id: "lightning-surge",
    name: "Lightning Surge",
    affinity: "Lightning",
    tier: "C",
    mana: 16,
    might: 218,
    description: "Unleash a surge of lightning across the battlefield.",
  },
  {
    id: "single-heal",
    name: "Single Heal",
    affinity: "Water",
    tier: "C",
    mana: 12,
    might: 204,
    description: "Restore an ally’s health with a rush of restorative magic.",
  },
] as const;
export type Spell = (typeof spells)[number];
export const characters = [
  {
    name: "Aldric",
    title: "The steadfast",
    level: 12,
    icon: Shield,
    hp: 840,
    mp: 120,
    stats: [32, 28, 16, 12],
    affinity: "Earth",
    portrait: "aegis-wall",
  },
  {
    name: "Lyra",
    title: "The ember-touched",
    level: 11,
    icon: Flame,
    hp: 620,
    mp: 210,
    stats: [14, 18, 24, 36],
    affinity: "Fire",
    portrait: "soulflare",
  },
] as const;
export type Character = (typeof characters)[number];

export function Crest({ small = false }: { small?: boolean }) {
  return (
    <svg
      className={small ? "f-crest small" : "f-crest"}
      viewBox="0 0 64 76"
      fill="none"
      aria-hidden="true"
    >
      <path d="M32 2 57 17v32L32 73 7 49V17Z" stroke="currentColor" />
      <path
        d="M32 10 50 21v25L32 64 14 46V21Z"
        stroke="currentColor"
        opacity=".45"
      />
      <path
        d="m32 16 11 19-11 23-11-23Z"
        fill="currentColor"
        fillOpacity=".17"
        stroke="currentColor"
      />
      <path
        d="M32 16v42M21 35l11 5 11-5M3 35h14m30 0h14"
        stroke="currentColor"
      />
    </svg>
  );
}

export function Ornament() {
  return (
    <div className="f-ornament" aria-hidden="true">
      <span />
      <span>◇</span>
      <span>✧</span>
      <span>◇</span>
      <span />
    </div>
  );
}

export function FantasyButton({
  children,
  tone = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button
      type="button"
      className={`f-button ${tone} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Panel({
  title,
  eyebrow,
  aside,
  children,
  className = "",
}: {
  title: string;
  eyebrow?: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`f-panel ${className}`}>
      <header className="f-panel-heading">
        <div>
          {eyebrow && <p className="f-eyebrow">{eyebrow}</p>}
          <h2>{title}</h2>
        </div>
        {aside}
      </header>
      {children}
    </section>
  );
}

export function Meter({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone: "health" | "mana" | "xp";
}) {
  return (
    <div className={`f-meter ${tone}`}>
      <div className="f-meter-label">
        <span>{label}</span>
        <span>
          {value.toLocaleString()} <i>/ {max.toLocaleString()}</i>
        </span>
      </div>
      <div
        className="f-meter-track"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
      >
        <span style={{ width: `${(value / max) * 100}%` }} />
      </div>
    </div>
  );
}

export function TierBadge({ tier }: { tier: string }) {
  return (
    <span
      className={`f-tier tier-${tier.toLowerCase()}`}
      aria-label={`Tier ${tier}`}
    >
      {tier}
    </span>
  );
}

export function SpellSlot({
  spell,
  selected,
  onClick,
  compact = false,
}: {
  spell: Spell;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      className={`f-spell ${compact ? "compact" : ""}`}
      aria-pressed={selected}
      onClick={onClick}
    >
      <span className="f-spell-art">
        <img src={`/icons/skills/v1/${spell.id}.webp`} alt="" />
        <TierBadge tier={spell.tier} />
      </span>
      {!compact && (
        <span className="f-spell-copy">
          <strong>{spell.name}</strong>
          <span>
            {spell.affinity} <span className="f-dot">·</span> {spell.mana} mana
          </span>
        </span>
      )}
      {compact && <span className="f-sr-only">{spell.name}</span>}
    </button>
  );
}

export function CharacterSeal({
  character,
  small,
}: {
  character: Character;
  small?: boolean;
}) {
  const Icon = character.icon;
  return (
    <div className={`f-character-seal ${small ? "small" : ""}`}>
      <img src={`/icons/skills/v1/${character.portrait}.webp`} alt="" />
      <Icon aria-hidden="true" />
      <span>{character.level}</span>
    </div>
  );
}

export function Stats({ character }: { character: Character }) {
  const icons = [Swords, Shield, Wind, Sparkles];
  return (
    <div className="f-stats">
      {["Strength", "Vitality", "Agility", "Intelligence"].map((label, i) => {
        const Icon = icons[i];
        return (
          <div key={label}>
            <Icon size={17} aria-hidden="true" />
            <strong>{character.stats[i]}</strong>
            <span>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function Palette({ variant }: { variant: "A" | "B" }) {
  const colors =
    variant === "A"
      ? [
          ["Obsidian", "#111713"],
          ["Stone", "#212822"],
          ["Old gold", "#c3a46a"],
          ["Ivory", "#e8dfca"],
          ["Verdigris", "#85b8a5"],
        ]
      : [
          ["Vellum", "#eee4ca"],
          ["Ink", "#293e32"],
          ["Ochre", "#aa813a"],
          ["Wax", "#994c3d"],
          ["Sage", "#71866a"],
        ];
  return (
    <div className="f-palette">
      {colors.map(([name, color]) => (
        <div key={name}>
          <span style={{ "--swatch": color } as CSSProperties} />
          <strong>{name}</strong>
          <code>{color}</code>
        </div>
      ))}
    </div>
  );
}

export function LootMark() {
  return (
    <span className="f-loot">
      <Gem size={16} aria-hidden="true" />
      <strong>23</strong>
      <span>unclaimed loot</span>
    </span>
  );
}
