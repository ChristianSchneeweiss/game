import type { Character } from "@loot-game/game/base-entity";
import { SkillIcon } from "@/components/skill-icon";
import "./expedition.css";
import { readable, trailEntries } from "./run-info";

export function WaveTrail({
  dungeonKey,
  waves,
  completed = 0,
  active = false,
}: {
  dungeonKey: string;
  waves: string[][];
  completed?: number;
  active?: boolean;
}) {
  return (
    <ol className="expedition-trail" aria-label="Dungeon waves">
      {trailEntries(dungeonKey, waves, completed, active).map((wave) => (
        <li
          key={wave.id}
          data-state={wave.state}
          aria-current={wave.state === "current" ? "step" : undefined}
        >
          <span className="expedition-station" aria-hidden="true">
            {wave.marker}
          </span>
          <div>
            <small>{wave.label}</small>
            <strong>{wave.name}</strong>
            <p>{wave.enemies}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
export function PartyCard({
  character,
  selected,
  onSelect,
}: {
  character: Character;
  selected?: boolean;
  onSelect?: () => void;
}) {
  return (
    <article className="expedition-hero-card" data-selected={selected}>
      <div className="expedition-hero-heading">
        <span className="expedition-monogram" aria-hidden="true">
          {character.name[0]}
        </span>
        <div>
          <small>Level {character.level}</small>
          <h3>{character.name}</h3>
        </div>
        {onSelect && (
          <button
            className="expedition-select"
            aria-label={`${selected ? "Remove" : "Select"} ${character.name}`}
            aria-pressed={selected}
            onClick={onSelect}
          >
            {selected ? "✓ In party" : "+ Add"}
          </button>
        )}
      </div>
      <div className="expedition-resources">
        <span>
          ♥ {Math.ceil(character.health)} / {character.maxHealth}{" "}
          <small>HP</small>
        </span>
        <span>
          ✦ {Math.ceil(character.mana)} / {character.maxMana} <small>MP</small>
        </span>
      </div>
      <div className="expedition-skills">
        {character.spells.map((spell) => (
          <span key={spell.config.id}>
            <SkillIcon type={spell.config.type} size={34} />
            <span>{spell.config.name}</span>
          </span>
        ))}
      </div>
      {character.passiveSkills.length > 0 && (
        <p className="expedition-muted">
          Passives:{" "}
          {character.passiveSkills
            .map((skill) => readable(skill.passiveType))
            .join(" · ")}
        </p>
      )}
    </article>
  );
}
