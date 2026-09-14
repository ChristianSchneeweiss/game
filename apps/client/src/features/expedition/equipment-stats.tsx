import type { Character } from "@loot-game/game/base-entity";
import { equipmentBuildPreview } from "@loot-game/game/items/equipment/build-preview";

const stats = [
  ["strength", "Strength"],
  ["intelligence", "Intelligence"],
  ["movement", "Movement"],
  ["armor", "Armor"],
  ["manaRegen", "Mana / round"],
] as const;
const format = (value: number) => Number(value.toFixed(1));

export function EquipmentStats({
  character,
  preview,
}: {
  character: Character;
  preview: Character;
}) {
  const current = equipmentBuildPreview(character);
  return (
    <div className="expedition-equipment-stats">
      <small>Base stats + equipment</small>
      <dl>
        {stats.map(([key, label]) => {
          const before = current.getAttribute(key);
          const after = preview.getAttribute(key);
          const difference = format(after - before);
          return (
            <div key={key}>
              <dt>{label}</dt>
              <dd>
                {difference !== 0 && (
                  <span className="expedition-stat-before">
                    {format(before)} →{" "}
                  </span>
                )}
                {format(after)}
                {difference !== 0 && (
                  <small data-gain={difference > 0}>
                    {difference > 0 ? "+" : ""}
                    {difference}
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
