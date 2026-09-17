import { useId, useState } from "react";
import type { AiControl } from "@loot-game/game/ai-control";
import { Button } from "./ui/button";
import { ChevronDown } from "lucide-react";
import "./ai-control.css";

export function AiControlForm({
  settings,
  onSave,
  disabled = false,
  label = "Control by default",
  collapsible = true,
}: {
  settings: AiControl;
  onSave: (settings: AiControl) => void;
  disabled?: boolean;
  label?: string;
  collapsible?: boolean;
}) {
  const promptId = useId();
  const [draft, setDraft] = useState({
    saved: settings.prompt,
    value: settings.prompt,
  });
  if (draft.saved !== settings.prompt)
    setDraft({ saved: settings.prompt, value: settings.prompt });
  const prompt = draft.value;
  const fields = (
    <div className="ai-settings-fields">
      <label htmlFor={promptId}>Private orders</label>
      <textarea
        id={promptId}
        rows={3}
        maxLength={4000}
        value={prompt}
        disabled={disabled}
        placeholder="e.g. Protect allies and conserve mana."
        onChange={(event) =>
          setDraft({ saved: settings.prompt, value: event.target.value })
        }
      />
      <p>
        Your orders replace the default goal. Leave blank to help your side win.
      </p>
      <label className="ai-supplies-option">
        <input
          type="checkbox"
          checked={settings.allowConsumables}
          disabled={disabled}
          onChange={(event) =>
            onSave({ ...settings, allowConsumables: event.target.checked })
          }
        />
        Use equipped consumables
      </label>
      <Button
        variant="outline"
        disabled={disabled || prompt === settings.prompt}
        onClick={() => onSave({ ...settings, prompt })}
      >
        Save orders
      </Button>
    </div>
  );
  return (
    <div className="ai-settings">
      <div className="ai-settings-heading">
        <strong>{label}</strong>
        <div
          className="ai-control-mode"
          role="group"
          aria-label={`Control for ${label}`}
        >
          <button
            type="button"
            disabled={disabled}
            aria-pressed={!settings.enabled}
            onClick={() => onSave({ ...settings, enabled: false })}
          >
            Manual
          </button>
          <button
            type="button"
            disabled={disabled}
            aria-pressed={settings.enabled}
            onClick={() => onSave({ ...settings, enabled: true })}
          >
            Commander
          </button>
        </div>
      </div>
      {collapsible ? (
        <details className="ai-settings-details">
          <summary>
            <ChevronDown size={14} aria-hidden="true" />
            Orders & supplies
            {settings.prompt.trim() && <span>Custom orders</span>}
          </summary>
          {fields}
        </details>
      ) : (
        fields
      )}
    </div>
  );
}
