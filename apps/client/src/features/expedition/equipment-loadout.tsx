import { lazy, Suspense, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Character } from "@loot-game/game/base-entity";
import { equipmentBuildPreview } from "@loot-game/game/items/equipment/build-preview";
import { trpc } from "@/utils/trpc";
import { EquipmentIcon } from "./equipment-icon";
import { EquipmentCollection } from "./equipment-collection";
import { EquipmentPreviewBoundary } from "./equipment-preview-boundary";
import { EquipmentStats } from "./equipment-stats";
import { refreshBuilds } from "./refresh-builds";
import "./equipment.css";

const EquipmentPreviewScene = lazy(() => import("./equipment-preview-scene"));
const slots = ["WEAPON", "ARMOR"] as const;

export function EquipmentLoadout({
  character,
  party,
}: {
  character: Character;
  party: Character[];
}) {
  const collection = useQuery(trpc.getMyEquipment.queryOptions());
  const [slot, setSlot] = useState<(typeof slots)[number]>("WEAPON");
  const [previewId, setPreviewId] = useState<string>();
  const onSaved = async () => {
    await refreshBuilds();
    setPreviewId(undefined);
  };
  const equip = useMutation(
    trpc.character.equipEquipment.mutationOptions({ onSuccess: onSaved }),
  );
  const unequip = useMutation(
    trpc.character.unequipEquipment.mutationOptions({ onSuccess: onSaved }),
  );
  const busy = equip.isPending || unequip.isPending;
  const candidate = collection.data?.find(
    (item) => item.id === previewId && item.item.equipmentSlot === slot,
  );
  const current = character.equipped[slot];
  const previewing = Boolean(candidate && candidate.id !== current?.id);
  const preview = equipmentBuildPreview(
    character,
    candidate
      ? { ...character.equipped, [slot]: candidate.item }
      : character.equipped,
  );
  const items =
    collection.data?.filter((item) => item.item.equipmentSlot === slot) ?? [];
  const error = equip.error ?? unequip.error ?? collection.error;
  return (
    <section
      className="expedition-equipment"
      aria-label={`${character.name}'s equipment`}
    >
      <div className="expedition-section-heading">
        <div>
          <small>Equipment</small>
          <h3>{character.name}'s gear</h3>
        </div>
      </div>
      <div className="expedition-gear-preview" data-previewing={previewing}>
        <EquipmentPreviewBoundary key={character.id}>
          <Suspense
            fallback={
              <p className="expedition-preview-fallback">
                Opening the fitting room…
              </p>
            }
          >
            <EquipmentPreviewScene character={preview} party={party} />
          </Suspense>
        </EquipmentPreviewBoundary>
        <div className="expedition-preview-caption">
          <small>
            {previewing ? "Preview · not equipped yet" : "Currently equipped"}
          </small>
          <strong>
            {preview.equipped.WEAPON?.name ?? "Unarmed"} ·{" "}
            {preview.equipped.ARMOR?.name ?? "Travel clothes"}
          </strong>
          {previewing && (
            <button onClick={() => setPreviewId(undefined)}>
              Cancel preview
            </button>
          )}
        </div>
      </div>
      <EquipmentStats character={character} preview={preview} />
      <div className="expedition-equipment-slots" aria-label="Equipment slots">
        {slots.map((value) => (
          <button
            key={value}
            aria-pressed={slot === value}
            onClick={() => {
              setSlot(value);
              setPreviewId(undefined);
            }}
          >
            <EquipmentIcon
              type={character.equipped[value]?.itemType}
              slot={value}
            />
            <span>
              <small>{value}</small>
              <strong>{character.equipped[value]?.name ?? "Empty slot"}</strong>
            </span>
          </button>
        ))}
      </div>
      {current && (
        <button
          className="expedition-remove-gear"
          disabled={busy}
          onClick={() => unequip.mutate({ equipmentId: current.id })}
        >
          Unequip {current.name}
        </button>
      )}
      <EquipmentCollection
        items={items}
        slot={slot}
        characterId={character.id}
        currentId={current?.id}
        previewId={previewId}
        pending={collection.isPending}
        busy={busy}
        savingId={equip.isPending ? equip.variables?.equipmentId : undefined}
        onPreview={setPreviewId}
        onEquip={(equipmentId) =>
          equip.mutate({ characterId: character.id, equipmentId })
        }
      />
      {error && (
        <p className="expedition-error" role="alert">
          {error.message}
        </p>
      )}
    </section>
  );
}
