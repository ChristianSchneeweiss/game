import { spellSlots } from "./spell-slot-info";

export function SpellSlotStatus({ count }: { count: number }) {
  const empty = Math.max(0, spellSlots.length - count);
  return (
    <span className="expedition-slot-status" data-empty={empty > 0}>
      {empty === 0 ? "✓ " : ""}
      {count}/{spellSlots.length} equipped
      {empty > 0 && ` · ${empty} empty`}
    </span>
  );
}
