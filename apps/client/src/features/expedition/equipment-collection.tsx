import type { trpcClient } from "@/utils/trpc";
import { useState } from "react";
import type { EquipmentSlot } from "@loot-game/game/items/equipment/equipment";
import { equipmentSlotLabels } from "@loot-game/game/items/equipment/equipment-slots";
import {
  attributeLabel,
  formatEquipmentModifier,
} from "@/lib/equipment-details";
import { Select } from "@/components/ui/select";
import { EquipmentIcon } from "./equipment-icon";

type OwnedEquipment = Awaited<
  ReturnType<typeof trpcClient.getMyEquipment.query>
>[number];

export function EquipmentCollection({
  items,
  slot,
  characterId,
  currentId,
  previewId,
  pending,
  busy,
  savingId,
  onPreview,
  onEquip,
}: {
  items: OwnedEquipment[];
  slot: EquipmentSlot;
  characterId: string;
  currentId?: string;
  previewId?: string;
  pending: boolean;
  busy: boolean;
  savingId?: string;
  onPreview: (id: string) => void;
  onEquip: (id: string) => void;
}) {
  const [tier, setTier] = useState("all");
  const filtered = items
    .filter((entry) => tier === "all" || entry.item.tier === tier)
    .sort(
      (a, b) =>
        "EDCBAS".indexOf(a.item.tier) - "EDCBAS".indexOf(b.item.tier) ||
        a.item.name.localeCompare(b.item.name),
    );
  return (
    <div className="expedition-gear-collection">
      <div className="expedition-gear-heading">
        <small>{equipmentSlotLabels[slot]} in your collection</small>
        <Select
          aria-label="Filter loadout by tier"
          value={tier}
          onChange={(event) => setTier(event.target.value)}
        >
          <option value="all">All tiers</option>
          {["E", "D", "C", "B", "A", "S"].map((value) => (
            <option key={value} value={value}>
              Tier {value}
            </option>
          ))}
        </Select>
      </div>
      {pending ? (
        <p role="status">Opening your equipment collection…</p>
      ) : filtered.length === 0 ? (
        <p className="expedition-muted">
          {items.length
            ? "No items at this tier. Choose another tier to see your gear."
            : `No ${equipmentSlotLabels[slot].toLowerCase()} collected yet. Explore dungeons and check the Library for drop sources.`}
        </p>
      ) : (
        filtered.map((entry) => (
          <EquipmentCollectionItem
            key={entry.id}
            entry={entry}
            worn={entry.id === currentId}
            elsewhere={Boolean(
              entry.equippedBy && entry.equippedBy !== characterId,
            )}
            previewing={previewId === entry.id}
            busy={busy}
            saving={savingId === entry.id}
            onPreview={onPreview}
            onEquip={onEquip}
          />
        ))
      )}
    </div>
  );
}

function EquipmentCollectionItem({
  entry,
  worn,
  elsewhere,
  previewing,
  busy,
  saving,
  onPreview,
  onEquip,
}: {
  entry: OwnedEquipment;
  worn: boolean;
  elsewhere: boolean;
  previewing: boolean;
  busy: boolean;
  saving: boolean;
  onPreview: (id: string) => void;
  onEquip: (id: string) => void;
}) {
  return (
    <article
      className="expedition-gear-item"
      data-equipped={worn}
      data-preview={previewing}
    >
      <EquipmentIcon type={entry.type} slot={entry.item.equipmentSlot} />
      <div>
        <small data-tier={entry.item.tier}>
          Tier {entry.item.tier} ·{" "}
          {worn
            ? "✓ Equipped"
            : elsewhere
              ? "Equipped on another character"
              : "In collection"}
        </small>
        <strong>{entry.item.name}</strong>
        <p>{entry.item.description}</p>
        <ul className="expedition-gear-bonuses" aria-label="Attribute bonuses">
          {entry.item.modifiers.map((modifier) => (
            <li key={modifier.id}>
              {formatEquipmentModifier(modifier)}{" "}
              {attributeLabel(modifier.attribute)}
            </li>
          ))}
        </ul>
      </div>
      <div className="expedition-gear-actions">
        <button
          aria-label={`Preview ${entry.item.name}`}
          aria-pressed={previewing}
          onClick={() => onPreview(entry.id)}
        >
          Preview
        </button>
        {!worn && (
          <button
            disabled={busy || elsewhere}
            aria-label={`Equip ${entry.item.name}`}
            onClick={() => onEquip(entry.id)}
          >
            {saving ? "Saving…" : "Equip"}
          </button>
        )}
      </div>
    </article>
  );
}
