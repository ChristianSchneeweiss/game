import type { Character } from "@loot-game/game/base-entity";
import { equipmentBuildPreview } from "@loot-game/game/items/equipment/build-preview";
import type { AllAttributeKeys } from "@loot-game/game/entity-types";
import { attributeLabel, formatAttribute } from "@/lib/equipment-details";

const coreStats: AllAttributeKeys[] = [
  "strength",
  "intelligence",
  "agility",
  "vitality",
  "armor",
  "magicResistance",
  "movement",
  "healthRegen",
  "manaRegen",
];

export function EquipmentStats({
  character,
  preview,
}: {
  character: Character;
  preview: Character;
}) {
  const current = equipmentBuildPreview(character);
  const stats = new Set([
    ...coreStats,
    ...[
      ...Object.values(character.equipped),
      ...Object.values(preview.equipped),
    ].flatMap(
      (item) => item?.modifiers.map(({ attribute }) => attribute) ?? [],
    ),
  ]);
  return (
    <div className="expedition-equipment-stats" aria-live="polite">
      <small>Base stats + equipment</small>
      <dl>
        {[...stats].map((key) => {
          const before = current.getAttribute(key);
          const after = preview.getAttribute(key);
          const difference = Number((after - before).toFixed(4));
          return (
            <div key={key}>
              <dt>{attributeLabel(key)}</dt>
              <dd>
                {difference !== 0 && (
                  <span className="expedition-stat-before">
                    {formatAttribute(key, before)} →{" "}
                  </span>
                )}
                {formatAttribute(key, after)}
                {difference !== 0 && (
                  <small data-gain={difference > 0}>
                    {difference > 0 ? "+" : ""}
                    {formatAttribute(key, difference)}
                  </small>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
