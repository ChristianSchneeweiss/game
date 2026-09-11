import { SkillIcon } from "@/components/skill-icon";
import { queryClient, trpc } from "@/utils/trpc";
import type { Character } from "@loot-game/game/base-entity";
import { createSpellFromType } from "@loot-game/game/spells/base/spell-from-type";
import { useMutation, useQuery } from "@tanstack/react-query";
import { readable } from "./run-info";

async function refreshBuilds() {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: trpc.character.getCharacters.queryKey(),
    }),
    queryClient.invalidateQueries({
      queryKey: trpc.character.getCharacter.queryKey(),
    }),
    queryClient.invalidateQueries({ queryKey: trpc.getMySpells.queryKey() }),
    queryClient.invalidateQueries({ queryKey: trpc.dungeon.getRun.queryKey() }),
  ]);
}
export function SpellLoadout({ character }: { character: Character }) {
  const spells = useQuery(trpc.getMySpells.queryOptions());
  const equip = useMutation(
    trpc.character.equipSpell.mutationOptions({ onSuccess: refreshBuilds }),
  );
  const unequip = useMutation(
    trpc.character.unequipSpell.mutationOptions({ onSuccess: refreshBuilds }),
  );
  const equipped =
    spells.data?.all.filter((spell) => spell.equippedBy === character.id) ?? [];
  const available = spells.data?.all.filter((spell) => !spell.equippedBy) ?? [];
  const busy = equip.isPending || unequip.isPending;
  const error = equip.error ?? unequip.error ?? spells.error;
  return (
    <section
      className="expedition-loadout"
      aria-label={`${character.name}'s spell loadout`}
    >
      <div className="expedition-section-heading">
        <div>
          <small>Spell loadout</small>
          <h3>{character.name}'s spellbook</h3>
        </div>
        <span>{equipped.length} / 4 slots</span>
      </div>
      <p className="expedition-muted">
        Basic Attack is always available. Equip up to four additional spells.
      </p>
      {error && (
        <p role="alert" className="expedition-error">
          {error.message}
        </p>
      )}
      {spells.isPending ? (
        <p role="status">Opening your spell collection…</p>
      ) : (
        <>
          <div className="expedition-spell-list">
            {equipped.map((spell) => (
              <div className="expedition-spell" key={spell.id}>
                <SkillIcon type={spell.type} size={42} />
                <div>
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
                  onClick={() => unequip.mutate({ spellId: spell.id })}
                  aria-label={`Unequip ${readable(spell.type)}`}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <details
            className="expedition-collection"
            open={equipped.length === 0 || undefined}
          >
            <summary>Your collection · {available.length} available</summary>
            {available.length === 0 ? (
              <p className="expedition-muted">
                Claim spell drops after battles to grow your collection.
              </p>
            ) : (
              <div className="expedition-spell-list">
                {available.map((spell) => (
                  <div className="expedition-spell" key={spell.id}>
                    <SkillIcon type={spell.type} size={42} />
                    <div>
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
                      disabled={busy || equipped.length >= 4}
                      onClick={() =>
                        equip.mutate({
                          characterId: character.id,
                          spellId: spell.id,
                        })
                      }
                      aria-label={`Equip ${readable(spell.type)}`}
                    >
                      Equip
                    </button>
                  </div>
                ))}
              </div>
            )}
          </details>
        </>
      )}
    </section>
  );
}
