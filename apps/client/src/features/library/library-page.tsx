import { useMemo, useState } from "react";
import {
  BookOpen,
  Shield,
  Skull,
  SlidersHorizontal,
  Sparkles,
  Sword,
} from "lucide-react";
import {
  createEnemyLibrary,
  createItemLibrary,
  createPassiveLibrary,
  createSpellLibrary,
} from "@loot-game/game/library/catalog";
import {
  DEFAULT_LIBRARY_ATTRIBUTES,
  type LibraryAttributes,
  type LibraryEntry,
  type LibraryReference,
} from "@loot-game/game/library/types";
import { LibraryDetail, LibraryIcon } from "./library-entry";
import { targetingLabel } from "./library-format";
import { MightBadge, MightRange } from "./library-might";
import { LibraryToolbar } from "./library-toolbar";
import { libraryFamilyLabel } from "@loot-game/game/library/types";
import {
  filterLibrary,
  libraryCategories,
  parseLibrarySearch,
  type LibrarySearch,
} from "./library-search";
import "./library.css";

const categories = {
  spells: {
    name: "Spells",
    icon: Sparkles,
    description: "Attacks, healing, and the effects that shape a fight.",
  },
  items: {
    name: "Items",
    icon: Sword,
    description:
      "Equipment, consumables, and materials: tiers, properties, and sources.",
  },
  passives: {
    name: "Passive skills",
    icon: Shield,
    description: "Persistent abilities that bring a build together.",
  },
  enemies: {
    name: "Enemies",
    icon: Skull,
    description: "Base attributes, combat kits, and possible rewards.",
  },
};

