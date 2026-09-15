import type { trpcClient } from "@/utils/trpc";
import {
  attributeLabel,
  formatEquipmentModifier,
} from "@/lib/equipment-details";

export type OwnedItem = Awaited<
  ReturnType<typeof trpcClient.getMyInventory.query>
>[number];
export type CollectionEntry = OwnedItem & { copy: number; copies: number };
export type InventoryFilters = {
  kind: string;
  query: string;
  status: string;
  slot: string;
  tier: string;
  sort: string;
};

export function inventoryEntries(items: OwnedItem[]): CollectionEntry[] {
  const totals = new Map<string, number>();
  const seen = new Map<string, number>();
  for (const entry of items)
    totals.set(entry.type, (totals.get(entry.type) ?? 0) + 1);
  return items.map((entry) => {
    const copy = (seen.get(entry.type) ?? 0) + 1;
    seen.set(entry.type, copy);
    return { ...entry, copy, copies: totals.get(entry.type)! };
  });
}

export function filterInventory(
  entries: CollectionEntry[],
  filters: InventoryFilters,
) {
  const { kind, query, status, slot, tier, sort } = filters;
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return entries
    .filter((entry) => {
      if (kind !== "all" && entry.kind !== kind) return false;
      if (tier !== "all" && entry.item.tier !== tier) return false;
      if (kind === "equipment") {
        if (entry.kind !== "equipment") return false;
        if (slot !== "all" && entry.item.equipmentSlot !== slot) return false;
        if (status === "available" && entry.equippedBy !== null) return false;
        if (status === "equipped" && entry.equippedBy === null) return false;
      }
      const bonuses =
        entry.item.kind === "equipment"
          ? entry.item.bonuses
              .map(
                (bonus) =>
                  `${attributeLabel(bonus.attribute)} ${formatEquipmentModifier({ ...bonus, operation: "ADD" })}`,
              )
              .join(" ")
          : "";
      const text =
        `${entry.item.name} ${entry.item.description} ${bonuses}`.toLowerCase();
      return terms.every((term) => text.includes(term));
    })
    .sort((a, b) => {
      if (sort === "tier" && a.item.tier !== b.item.tier)
        return "SABCDE".indexOf(a.item.tier) - "SABCDE".indexOf(b.item.tier);
      if (sort === "available" && kind === "equipment") {
        const first = a.kind === "equipment" && a.equippedBy !== null;
        const second = b.kind === "equipment" && b.equippedBy !== null;
        if (first !== second) return first ? 1 : -1;
      }
      return a.item.name.localeCompare(b.item.name) || a.copy - b.copy;
    });
}
