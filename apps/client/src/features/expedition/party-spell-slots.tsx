import { SkillIcon } from "@/components/skill-icon";
import type { Character } from "@loot-game/game/base-entity";
import { slottedSpells, spellSlots } from "./spell-slot-info";
import { SpellSlotStatus } from "./spell-slot-status";

export function PartySpellSlots({ character }: { character: Character }) {
  const equipped = slottedSpells(character);
  return (
    <div className="expedition-party-spells">
      <div className="expedition-slot-heading">
        <small>Equipped spells</small>
        <SpellSlotStatus count={equipped.length} />
      </div>
      <ol
        className="expedition-slot-grid"
        aria-label={`${character.name}'s spell slots`}
      >
        {spellSlots.map((slot, index) => {
          const spell = equipped[index];
          return (
            <li key={slot} data-empty={!spell}>
              {spell ? (
                <SkillIcon type={spell.config.type} size={32} />
              ) : (
                <span className="expedition-empty-icon" aria-hidden="true">
                  +
                </span>
              )}
              <div>
                <small>
                  Slot {slot} · {spell ? "Equipped" : "Empty"}
                </small>
                <strong>{spell?.config.name ?? "No spell equipped"}</strong>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="expedition-basic-attack">
        <SkillIcon type="basic-attack" size={22} />
        Basic Attack <span>Always available · uses no slot</span>
      </p>
    </div>
  );
}
