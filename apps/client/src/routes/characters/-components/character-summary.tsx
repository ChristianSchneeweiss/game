import { lazy, Suspense } from "react";
import type { Character } from "@loot-game/game/base-entity";
import { xpNeededForLevelUp } from "@loot-game/game/utils/xp-curve";
import { Footprints, Shield, Swords } from "lucide-react";
import { RpgMeter } from "@/components/rpg-ui";
import { EquipmentPreviewBoundary } from "@/features/expedition/equipment-preview-boundary";
import { CharacterVitals } from "./character-ui";

const CharacterPreview = lazy(
  () => import("@/features/expedition/equipment-preview-scene"),
);

export function CharacterSummary({ character }: { character: Character }) {
  return (
    <aside className="character-summary" aria-label="Character overview">
      <div className="character-model-stage">
        <span className="character-model-level">
          Level <strong>{character.level}</strong>
        </span>
        <EquipmentPreviewBoundary key={character.id}>
          <Suspense
            fallback={
              <p className="expedition-preview-fallback">
                Preparing your character preview…
              </p>
            }
          >
            <CharacterPreview character={character} party={[character]} />
          </Suspense>
        </EquipmentPreviewBoundary>
      </div>
      <div className="character-summary-body">
        <RpgMeter
          label="Experience"
          value={character.xp ?? 0}
          max={xpNeededForLevelUp(character.level)}
          tone="xp"
        />
        <CharacterVitals character={character} />
        <dl className="character-summary-loadout">
          <div>
            <dt>
              <Swords size={16} aria-hidden="true" />
              Weapon
            </dt>
            <dd>{character.equipped.WEAPON?.name ?? "Unarmed"}</dd>
          </div>
          <div>
            <dt>
              <Shield size={16} aria-hidden="true" />
              Armor
            </dt>
            <dd>{character.equipped.ARMOR?.name ?? "No armor equipped"}</dd>
          </div>
          <div>
            <dt>
              <Footprints size={16} aria-hidden="true" />
              Movement
            </dt>
            <dd>
              {character.getAttribute("movement")} tiles{" "}
              <span>per activation</span>
            </dd>
          </div>
        </dl>
      </div>
    </aside>
  );
}
