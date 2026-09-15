import type { AllAttributeKeys } from "../../entity-types";
import type { AttributeModifier } from "../../types";

const percentages = new Set<AllAttributeKeys>([
  "critChance",
  "critDamage",
  "lifesteal",
  "omnivamp",
]);

export function formatAttribute(attribute: AllAttributeKeys, value: number) {
  const percent = percentages.has(attribute);
  return `${Number((value * (percent ? 100 : 1)).toFixed(1))}${percent ? "%" : ""}`;
}

export function formatEquipmentModifier(
  modifier: Pick<AttributeModifier, "attribute" | "value" | "operation">,
) {
  if (modifier.operation === "MULTIPLY") return `×${modifier.value}`;
  return `${modifier.value >= 0 ? "+" : ""}${formatAttribute(modifier.attribute, modifier.value)}`;
}
