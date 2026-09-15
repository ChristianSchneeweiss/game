import type { LootEntity } from "@loot-game/game/types";
import {
  createItemLibrary,
  createPassiveLibrary,
} from "@loot-game/game/library/catalog";
import { createSpellFromType } from "@loot-game/game/spells/base/spell-from-type";
import { SkillIcon } from "@/components/skill-icon";
import { EquipmentIcon } from "./equipment-icon";
import "@/styles/collections.css";

const items = new Map(
  createItemLibrary().map((entry) => [entry.type, entry.name]),
);
const passives = new Map(
  createPassiveLibrary().map((entry) => [entry.type, entry.name]),
);

export function RewardEntry({
  item,
  count = 1,
}: {
  item: LootEntity;
  count?: number;
}) {
  const type =
    item.type === "SPELL"
      ? item.data.spellType
      : item.type === "ITEM"
        ? item.data.itemType
        : item.data.passiveType;
  const name =
    item.type === "SPELL"
      ? createSpellFromType(`reward:${type}`, item.data.spellType).config.name
      : item.type === "ITEM"
        ? items.get(type)
        : passives.get(type);
  return (
    <div className="reward-entry">
      {item.type === "ITEM" ? (
        <EquipmentIcon type={type} />
      ) : (
        <SkillIcon type={type} size={44} />
      )}
      <div>
        <small>
          {
            { SPELL: "Spell", ITEM: "Equipment", PASSIVE: "Passive skill" }[
              item.type
            ]
          }
        </small>
        <strong>{name ?? type}</strong>
      </div>
      {count > 1 && <span className="rpg-badge">×{count}</span>}
    </div>
  );
}
