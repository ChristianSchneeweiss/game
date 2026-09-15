import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Check, Search, Shield } from "lucide-react";
import {
  EQUIPMENT_SLOTS,
  equipmentSlotLabels,
} from "@loot-game/game/items/equipment/equipment-slots";
import type { EquipmentSlot } from "@loot-game/game/items/equipment/equipment";
import {
  attributeLabel,
  equipmentSlotIcons,
  formatEquipmentModifier,
} from "@/lib/equipment-details";
import type { trpcClient } from "@/utils/trpc";
import { CollectionLoading } from "@/components/collection-ui";
import { InventoryBrowser } from "@/components/inventory-browser";
import { RpgEmptyState } from "@/components/rpg-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EquipmentIcon } from "@/features/expedition/equipment-icon";
import { parseLibrarySearch } from "@/features/library/library-search";
import "./armoury.css";

type OwnedEquipment = Awaited<
  ReturnType<typeof trpcClient.getMyEquipment.query>
>[number];
type ArmouryEntry = OwnedEquipment & { copy: number; copies: number };

const slots = [
  { value: "all" as const, label: "All gear", icon: Shield },
  ...EQUIPMENT_SLOTS.map((value) => ({
    value,
    label: equipmentSlotLabels[value],
    icon: equipmentSlotIcons[value],
  })),
];

