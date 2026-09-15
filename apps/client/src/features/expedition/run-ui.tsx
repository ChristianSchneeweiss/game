import type { Character } from "@loot-game/game/base-entity";
import { SkillIcon } from "@/components/skill-icon";
import "./expedition.css";
import { readable, trailEntries } from "./run-info";
import { PartySpellSlots } from "./party-spell-slots";
import { EquipmentIcon } from "./equipment-icon";
import { RpgMeter } from "@/components/rpg-ui";
import { Button } from "@/components/ui/button";

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
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            aria-label={`${selected ? "Remove" : "Select"} ${character.name}`}
            aria-pressed={selected}
            onClick={onSelect}
          >
            {selected ? "✓ In party" : "+ Add"}
          </Button>
        )}
      </div>
      <div className="expedition-resources">
        <RpgMeter
          label="Health"
          value={Math.ceil(character.health)}
          max={character.maxHealth}
          tone="health"
        />
        <RpgMeter
          label="Mana"
          value={Math.ceil(character.mana)}
          max={character.maxMana}
          tone="mana"
        />
      </div>
      {onSelect && (
        <div className="expedition-party-gear">
          {(["WEAPON", "ARMOR"] as const).map((slot) => (
            <span key={slot}>
              <EquipmentIcon
                type={character.equipped[slot]?.itemType}
                slot={slot}
              />
              <span>
                <small>{slot}</small>
                {character.equipped[slot]?.name ?? "Empty slot"}
              </span>
            </span>
          ))}
        </div>
      )}
      {onSelect ? (
        <PartySpellSlots character={character} />
      ) : (
        <div className="expedition-skills">
          {character.spells.map((spell) => (
            <span key={spell.config.id}>
              <SkillIcon type={spell.config.type} size={34} />
              <span>{spell.config.name}</span>
            </span>
          ))}
        </div>
      )}
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
