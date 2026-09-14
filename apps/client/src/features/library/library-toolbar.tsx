import { Search } from "lucide-react";
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
}: {
  search: LibrarySearch;
  categoryName: string;
  entries: LibraryEntry[];
  onChange: (patch: Partial<LibrarySearch>) => void;
}) {
  const groups = [...new Set(entries.map((entry) => entry.group))].sort();
  return (
    <div className="library-toolbar">
      <label className="library-search">
        <Search size={17} />
        <span className="sr-only">Search library</span>
        <input
          type="search"
          placeholder={`Search ${categoryName.toLowerCase()}…`}
          value={search.q}
          onChange={(event) => onChange({ q: event.target.value, entry: "" })}
        />
      </label>
      <label>
        <span>Tier</span>
        <select
          aria-label="Filter by tier"
          value={search.tier}
          onChange={(event) =>
            onChange({ tier: event.target.value, entry: "" })
          }
        >
          <option value="all">All tiers</option>
          {libraryTiers.map((tier) => (
            <option key={tier} value={tier}>
              {tier === "unrated" ? "Unrated" : `Tier ${tier}`}
            </option>
          ))}
        </select>
      </label>
      {groups.length > 1 ? (
        <label>
          <span>{search.category === "spells" ? "Recipients" : "Slot"}</span>
          <select
            aria-label="Filter by type"
            value={libraryGroup(entries, search.group)}
            onChange={(event) =>
              onChange({ group: event.target.value, entry: "" })
            }
          >
            <option value="all">All types</option>
            {groups.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label>
        <span>Order</span>
        <select
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
          <option value="mightDesc">Might: high to low</option>
          <option value="mightAsc">Might: low to high</option>
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
        </select>
      </label>
    </div>
  );
}
