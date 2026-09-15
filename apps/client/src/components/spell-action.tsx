import type { ReactNode } from "react";
import { SkillIcon } from "./skill-icon";

export function SpellAction({
  name,
  type,
  selected,
  disabled,
  onSelect,
  metadata,
  inspection,
}: {
  name: string;
  type: string;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  metadata: ReactNode;
  inspection: ReactNode;
}) {
  return (
    <div className="spell-action" data-selected={selected}>
      <button
        type="button"
        className="spell-action-select"
        aria-label={`Prepare ${name}`}
        aria-pressed={selected}
        disabled={disabled}
        onClick={onSelect}
      >
        <SkillIcon type={type} size={40} eager />
        <span className="spell-action-copy">
          <span className="spell-action-name" title={name}>
            {name}
          </span>
          <span className="spell-action-meta">{metadata}</span>
        </span>
      </button>
      {inspection}
    </div>
  );
}
