import type { Character } from "@loot-game/game/base-entity";
import { emptySpellSlots } from "./spell-slot-info";

export function PartyReadiness({
  party,
  maxPartySize,
}: {
  party: Character[];
  maxPartySize: number;
}) {
  const emptyPartySlots = Math.max(0, maxPartySize - party.length);
  const incompleteBuilds = party.flatMap((character) => {
    const empty = emptySpellSlots(character);
    return empty > 0 ? [{ id: character.id, name: character.name, empty }] : [];
  });
  const incomplete = emptyPartySlots > 0 || incompleteBuilds.length > 0;
  return (
    <div className="expedition-prep-readiness" data-empty={incomplete}>
      <strong>
        {incomplete
          ? "Open slots in your party"
          : "✓ Party and spell slots filled"}
      </strong>
      {emptyPartySlots > 0 && (
        <p>
          {emptyPartySlots} empty party{" "}
          {emptyPartySlots === 1 ? "slot" : "slots"}.
        </p>
      )}
      {incompleteBuilds.map((character) => (
        <p key={character.id}>
          {character.name}: {character.empty} empty spell{" "}
          {character.empty === 1 ? "slot" : "slots"}.
        </p>
      ))}
      {incomplete && (
        <p className="expedition-muted">
          {party.length > 0
            ? "You can enter as you are, or fill these before departing."
            : "Select at least one adventurer to enter."}
        </p>
      )}
    </div>
  );
}
