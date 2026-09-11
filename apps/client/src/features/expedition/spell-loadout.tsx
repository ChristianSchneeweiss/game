import { queryClient, trpc } from "@/utils/trpc";
import type { Character } from "@loot-game/game/base-entity";
import { useMutation, useQuery } from "@tanstack/react-query";
import { spellSlots } from "./spell-slot-info";
import { SpellSlotStatus } from "./spell-slot-status";
import { SpellCollection } from "./spell-collection";
import { EquippedSpells } from "./equipped-spells";

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
        {spells.data && <SpellSlotStatus count={equipped.length} />}
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
      ) : spells.data ? (
        <>
          <EquippedSpells
            spells={equipped}
            character={character}
            busy={busy}
            onRemove={(spellId) => unequip.mutate({ spellId })}
          />
          <SpellCollection
            spells={available}
            character={character}
            slotsFull={equipped.length >= spellSlots.length}
            busy={busy}
            onEquip={(spellId) =>
              equip.mutate({ characterId: character.id, spellId })
            }
          />
        </>
      ) : null}
    </section>
  );
}
