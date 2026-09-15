import type { Character } from "@loot-game/game/base-entity";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { SkillIcon } from "@/components/skill-icon";
import {
  CharacterEmblem,
  CharacterVitals,
  coreAttributes,
} from "./character-ui";

export function CharacterRosterCard({
  character,
  onPrefetch,
}: {
  character: Character;
  onPrefetch: () => void;
}) {
  return (
    <article
      className="character-roster-card"
      onMouseEnter={onPrefetch}
      onFocus={onPrefetch}
    >
      <header className="character-roster-identity">
        <CharacterEmblem />
        <div>
          <p className="character-eyebrow">
            Level {character.level} <span aria-hidden="true">/</span> Adventurer
          </p>
          <h2>
            <Link
              to="/characters/$character-id"
              params={{ "character-id": character.id }}
            >
              {character.name}
            </Link>
          </h2>
          <p className="character-weapon-name">
            {character.equipped.WEAPON?.name ?? "Unarmed"}
          </p>
        </div>
      </header>
      <CharacterVitals character={character} />
      <dl className="character-roster-attributes">
        {coreAttributes.map(({ key, label, short }) => (
          <div key={key}>
            <dt>
              <abbr title={label}>{short}</abbr>
            </dt>
            <dd>{character.baseAttributes[key]}</dd>
          </div>
        ))}
      </dl>
      <div className="character-roster-loadout">
        <span className="character-eyebrow">Equipped spells</span>
        <div className="character-spell-strip">
          {character.spells.slice(0, 5).map((spell) => (
            <span key={spell.config.id} title={spell.config.name}>
              <SkillIcon type={spell.config.type} size={36} />
              <span className="sr-only">{spell.config.name}</span>
            </span>
          ))}
          {character.spells.length > 5 && (
            <span className="character-extra-spells">
              +{character.spells.length - 5}
            </span>
          )}
          {character.spells.length === 0 && (
            <span className="character-muted">No spells equipped</span>
          )}
        </div>
      </div>
      <footer className="character-roster-card-footer">
        {character.statPointsAvailable > 0 ? (
          <span className="character-points-notice">
            <Sparkles size={14} aria-hidden="true" />
            {character.statPointsAvailable} unspent{" "}
            {character.statPointsAvailable === 1 ? "point" : "points"}
          </span>
        ) : (
          <span className="character-muted">View your build</span>
        )}
        <Link
          to="/characters/$character-id"
          params={{ "character-id": character.id }}
          aria-label={`Open character ${character.name}`}
        >
          Open character <ArrowUpRight size={17} aria-hidden="true" />
        </Link>
      </footer>
    </article>
  );
}
