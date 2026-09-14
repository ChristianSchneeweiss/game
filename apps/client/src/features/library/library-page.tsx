import { useMemo, useState } from "react";
import {
  BookOpen,
  Search,
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
import {
  filterLibrary,
  libraryCategories,
  libraryTiers,
  parseLibrarySearch,
  type LibrarySearch,
} from "./library-search";
import "./library.css";

const staticEntries = [
  ...createItemLibrary(),
  ...createPassiveLibrary(),
  ...createEnemyLibrary(),
];
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
      "Every piece of equipment, its modifiers, and its attack profile.",
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
  const [attributes, setAttributes] = useState<LibraryAttributes>(
    DEFAULT_LIBRARY_ATTRIBUTES,
  );
  const spells = useMemo(() => createSpellLibrary(attributes), [attributes]);
  const entries = useMemo(() => [...spells, ...staticEntries], [spells]);
  const categoryEntries = entries.filter(
    (entry) => entry.category === search.category,
  );
  const groups = [...new Set(categoryEntries.map((entry) => entry.group))];
  const filtered = filterLibrary(entries, search);
  const selected =
    filtered.find((entry) => entry.type === search.entry) ?? filtered[0];
  const currentCategory = categories[search.category];
  const change = (patch: Partial<LibrarySearch>) =>
    onSearchChange({ ...search, ...patch });
  const inspect = (reference: LibraryReference) =>
    onSearchChange({
      ...parseLibrarySearch({ category: reference.category }),
      entry: reference.type,
    });
  const isFiltered =
    search.q !== "" || search.tier !== "all" || search.group !== "all";

  return (
    <main className="rpg-page library-page">
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
            </div>
            <div className="library-toolbar">
              <label className="library-search">
                <Search size={17} />
                <span className="sr-only">Search library</span>
                <input
                  type="search"
                  placeholder={`Search ${currentCategory.name.toLowerCase()}…`}
                  value={search.q}
                  onChange={(event) =>
                    change({ q: event.target.value, entry: "" })
                  }
                />
              </label>
              {search.category !== "enemies" ? (
                <label>
                  <span>Tier</span>
                  <select
                    aria-label="Filter by tier"
                    value={search.tier}
                    onChange={(event) =>
                      change({ tier: event.target.value, entry: "" })
                    }
                  >
                    <option value="all">All tiers</option>
                    {libraryTiers.map((tier) => (
                      <option key={tier} value={tier}>
                        Tier {tier}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {groups.length > 1 ? (
                <label>
                  <span>
                    {search.category === "spells" ? "Recipients" : "Slot"}
                  </span>
                  <select
                    aria-label="Filter by type"
                    value={search.group}
                    onChange={(event) =>
                      change({ group: event.target.value, entry: "" })
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
                    change({
                      sort: parseLibrarySearch({
                        category: search.category,
                        sort: event.target.value,
                      }).sort,
                    })
                  }
                >
                  <option value="name">Name A–Z</option>
                  {search.category !== "enemies" ? (
                    <option value="tier">Tier S–E</option>
                  ) : (
                    <option value="health">Health: high first</option>
                  )}
                  {search.category === "spells" ? (
                    <>
                      <option value="mana">Mana: low first</option>
                      <option value="cooldown">Cooldown: low first</option>
                      <option value="directDamage">
                        Est. damage: high first
                      </option>
                    </>
                  ) : null}
                </select>
              </label>
            </div>
            {search.category === "spells" ? (
              <details className="library-preview">
                <summary>
                  <SlidersHorizontal size={16} /> Preview attributes{" "}
                  <span>
                    STR {attributes.strength} · INT {attributes.intelligence} ·
                    VIT {attributes.vitality} · AGI {attributes.agility}
                  </span>
                </summary>
                <p>
                  Adjust the hero and target attributes to compare spell
                  scaling. Both have 100/100 health, zero defenses and
                  affinities, and no passives. Basic Attack uses the unarmed
                  profile.
                </p>
                <div className="library-attributes">
                  {(
                    Object.keys(
                      DEFAULT_LIBRARY_ATTRIBUTES,
                    ) as (keyof LibraryAttributes)[]
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
                          setAttributes((previous) => ({
                            ...previous,
                            [attribute]: Number.isFinite(value)
                              ? Math.max(0, Math.min(500, Math.round(value)))
                              : 0,
                          }));
                        }}
                      />
                    </label>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setAttributes({ ...DEFAULT_LIBRARY_ATTRIBUTES })
                    }
                  >
                    Reset
                  </button>
                </div>
              </details>
            ) : null}
            <div className="library-results">
              <span role="status">
                {filtered.length} of {categoryEntries.length} entries
              </span>
              {isFiltered ? (
                <button
                  type="button"
                  onClick={() =>
                    change({ q: "", tier: "all", group: "all", entry: "" })
                  }
                >
                  Clear filters
                </button>
              ) : (
                <span>Select an entry to inspect</span>
              )}
            </div>
            <div className="library-content">
              <div className="library-list">
                {filtered.length ? (
                  <LibraryTable
                    entries={filtered}
                    selected={selected?.type}
                    onInspect={(entry) => change({ entry: entry.type })}
                  />
                ) : (
                  <div className="library-empty">
                    <BookOpen size={32} />
                    <h3>No matching entries</h3>
                    <p>Try another name, effect, or tier.</p>
                    <button
                      type="button"
                      onClick={() =>
                        change({ q: "", tier: "all", group: "all", entry: "" })
                      }
                    >
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

function LibraryTable({
  entries,
  selected,
  onInspect,
}: {
  entries: LibraryEntry[];
  selected?: string;
  onInspect: (entry: LibraryEntry) => void;
}) {
  const category = entries[0].category;
  const headings =
    category === "spells"
      ? ["Tier", "Mana", "CD", "Est. dmg", "Range"]
      : category === "enemies"
        ? ["HP", "Mana", "XP"]
        : ["Tier", category === "items" ? "Slot" : "Effect"];
  return (
    <table className="library-table">
      <caption className="sr-only">
        {categories[category].name} catalogue
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
                  entry.tier,
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
                : [
                    entry.tier,
                    category === "items" ? entry.group : entry.description,
                  ];
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
              {cells.map((cell, index) => (
                <td
                  key={headings[index]}
                  className={
                    category === "passives" && index === 1
                      ? "library-effect-cell"
                      : undefined
                  }
                >
                  {index === 0 && entry.tier ? (
                    <span className="library-tier" data-tier={entry.tier}>
                      {cell}
                    </span>
                  ) : (
                    cell
                  )}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