export function LibraryPage({
  search,
  onSearchChange,
}: {
  search: LibrarySearch;
  onSearchChange: (search: LibrarySearch) => void;
}) {
  const [staticEntries] = useState(() => [
    ...createItemLibrary(),
    ...createPassiveLibrary(),
    ...createEnemyLibrary(),
  ]);
  const [attributes, setAttributes] = useState<LibraryAttributes>(
    DEFAULT_LIBRARY_ATTRIBUTES,
  );
  const [rangeReset, setRangeReset] = useState(0);
  const spells = useMemo(() => createSpellLibrary(attributes), [attributes]);
  const entries = useMemo(
    () => [...spells, ...staticEntries],
    [spells, staticEntries],
  );
  const categoryEntries = entries.filter(
    (entry) => entry.category === search.category,
  );
  const filtered = filterLibrary(entries, search);
  const selected =
    filtered.find((entry) => entry.type === search.entry) ?? filtered[0];
  const currentCategory = categories[search.category];
  const change = (patch: Partial<LibrarySearch>) =>
    onSearchChange({ ...search, ...patch });
  const inspect = (reference: LibraryReference) => {
    setRangeReset((value) => value + 1);
    onSearchChange({
      ...parseLibrarySearch({ category: reference.category }),
      entry: reference.type,
    });
  };
  const clearFilters = () => {
    setRangeReset((value) => value + 1);
    change({
      q: "",
      tier: "all",
      group: "all",
      entry: "",
      mightMin: undefined,
      mightMax: undefined,
    });
  };
  const isFiltered =
    search.q !== "" ||
    search.tier !== "all" ||
    search.group !== "all" ||
    search.mightMin !== undefined ||
    search.mightMax !== undefined;
  const familyGroups =
    search.category === "items" &&
    (search.sort === "mightAsc" || search.sort === "mightDesc")
      ? [...new Set(filtered.map((entry) => entry.family))]
      : [];

  return (
    <main id="main-content" tabIndex={-1} className="rpg-page library-page">
      <div className="rpg-shell">
        <header className="library-heading">
          <div>
            <p className="library-eyebrow">
              <BookOpen size={15} /> The affinity archive
            </p>
            <h1>Library</h1>
            <p>Know every spell. Understand every build.</p>
          </div>
          <div className="library-total">
            <strong>{entries.length}</strong>
            <span>entries to explore</span>
          </div>
        </header>
        <div className="library-workspace">
          <nav className="library-categories" aria-label="Library categories">
            {libraryCategories.map((category) => {
              const { name, icon: Icon } = categories[category];
              return (
                <button
                  type="button"
                  key={category}
                  aria-pressed={search.category === category}
                  onClick={() =>
                    onSearchChange(parseLibrarySearch({ category }))
                  }
                >
                  <Icon size={18} />
                  <span>{name}</span>
                  <small>
                    {
                      entries.filter((entry) => entry.category === category)
                        .length
                    }
                  </small>
                </button>
              );
            })}
            <p className="library-scope">
              The complete catalogue.
              <br />
              Collected and undiscovered.
            </p>
          </nav>
          <div className="library-browser">
            <div className="library-browser-heading">
              <h2>{currentCategory.name}</h2>
              <p>{currentCategory.description}</p>
              <details className="library-explanation">
                <summary>Understanding Might</summary>
                <p>
                  Might values overall power, including special effects, among
                  comparable content under standard conditions. Unrated entries
                  have not been assessed yet.
                </p>
              </details>
            </div>
            <LibraryToolbar
              search={search}
              categoryName={currentCategory.name}
              entries={categoryEntries}
              onChange={change}
            />
            <LibraryAdvancedControls search={search}>
              <MightRange
                key={`${search.category}:${rangeReset}`}
                mightMin={search.mightMin}
                mightMax={search.mightMax}
                onChange={(bounds) => change({ ...bounds, entry: "" })}
              />
              {search.category === "spells" ? (
                <LibraryPreview
                  attributes={attributes}
                  onChange={setAttributes}
                />
              ) : null}
            </LibraryAdvancedControls>
            <div className="library-results">
              <span role="status">
                {filtered.length} of {categoryEntries.length} entries
              </span>
              {isFiltered ? (
                <button type="button" onClick={clearFilters}>
                  Clear filters
                </button>
              ) : (
                <span>Select an entry to inspect</span>
              )}
            </div>
            <div className="library-content">
              <div className="library-list">
                {filtered.length ? (
                  familyGroups.length ? (
                    familyGroups.map((family) => (
                      <LibraryTable
                        key={family}
                        familyLabel={libraryFamilyLabel(family)}
                        entries={filtered.filter(
                          (entry) => entry.family === family,
                        )}
                        selected={selected?.type}
                        onInspect={(entry) => change({ entry: entry.type })}
                      />
                    ))
                  ) : (
                    <LibraryTable
                      entries={filtered}
                      selected={selected?.type}
                      onInspect={(entry) => change({ entry: entry.type })}
                    />
                  )
                ) : (
                  <div className="library-empty">
                    <BookOpen size={32} />
                    <h3>No matching entries</h3>
                    <p>Try another name, effect, tier, or Might range.</p>
                    <button type="button" onClick={clearFilters}>
                      Clear filters
                    </button>
                  </div>
                )}
              </div>
              {selected ? (
                <LibraryDetail
                  entry={selected}
                  entries={entries}
                  onInspect={inspect}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function LibraryAdvancedControls({
  search,
  children,
}: {
  search: LibrarySearch;
  children: React.ReactNode;
}) {
  return (
    <details className="library-advanced">
      <summary>
        <SlidersHorizontal size={15} /> Might range
        {search.category === "spells" ? " & preview attributes" : ""}
        {(search.mightMin !== undefined || search.mightMax !== undefined) && (
          <span>Range active</span>
        )}
      </summary>
      {children}
    </details>
  );
}

function LibraryPreview({
  attributes,
  onChange,
}: {
  attributes: LibraryAttributes;
  onChange: (attributes: LibraryAttributes) => void;
}) {
  return (
    <details className="library-preview">
      <summary>
        <SlidersHorizontal size={16} /> Preview attributes{" "}
        <span>
          STR {attributes.strength} · INT {attributes.intelligence} · VIT{" "}
          {attributes.vitality} · AGI {attributes.agility}
        </span>
      </summary>
      <p>
        Adjust the hero and target attributes to compare spell scaling. Both
        have 100/100 health, zero defenses and affinities, and no passives.
        Basic Attack uses the unarmed profile. Preview attributes do not change
        Might or tier.
      </p>
      <div className="library-attributes">
        {(
          Object.keys(DEFAULT_LIBRARY_ATTRIBUTES) as (keyof LibraryAttributes)[]
        ).map((attribute) => (
          <label key={attribute}>
            <span>{attribute}</span>
            <input
              type="number"
              min={0}
              max={500}
              step={1}
              value={attributes[attribute]}
              onChange={(event) => {
                const value = event.target.valueAsNumber;
                onChange({
                  ...attributes,
                  [attribute]: Number.isFinite(value)
                    ? Math.max(0, Math.min(500, Math.round(value)))
                    : 0,
                });
              }}
            />
          </label>
        ))}
        <button
          type="button"
          onClick={() => onChange({ ...DEFAULT_LIBRARY_ATTRIBUTES })}
        >
          Reset
        </button>
      </div>
    </details>
  );
}

function LibraryTable({
  entries,
  selected,
  onInspect,
  familyLabel,
}: {
  entries: LibraryEntry[];
  selected?: string;
  onInspect: (entry: LibraryEntry) => void;
  familyLabel?: string;
}) {
  const category = entries[0].category;
  const tierOnly = entries.every(
    (entry) => entry.assessmentStatus === "not-applicable",
  );
  const headings = {
    spells: ["Might", "Mana", "CD", "Est. dmg", "Range"],
    enemies: ["Might", "HP", "Mana", "XP"],
    items: tierOnly ? ["Tier", "Kind"] : ["Tier / Might", "Kind / slot"],
    passives: ["Might", "Effect"],
  }[category];
  return (
    <table className="library-table">
      <caption className={familyLabel ? "library-family-heading" : "sr-only"}>
        {familyLabel
          ? tierOnly
            ? familyLabel
            : `${familyLabel} · Might comparison`
          : `${categories[category].name} catalogue`}
      </caption>
      <thead>
        <tr>
          <th scope="col">Name</th>
          {headings.map((heading) => (
            <th scope="col" key={heading}>
              {heading === "CD" ? <abbr title="Cooldown">CD</abbr> : heading}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => {
          const cells =
            category === "spells"
              ? [
                  entry.mana,
                  entry.cooldown,
                  entry.directDamage === undefined
                    ? "—"
                    : Number(entry.directDamage.toFixed(1)),
                  targetingLabel(entry.targeting),
                ]
              : category === "enemies"
                ? [
                    entry.health,
                    entry.stats.find((stat) => stat.label === "Mana")?.value,
                    entry.stats.find((stat) => stat.label === "XP reward")
                      ?.value,
                  ]
                : [category === "items" ? entry.group : entry.description];
          return (
            <tr key={entry.type} data-selected={entry.type === selected}>
              <th scope="row">
                <button
                  type="button"
                  aria-pressed={entry.type === selected}
                  onClick={() => onInspect(entry)}
                >
                  <LibraryIcon entry={entry} />
                  <span>{entry.name}</span>
                </button>
              </th>
              <td>
                <MightBadge entry={entry} />
              </td>
              {cells.map((cell, index) => (
                <td
                  key={headings[index + 1]}
                  className={
                    category === "passives" && index === 0
                      ? "library-effect-cell"
                      : undefined
                  }
                >
                  {cell}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
