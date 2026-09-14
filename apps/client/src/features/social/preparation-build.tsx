import { EquipmentLoadout } from "@/features/expedition/equipment-loadout";
import { SpellLoadout } from "@/features/expedition/spell-loadout";
import type { trpcClient } from "@/utils/trpc";
import { equipmentBuildPreview } from "@loot-game/game/items/equipment/build-preview";
import { useState } from "react";

export type OwnedCharacter = Awaited<
  ReturnType<typeof trpcClient.character.getCharacters.query>
>[number];

export function PreparationBuild({ character }: { character: OwnedCharacter }) {
  const [tab, setTab] = useState<"equipment" | "spells">("equipment");
  return (
    <>
      <div className="expedition-build-tabs" aria-label="Build section">
        <button
          aria-pressed={tab === "equipment"}
          onClick={() => setTab("equipment")}
        >
          Gear & appearance
        </button>
        <button
          aria-pressed={tab === "spells"}
          onClick={() => setTab("spells")}
        >
          Spell loadout
        </button>
      </div>
      {tab === "equipment" ? (
        <EquipmentLoadout
          key={character.id}
          character={character}
          party={[character]}
        />
      ) : (
        <SpellLoadout
          key={character.id}
          character={equipmentBuildPreview(character)}
        />
      )}
    </>
  );
}
