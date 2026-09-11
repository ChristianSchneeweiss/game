import type { trpcClient } from "@/utils/trpc";
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
  slot: "WEAPON" | "ARMOR";
  characterId: string;
  currentId?: string;
  previewId?: string;
  pending: boolean;
  busy: boolean;
  savingId?: string;
  onPreview: (id: string) => void;
  onEquip: (id: string) => void;
}) {
  return (
    <div className="expedition-gear-collection">
      <small>
        {slot === "WEAPON" ? "Weapons" : "Armor"} in your collection
      </small>
      {pending ? (
        <p role="status">Opening your equipment collection…</p>
      ) : items.length === 0 ? (
        <p className="expedition-muted">
          {slot === "WEAPON"
            ? "The Oakwarden drops a staff, and moss-covered golems can drop an Iron Sword."
            : "The Elder Treant in the forest's third wave drops an Iron Cuirass. Goblins can drop intelligence armor."}
        </p>
      ) : (
        items.map((entry) => (
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
      <EquipmentIcon type={entry.type} />
      <div>
        <small>
          {worn
            ? "✓ Equipped"
            : elsewhere
              ? "Equipped on another character"
              : `Tier ${entry.item.tier} · In collection`}
        </small>
        <strong>{entry.item.name}</strong>
        <p>{entry.item.description}</p>
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
