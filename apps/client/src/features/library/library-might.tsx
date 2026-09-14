import { useId, useState } from "react";
import type { LibraryEntry } from "@loot-game/game/library/types";
import { parseMightBound } from "./library-search";

export function MightBadge({ entry }: { entry: LibraryEntry }) {
  return (
    <span className="library-might">
      <span>
        {entry.tier !== null ? (
          <>
            <span className="library-tier" data-tier={entry.tier}>
              {entry.tier}
            </span>
            {" · "}
          </>
        ) : null}
        Might {entry.might ?? "—"}
      </span>
      {entry.assessmentStatus === "unrated" ? (
        <small title="This content has not been assessed yet.">Unrated</small>
      ) : entry.assessmentStatus === "estimated" ? (
        <small title="A provisional assessment under standard conditions.">
          Estimated
        </small>
      ) : null}
    </span>
  );
}

type Bounds = { mightMin?: number; mightMax?: number };
function rangeError(min: string, max: string): string | undefined {
  const minimum = parseMightBound(min);
  const maximum = parseMightBound(max);
  if (
    (min !== "" && minimum === undefined) ||
    (max !== "" && maximum === undefined)
  ) {
    return "Enter whole numbers from 0 to 9007199254740991, or leave a bound empty.";
  }
  if (minimum !== undefined && maximum !== undefined && minimum > maximum) {
    return "Minimum Might must not exceed maximum Might.";
  }
}

export function MightRange({
  mightMin,
  mightMax,
  onChange,
}: Bounds & { onChange: (bounds: Bounds) => void }) {
  const errorId = useId();
  const [draft, setDraft] = useState(() => ({
    min: String(mightMin ?? ""),
    max: String(mightMax ?? ""),
    mightMin,
    mightMax,
  }));
  // URL navigation/reset replaces the draft; valid typing keeps the input mounted and focused.
  if (draft.mightMin !== mightMin || draft.mightMax !== mightMax) {
    setDraft({
      min: String(mightMin ?? ""),
      max: String(mightMax ?? ""),
      mightMin,
      mightMax,
    });
  }
  const error = rangeError(draft.min, draft.max);
  const edit = (field: "min" | "max", value: string) => {
    const next = { ...draft, [field]: value };
    setDraft(next);
    if (!rangeError(next.min, next.max)) {
      const bounds = {
        mightMin: parseMightBound(next.min),
        mightMax: parseMightBound(next.max),
      };
      onChange(bounds);
    }
  };
  return (
    <fieldset className="library-might-range">
      <legend>Might range</legend>
      <div>
        {(["min", "max"] as const).map((field) => (
          <label key={field}>
            <span>{field === "min" ? "Minimum Might" : "Maximum Might"}</span>
            <input
              type="text"
              inputMode="numeric"
              value={draft[field]}
              placeholder="Any"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
              onChange={(event) => edit(field, event.target.value)}
            />
          </label>
        ))}
        {draft.min !== "" || draft.max !== "" ? (
          <button
            type="button"
            onClick={() => {
              setDraft({
                ...draft,
                min: "",
                max: "",
              });
              onChange({ mightMin: undefined, mightMax: undefined });
            }}
          >
            Clear range
          </button>
        ) : null}
      </div>
      {error ? (
        <p id={errorId} role="alert">
          {error} The last valid range remains applied.
        </p>
      ) : null}
    </fieldset>
  );
}
