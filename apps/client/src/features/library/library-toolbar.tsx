import { useId, useState, type ReactNode } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { LibraryEntry } from "@loot-game/game/library/types";
import {
  libraryGroup,
  libraryTiers,
  parseLibrarySearch,
  type LibrarySearch,
} from "./library-search";

export function LibraryToolbar({
  search,
  categoryName,
  entries,
  onChange,
  children,
}: {
  search: LibrarySearch;
  categoryName: string;
  entries: LibraryEntry[];
  onChange: (patch: Partial<LibrarySearch>) => void;
  children?: ReactNode;
}) {
  const optionsId = useId();
  const [expanded, setExpanded] = useState(false);
  const groups = [...new Set(entries.map((entry) => entry.group))].sort();
  const hasMight = search.category !== "items";
  const rangeActive =
    search.mightMin !== undefined || search.mightMax !== undefined;
  return (
    <div className="library-toolbar">
      <label className="library-search">
        <Search size={17} />
        <span className="sr-only">Search library</span>
        <Input
          type="search"
          placeholder={`Search ${categoryName.toLowerCase()}…`}
          value={search.q}
          onChange={(event) => onChange({ q: event.target.value, entry: "" })}
        />
      </label>
      <label>
        <span className="sr-only">Tier</span>
        <Select
          aria-label="Filter by tier"
          value={search.tier}
          onChange={(event) =>
            onChange({ tier: event.target.value, entry: "" })
          }
        >
          <option value="all">All tiers</option>
          {libraryTiers
            .filter((tier) => hasMight || tier !== "unrated")
            .map((tier) => (
              <option key={tier} value={tier}>
                {tier === "unrated" ? "Unrated" : `Tier ${tier}`}
              </option>
            ))}
        </Select>
      </label>
      {groups.length > 1 ? (
        <label>
          <span className="sr-only">
            {search.category === "spells"
              ? "Recipients"
              : search.category === "equipment"
                ? "Slot"
                : "Kind"}
          </span>
          <Select
            aria-label="Filter by type"
            value={libraryGroup(entries, search.group)}
            onChange={(event) =>
              onChange({ group: event.target.value, entry: "" })
            }
          >
            <option value="all">
              {search.category === "equipment" ? "All slots" : "All types"}
            </option>
            {groups.map((group) => (
              <option key={group} value={group}>
                {group[0].toUpperCase() + group.slice(1)}
              </option>
            ))}
          </Select>
        </label>
      ) : null}
      <label>
        <span className="sr-only">Order</span>
        <Select
          aria-label="Sort entries"
          value={search.sort}
          onChange={(event) =>
            onChange({
              sort: parseLibrarySearch({
                category: search.category,
                sort: event.target.value,
              }).sort,
            })
          }
        >
          <option value="name">Name A–Z</option>
          <option value="tier">Tier S–E</option>
          {hasMight && (
            <>
              <option value="mightDesc">Might: high to low</option>
              <option value="mightAsc">Might: low to high</option>
            </>
          )}
          {search.category === "enemies" ? (
            <option value="health">Health: high first</option>
          ) : null}
          {search.category === "spells" ? (
            <>
              <option value="mana">Mana: low first</option>
              <option value="cooldown">Cooldown: low first</option>
              <option value="directDamage">Est. damage: high first</option>
            </>
          ) : null}
        </Select>
      </label>
      {hasMight && (
        <>
          <button
            type="button"
            className="library-options-toggle"
            aria-label={
              rangeActive ? "More options, Might range active" : "More options"
            }
            aria-expanded={expanded}
            aria-controls={optionsId}
            data-active={rangeActive}
            onClick={() => setExpanded((value) => !value)}
          >
            <SlidersHorizontal size={16} />
            <span>More</span>
          </button>
          <div
            id={optionsId}
            className="library-options-panel"
            hidden={!expanded}
          >
            {children}
          </div>
        </>
      )}
    </div>
  );
}
