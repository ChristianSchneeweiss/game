import { SkillIcon } from "@/components/skill-icon";
import type { Character } from "@loot-game/game/base-entity";
import { createSpellFromType } from "@loot-game/game/spells/base/spell-from-type";
import type { Spell } from "@loot-game/game/types";
import { readable } from "./run-info";

type Props = {
  spells: Pick<Spell["config"], "id" | "type">[];
  character: Character;
  slotsFull: boolean;
  busy: boolean;
  onEquip: (spellId: string) => void;
};

export function SpellCollection({
  spells,
  character,
  slotsFull,
  busy,
  onEquip,
}: Props) {
  return (
    <details className="expedition-collection" open={!slotsFull || undefined}>
      <summary>
        Not equipped · {spells.length} spells in your collection
      </summary>
      {spells.length === 0 ? (
        <p className="expedition-muted">
          Claim spell drops after battles to grow your collection.
        </p>
      ) : (
        <div className="expedition-spell-list">
          {spells.map((spell) => (
            <div
              className="expedition-spell"
              data-equipped="false"
              key={spell.id}
            >
              <SkillIcon type={spell.type} size={42} />
              <div>
                <small className="expedition-spell-state">
                  In collection · Not equipped
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
                disabled={busy || slotsFull}
                onClick={() => onEquip(spell.id)}
                aria-label={`Equip ${readable(spell.type)}`}
              >
                {slotsFull ? "Slots full" : "Equip +"}
              </button>
            </div>
          ))}
        </div>
      )}
    </details>
  );
}
