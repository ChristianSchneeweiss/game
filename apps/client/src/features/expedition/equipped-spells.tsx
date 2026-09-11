import { SkillIcon } from "@/components/skill-icon";
import type { Character } from "@loot-game/game/base-entity";
import { createSpellFromType } from "@loot-game/game/spells/base/spell-from-type";
import type { Spell } from "@loot-game/game/types";
import { readable } from "./run-info";
import { spellSlots } from "./spell-slot-info";

type Props = {
  spells: Pick<Spell["config"], "id" | "type">[];
  character: Character;
  busy: boolean;
  onRemove: (spellId: string) => void;
};

export function EquippedSpells({ spells, character, busy, onRemove }: Props) {
  const empty = Math.max(0, spellSlots.length - spells.length);
  return (
    <>
      <div
        className="expedition-loadout-notice"
        data-empty={empty > 0}
        role="status"
      >
        {empty > 0
          ? `${empty} empty spell ${empty === 1 ? "slot" : "slots"}. Choose from your collection below to fill your loadout.`
          : "All four slots are filled. Remove a spell to make room for a different one."}
      </div>
      <div className="expedition-spell-list">
        {spells.map((spell, index) => (
          <div className="expedition-spell" data-equipped="true" key={spell.id}>
            <SkillIcon type={spell.type} size={42} />
            <div>
              <small className="expedition-spell-state">
                ✓ Slot {index + 1} · Equipped
              </small>
              <strong>{readable(spell.type)}</strong>
              <p>
                {
                  createSpellFromType(spell.id, spell.type).description(
                    character,
                  ).text
                }
              </p>
            </div>
            <button
              disabled={busy}
              onClick={() => onRemove(spell.id)}
              aria-label={`Unequip ${readable(spell.type)}`}
            >
              Remove
            </button>
          </div>
        ))}
        {spellSlots.slice(spells.length).map((slot) => (
          <div className="expedition-empty-spell" key={slot}>
            <span className="expedition-empty-icon" aria-hidden="true">
              +
            </span>
            <div>
              <small>Slot {slot} · Empty</small>
              <strong>No spell equipped</strong>
              <p>Equip a spell from your collection below.</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