export function OwnedArmoury({
  equipment,
  loading,
}: {
  equipment: OwnedEquipment[];
  loading: boolean;
}) {
  const totals = new Map<string, number>();
  const seen = new Map<string, number>();
  for (const entry of equipment)
    totals.set(entry.type, (totals.get(entry.type) ?? 0) + 1);
  const entries = equipment.map((entry) => {
    const copy = (seen.get(entry.type) ?? 0) + 1;
    seen.set(entry.type, copy);
    return { ...entry, copy, copies: totals.get(entry.type) ?? 1 };
  });
  const collections = slots.map((slot) => ({
    ...slot,
    entries: entries.filter(
      (entry) =>
        slot.value === "all" || entry.item.equipmentSlot === slot.value,
    ),
  }));

  return (
    <Tabs defaultValue="all" className="inventory armoury">
      <TabsList aria-label="Equipment slots" className="inventory-tabs">
        {collections.map(({ value, label, icon: Icon, entries }) => (
          <TabsTrigger key={value} value={value}>
            <Icon size={17} /> {label}{" "}
            <span>{loading ? "—" : entries.length}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      {collections.map(({ value, entries }) => (
        <TabsContent key={value} value={value}>
          <EquipmentCollection
            entries={entries}
            loading={loading}
            slot={value}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function EquipmentCollection({
  entries,
  loading,
  slot,
}: {
  entries: ArmouryEntry[];
  loading: boolean;
  slot: EquipmentSlot | "all";
}) {
  if (loading) return <CollectionLoading />;
  if (!entries.length)
    return (
      <RpgEmptyState
        icon={<Shield />}
        title={
          slot === "all"
            ? "The vault is empty"
            : `No ${equipmentSlotLabels[slot].toLowerCase()} collected`
        }
        copy="Explore dungeons to collect equipment for your characters."
        action={
          <Button asChild variant="outline">
            <Link to="/dungeons">
              Explore dungeons <ArrowUpRight size={16} />
            </Link>
          </Button>
        }
      />
    );
  return <EquipmentInventory entries={entries} />;
}

function EquipmentInventory({ entries }: { entries: ArmouryEntry[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [tier, setTier] = useState("all");
  const [sort, setSort] = useState("name");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = entries.filter((entry) => {
    if (tier !== "all" && entry.item.tier !== tier) return false;
    if (status === "available" && entry.equippedBy !== null) return false;
    if (status === "equipped" && entry.equippedBy === null) return false;
    const bonuses = entry.item.modifiers
      .map(
        (modifier) =>
          `${attributeLabel(modifier.attribute)} ${formatEquipmentModifier(modifier)}`,
      )
      .join(" ");
    const text =
      `${entry.item.name} ${entry.item.description} ${bonuses}`.toLowerCase();
    return terms.every((term) => text.includes(term));
  });
  filtered.sort((a, b) => compareEquipment(a, b, sort));
  const selected =
    filtered.find((entry) => entry.id === selectedId) ?? filtered[0];
  const available = entries.filter((entry) => entry.equippedBy === null).length;

  return (
    <div>
      <div className="inventory-toolbar armoury-toolbar">
        <label className="inventory-search">
          <Search size={17} aria-hidden="true" />
          <span className="sr-only">Search your items</span>
          <Input
            type="search"
            placeholder="Search by name or bonus…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className="inventory-sort">
          <span className="sr-only">Equipment tier</span>
          <Select
            value={tier}
            onChange={(event) => setTier(event.target.value)}
          >
            <option value="all">All tiers</option>
            {["E", "D", "C", "B", "A", "S"].map((value) => (
              <option key={value} value={value}>
                Tier {value}
              </option>
            ))}
          </Select>
        </label>
        <label className="inventory-sort">
          <span className="sr-only">Equipment status</span>
          <Select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="available">Available</option>
            <option value="equipped">Equipped</option>
          </Select>
        </label>
        <label className="inventory-sort">
          <span className="sr-only">Sort items</span>
          <Select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="name">Name A–Z</option>
            <option value="tier">Highest tier</option>
            <option value="available">Available first</option>
          </Select>
        </label>
      </div>
      <div className="inventory-index-heading">
        <p role="status">
          {filtered.length} of {entries.length} items{" "}
          <span>· {available} available to equip</span>
        </p>
        <span className="inventory-desktop-hint">Select to inspect</span>
      </div>
      {selected ? (
        <EquipmentResults
          entries={filtered}
          selected={selected}
          onSelect={setSelectedId}
        />
      ) : (
        <RpgEmptyState
          icon={<Search />}
          title="No matching items"
          copy="Try another name, bonus, tier or equipment status."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setQuery("");
                setStatus("all");
                setTier("all");
              }}
            >
              Clear filters
            </Button>
          }
        />
      )}
    </div>
  );
}

function compareEquipment(a: ArmouryEntry, b: ArmouryEntry, sort: string) {
  if (sort === "tier" && a.item.tier !== b.item.tier)
    return "SABCDE".indexOf(a.item.tier) - "SABCDE".indexOf(b.item.tier);
  if (
    sort === "available" &&
    (a.equippedBy === null) !== (b.equippedBy === null)
  )
    return a.equippedBy === null ? -1 : 1;
  return a.item.name.localeCompare(b.item.name) || a.copy - b.copy;
}

function EquipmentResults({
  entries,
  selected,
  onSelect,
}: {
  entries: ArmouryEntry[];
  selected: ArmouryEntry;
  onSelect: (id: string) => void;
}) {
  return (
    <InventoryBrowser
      entries={entries.map((entry) => ({
        id: entry.id,
        title: entry.item.name,
        label: `Inspect ${entry.item.name}, copy ${entry.copy}, ${entry.equippedBy === null ? "available" : "equipped"}`,
        icon: (
          <EquipmentIcon type={entry.type} slot={entry.item.equipmentSlot} />
        ),
        metadata: (
          <>
            <span className="armoury-slot">
              {entry.item.equipmentSlot.toLowerCase()}
            </span>
            <span>Tier {entry.item.tier}</span>
            {entry.copies > 1 && <span>Copy {entry.copy}</span>}
          </>
        ),
        trailing: (
          <span
            className="armoury-status"
            data-equipped={entry.equippedBy !== null}
          >
            {entry.equippedBy !== null && (
              <Check size={12} aria-hidden="true" />
            )}
            {entry.equippedBy === null ? "Available" : "Equipped"}
          </span>
        ),
      }))}
      selectedId={selected.id}
      onSelect={onSelect}
      label="Owned equipment"
      detailLabel="Selected item"
      description="Item description, attribute bonuses and equipment status."
    >
      <EquipmentPage entry={selected} />
    </InventoryBrowser>
  );
}

function EquipmentPage({ entry }: { entry: ArmouryEntry }) {
  return (
    <article
      className="inventory-page armoury-page rpg-reading-surface"
      aria-live="polite"
    >
      <header>
        <span className="inventory-page-eyebrow">
          Equipment · Tier {entry.item.tier}
        </span>
        <EquipmentIcon type={entry.type} slot={entry.item.equipmentSlot} />
        <h2>{entry.item.name}</h2>
        <p>
          {entry.copies > 1
            ? `Copy ${entry.copy} of ${entry.copies} in your collection`
            : "1 copy in your collection"}
        </p>
      </header>
      <dl className="inventory-page-stats armoury-facts">
        <div>
          <dt>Slot</dt>
          <dd className="armoury-slot">
            {entry.item.equipmentSlot.toLowerCase()}
          </dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{entry.equippedBy === null ? "Available" : "Equipped"}</dd>
        </div>
      </dl>
      <p className="inventory-description">{entry.item.description}</p>
      {entry.item.modifiers.length > 0 && (
        <section className="inventory-targeting">
          <h3>Attribute bonuses</h3>
          <dl className="armoury-bonuses">
            {entry.item.modifiers.map((modifier) => (
              <div key={modifier.id}>
                <dt>{attributeLabel(modifier.attribute)}</dt>
                <dd>{formatEquipmentModifier(modifier)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      <footer>
        {entry.equippedBy !== null ? (
          <>
            <p>
              This copy is equipped. Manage it from its character’s loadout.
            </p>
            <Link
              to="/characters/$character-id"
              params={{ "character-id": entry.equippedBy }}
            >
              View equipped character <ArrowUpRight size={16} />
            </Link>
          </>
        ) : (
          <>
            <p>This copy is ready to equip from a character’s loadout.</p>
            <Link to="/characters">
              Choose a character <ArrowUpRight size={16} />
            </Link>
          </>
        )}
        <Link
          to="/library"
          search={parseLibrarySearch({ category: "items", entry: entry.type })}
        >
          View in Library <ArrowUpRight size={16} />
        </Link>
      </footer>
    </article>
  );
}
