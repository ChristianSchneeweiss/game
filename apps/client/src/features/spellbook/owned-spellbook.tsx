import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, BookOpen, Search, Shield, Sparkles } from "lucide-react";
import { SkillIcon } from "@/components/skill-icon";
import { CollectionLoading } from "@/components/collection-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InventoryBrowser } from "@/components/inventory-browser";
import { RpgEmptyState } from "@/components/rpg-ui";
import { parseLibrarySearch } from "@/features/library/library-search";

export type OwnedSkill = {
  type: string;
  name: string;
  description: string;
  count: number;
  category: "spells" | "passives";
  mana?: number;
  cooldown?: number;
  targeting?: string;
};

export function OwnedSpellbook({
  spells,
  passives,
  loadingSpells,
  loadingPassives,
}: {
  spells: OwnedSkill[];
  passives: OwnedSkill[];
  loadingSpells: boolean;
  loadingPassives: boolean;
}) {
  return (
    <Tabs defaultValue="spells" className="inventory">
      <TabsList aria-label="Your skill collections" className="inventory-tabs">
        <TabsTrigger value="spells">
          <Sparkles size={17} /> Spells{" "}
          <span>{loadingSpells ? "—" : spells.length}</span>
        </TabsTrigger>
        <TabsTrigger value="passives">
          <Shield size={17} /> Passive skills{" "}
          <span>{loadingPassives ? "—" : passives.length}</span>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="spells">
        <SkillCollection
          entries={spells}
          loading={loadingSpells}
          category="spells"
        />
      </TabsContent>
      <TabsContent value="passives">
        <SkillCollection
          entries={passives}
          loading={loadingPassives}
          category="passives"
        />
      </TabsContent>
    </Tabs>
  );
}

function SkillCollection({
  entries,
  loading,
  category,
}: {
  entries: OwnedSkill[];
  loading: boolean;
  category: OwnedSkill["category"];
}) {
  if (loading) return <CollectionLoading />;
  if (!entries.length)
    return (
      <RpgEmptyState
        icon={category === "spells" ? <Sparkles /> : <Shield />}
        title={
          category === "spells"
            ? "Your spellbook is empty"
            : "No passive skills archived"
        }
        copy={
          category === "spells"
            ? "Collect spells from battle rewards, then equip them from a character’s loadout. Basic Attack is always available."
            : "Passive skills earned in battle appear here. Equip them from a character’s loadout."
        }
      />
    );
  return <SkillInventory entries={entries} category={category} />;
}

function SkillInventory({
  entries,
  category,
}: {
  entries: OwnedSkill[];
  category: OwnedSkill["category"];
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("name");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = entries.filter((entry) =>
    terms.every((term) =>
      `${entry.name} ${entry.description}`.toLowerCase().includes(term),
    ),
  );
  filtered.sort((a, b) => compareSkills(a, b, sort));
  const selected =
    filtered.find((entry) => entry.type === selectedType) ?? filtered[0];
  const copies = entries.reduce((total, entry) => total + entry.count, 0);

  return (
    <div className="inventory-collection">
      <div className="inventory-toolbar">
        <label className="inventory-search">
          <Search size={17} aria-hidden="true" />
          <span className="sr-only">
            Search your {category === "spells" ? "spells" : "passive skills"}
          </span>
          <Input
            type="search"
            placeholder="Search by name or effect…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className="inventory-sort">
          <span className="sr-only">Sort skills</span>
          <Select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="name">Name A–Z</option>
            {category === "spells" && <option value="mana">Lowest mana</option>}
            <option value="copies">Most copies</option>
          </Select>
        </label>
      </div>
      <div className="inventory-index-heading">
        <p role="status">
          {query.trim()
            ? `${filtered.length} of ${entries.length} inscriptions`
            : `${entries.length} unique ${category === "spells" ? "spells" : "passive skills"}`}{" "}
          <span>
            · {copies} {copies === 1 ? "copy" : "copies"} owned
          </span>
        </p>
        <span className="inventory-desktop-hint">Select to read</span>
      </div>
      {!selected ? (
        <RpgEmptyState
          icon={<Search />}
          title="No matching skills"
          copy="Try another name or effect."
          action={
            <Button variant="outline" onClick={() => setQuery("")}>
              Clear search
            </Button>
          }
        />
      ) : (
        <SkillResults
          entries={filtered}
          selected={selected}
          onSelect={setSelectedType}
        />
      )}
    </div>
  );
}

function SkillResults({
  entries,
  selected,
  onSelect,
}: {
  entries: OwnedSkill[];
  selected: OwnedSkill;
  onSelect: (type: string) => void;
}) {
  return (
    <InventoryBrowser
      entries={entries.map((entry) => ({
        id: entry.type,
        title: entry.name,
        icon: <SkillIcon type={entry.type} size={44} />,
        metadata:
          entry.category === "spells" ? (
            <>
              <span>{entry.mana} mana</span>
              <span>{entry.cooldown} cooldown</span>
            </>
          ) : (
            "Passive skill"
          ),
        trailing: (
          <span
            className="inventory-quantity"
            aria-label={`${entry.count} ${entry.count === 1 ? "copy" : "copies"} owned`}
          >
            ×{entry.count}
          </span>
        ),
      }))}
      selectedId={selected.type}
      onSelect={onSelect}
      label="Owned skills"
      detailLabel="Selected skill"
      description="Skill description and owned quantity."
    >
      <SkillPage entry={selected} />
    </InventoryBrowser>
  );
}

function compareSkills(a: OwnedSkill, b: OwnedSkill, sort: string) {
  if (sort === "copies" && a.count !== b.count) return b.count - a.count;
  if (sort === "mana" && a.mana !== b.mana)
    return (a.mana ?? 0) - (b.mana ?? 0);
  return a.name.localeCompare(b.name);
}

function SkillPage({ entry }: { entry: OwnedSkill }) {
  return (
    <article className="inventory-page rpg-reading-surface" aria-live="polite">
      <header>
        <span className="inventory-page-eyebrow">
          <BookOpen size={14} />{" "}
          {entry.category === "spells"
            ? "Spell inscription"
            : "Passive inscription"}
        </span>
        <SkillIcon type={entry.type} size={64} eager />
        <h2>{entry.name}</h2>
        <p>
          {entry.count} {entry.count === 1 ? "copy" : "copies"} in your
          collection
        </p>
      </header>
      {entry.category === "spells" && (
        <dl className="inventory-page-stats">
          <div>
            <dt>Mana cost</dt>
            <dd>{entry.mana}</dd>
          </div>
          <div>
            <dt>Cooldown</dt>
            <dd>{entry.cooldown}</dd>
          </div>
        </dl>
      )}
      <p className="inventory-description">{entry.description}</p>
      {entry.targeting && (
        <section className="inventory-targeting">
          <h3>Targeting</h3>
          <p>{entry.targeting}</p>
        </section>
      )}
      <footer>
        <p>
          Equip {entry.category === "spells" ? "spells" : "passive skills"} from
          a character’s loadout.
        </p>
        <Link
          to="/library"
          search={parseLibrarySearch({
            category: entry.category,
            entry: entry.type,
          })}
        >
          View in Library <ArrowUpRight size={16} />
        </Link>
      </footer>
    </article>
  );
}
