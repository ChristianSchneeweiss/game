import { useId, useState, type ReactNode } from "react";
import * as HoverCard from "@radix-ui/react-hover-card";
import { SkillIcon } from "../../../components/skill-icon";
import { groupConditions, type ConditionDetail } from "./battle-effects";

export function ConditionIcons({
  ids,
  details,
  entityName,
}: {
  ids: string[];
  details: Map<string, ConditionDetail>;
  entityName: string;
}) {
  const groups = groupConditions(ids, details);
  const visible = groups.length > 5 ? groups.slice(0, 4) : groups;
  const remaining = groups.slice(visible.length);
  if (!groups.length) return null;
  return (
    <div className="battle-conditions" aria-label={`${entityName} conditions`}>
      {visible.map(({ detail, count }) => (
        <ConditionPopover
          key={detail.id}
          label={`${entityName}: ${detail.name}, ${detail.category}${count > 1 ? `, ${count} stacks` : ""}`}
          tone={detail.tone}
          trigger={
            <>
              <SkillIcon type={detail.iconType} size={20} eager />
              <span className="battle-condition-sign" aria-hidden="true">
                {detail.tone === "harmful"
                  ? "↓"
                  : detail.tone === "beneficial"
                    ? "↑"
                    : "•"}
              </span>
              {count > 1 && (
                <span className="battle-condition-count">{count}</span>
              )}
            </>
          }
        >
          <strong>{detail.name}</strong>
          <span>
            {detail.category}
            {count > 1 ? ` · ${count} stacks` : ""}
          </span>
          <p>{detail.description || "Active until removed."}</p>
        </ConditionPopover>
      ))}
      {remaining.length > 0 && (
        <ConditionPopover
          label={`${entityName}: ${remaining.length} more conditions`}
          tone="neutral"
          trigger={
            <span className="battle-condition-overflow">
              +{remaining.length}
            </span>
          }
        >
          <strong>More conditions</strong>
          {remaining.map(({ detail, count }) => (
            <div className="battle-condition-extra" key={detail.id}>
              <SkillIcon type={detail.iconType} size={24} eager />
              <div>
                <strong>
                  {detail.name}
                  {count > 1 ? ` ×${count}` : ""}
                </strong>
                <span>{detail.category}</span>
                <p>{detail.description}</p>
              </div>
            </div>
          ))}
        </ConditionPopover>
      )}
    </div>
  );
}

function ConditionPopover({
  label,
  tone,
  trigger,
  children,
}: {
  label: string;
  tone: ConditionDetail["tone"];
  trigger: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <HoverCard.Root
      open={open}
      onOpenChange={setOpen}
      openDelay={100}
      closeDelay={120}
    >
      <HoverCard.Trigger asChild>
        <button
          type="button"
          className="battle-condition-icon"
          data-tone={tone}
          aria-label={label}
          aria-describedby={open ? id : undefined}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onClick={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              event.stopPropagation();
            }
          }}
        >
          {trigger}
        </button>
      </HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content
          id={id}
          role="tooltip"
          className="battle-condition-tooltip"
          side="bottom"
          sideOffset={8}
          collisionPadding={12}
        >
          {children}
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
}
