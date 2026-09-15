import type { LootEntity } from "@loot-game/game/types";
import { createPassiveLibrary } from "@loot-game/game/library/catalog";
import { createSpellFromType } from "@loot-game/game/spells/base/spell-from-type";
import { SkillIcon } from "@/components/skill-icon";
import { ItemIcon } from "@/components/item-icon";
import { getItemDefinition } from "@loot-game/game/items/catalog";
import { itemQuantity } from "@loot-game/game/items/quantity";
import "@/styles/collections.css";

const passives = new Map(
  createPassiveLibrary().map((entry) => [entry.type, entry.name]),
);

function rewardPresentation(item: LootEntity) {
  if (item.type === "ITEM") {
    const definition = getItemDefinition(item.data.itemType);
    return {
      type: definition.type,
      name: definition.name,
      label: `${definition.kind.charAt(0).toUpperCase()}${definition.kind.slice(1)} · Tier ${definition.tier}`,
      quantity: itemQuantity(item.data),
    };
  }
  if (item.type === "SPELL")
    return {
      type: item.data.spellType,
      name: createSpellFromType(
        `reward:${item.data.spellType}`,
        item.data.spellType,
      ).config.name,
      label: "Spell",
      quantity: 1,
    };
  return {
    type: item.data.passiveType,
    name: passives.get(item.data.passiveType),
    label: "Passive skill",
    quantity: 1,
  };
}

export function RewardEntry({
  item,
  count,
}: {
  item: LootEntity;
  count?: number;
}) {
  const { type, name, label, quantity: itemCount } = rewardPresentation(item);
  const quantity = count ?? itemCount;
  return (
    <div className="reward-entry">
      {item.type === "ITEM" ? (
        <ItemIcon type={type} />
      ) : (
        <SkillIcon type={type} size={44} />
      )}
      <div>
        <small>{label}</small>
        <strong>{name ?? type}</strong>
      </div>
      {(item.type === "ITEM" || quantity > 1) && (
        <span className="rpg-badge">×{quantity}</span>
      )}
    </div>
  );
}
