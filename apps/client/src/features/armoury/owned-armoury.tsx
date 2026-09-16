import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Search, Shield } from "lucide-react";
import {
  consumableContextLabel,
  getItemDefinition,
  type ItemKind,
  type ItemDefinition,
} from "@loot-game/game/items/catalog";
import {
  EQUIPMENT_SLOTS,
  equipmentSlotLabels,
} from "@loot-game/game/items/equipment/equipment-slots";
import {
  attributeLabel,
  formatEquipmentModifier,
} from "@/lib/equipment-details";
import type { trpcClient } from "@/utils/trpc";
import { CollectionLoading } from "@/components/collection-ui";
import { InventoryBrowser } from "@/components/inventory-browser";
import { ItemIcon } from "@/components/item-icon";
import { RpgEmptyState } from "@/components/rpg-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parseLibrarySearch } from "@/features/library/library-search";
import "./armoury.css";

import {
  inventoryEntries,
  filterInventory,
  type OwnedItem,
  type CollectionEntry,
  type InventoryFilters,
} from "./inventory-query";
const kinds = [
  { value: "all", label: "All items" },
  { value: "equipment", label: "Equipment" },
  { value: "consumable", label: "Consumables" },
  { value: "material", label: "Materials" },
] as const;
const kindLabels: Record<ItemKind, string> = {
  equipment: "Equipment",
  consumable: "Consumable",
  material: "Material",
};

/** Compatibility for the isolated gear preview. Live inventory uses the account read. */
export function OwnedArmoury({
  equipment,
  loading,
}: {
  equipment: Awaited<ReturnType<typeof trpcClient.getMyEquipment.query>>;
  loading: boolean;
}) {
  const items = equipment.map((row): OwnedItem => {
    const item = getItemDefinition(row.type);
    if (item.kind !== "equipment") throw new Error("Invalid equipment");
    return {
      kind: "equipment",
      type: row.type,
      id: row.id,
      quantity: 1,
      equippedBy: row.equippedBy,
      equippedCharacterName: null,
      item,
    };
  });
  return <OwnedInventory items={items} loading={loading} />;
}

export function OwnedInventory({
  items,
  loading,
  error,
  onRetry,
  renderConsumableAction,
}: {
  items: OwnedItem[];
  loading: boolean;
  error?: boolean;
  onRetry?: () => void;
  renderConsumableAction?: (
    item: Extract<ItemDefinition, { kind: "consumable" }>,
  ) => ReactNode;
}) {
  const [filters, setFilters] = useState<InventoryFilters>({
    kind: "all",
    query: "",
    status: "all",
    slot: "all",
    tier: "all",
    sort: "name",
  });
  const { kind } = filters;
  const changeFilters = (patch: Partial<InventoryFilters>) =>
    setFilters((current) => ({ ...current, ...patch }));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const filtered = filterInventory(inventoryEntries(items), filters);
  const selected =
    filtered.find((entry) => entry.id === selectedId) ?? filtered[0];
  const clear = () =>
    changeFilters({
      kind: "all",
      query: "",
      status: "all",
      slot: "all",
      tier: "all",
    });

  if (error)
    return (
      <div role="alert">
        <RpgEmptyState
          icon={<Shield />}
          title="Could not load your inventory"
          copy="Your collection is unavailable. Try loading it again."
          action={
            <Button variant="outline" onClick={onRetry}>
              Retry
            </Button>
          }
        />
      </div>
    );
  return (
    <div className="inventory armoury">
      <Tabs value={kind} onValueChange={(kind) => changeFilters({ kind })}>
        <TabsList aria-label="Item kinds" className="inventory-tabs">
          {kinds.map(({ value, label }) => (
            <TabsTrigger key={value} value={value}>
              {label}{" "}
              <span>
                {loading
                  ? "—"
                  : items.filter(
                      (entry) => value === "all" || entry.kind === value,
                    ).length}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={kind}>
          {loading ? (
            <CollectionLoading />
          ) : (
            <>
              <InventoryToolbar filters={filters} onChange={changeFilters} />
              <div className="inventory-index-heading">
                <p role="status">
                  {filtered.length} of {items.length} entries
                </p>
                <span className="inventory-desktop-hint">
                  Select to inspect
                </span>
              </div>
              {selected ? (
                <InventoryBrowser
                  entries={filtered.map(inventoryRow)}
                  selectedId={selected.id}
                  onSelect={setSelectedId}
                  label="Owned items"
                  detailLabel="Selected item"
                  description="Item description, tier, quantity and properties."
                >
                  <ItemPage
                    entry={selected}
                    consumableAction={
                      selected.item.kind === "consumable"
                        ? renderConsumableAction?.(selected.item)
                        : undefined
                    }
                  />
                </InventoryBrowser>
              ) : (
                <RpgEmptyState
                  icon={<Shield />}
                  title={
                    items.length ? "No matching items" : "The vault is empty"
                  }
                  copy={
                    items.length
                      ? "Try another kind, name, tier or equipment status."
                      : "Explore dungeons to collect items for your account."
                  }
                  action={
                    items.length ? (
                      <Button variant="outline" onClick={clear}>
                        Clear filters
                      </Button>
                    ) : (
                      <Button asChild variant="outline">
                        <Link to="/dungeons">
                          Explore dungeons <ArrowUpRight size={16} />
                        </Link>
                      </Button>
                    )
                  }
                />
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ItemPage({
  entry,
  consumableAction,
}: {
  entry: CollectionEntry;
  consumableAction?: ReactNode;
}) {
  return (
    <article
      className="inventory-page armoury-page rpg-reading-surface"
      aria-live="polite"
    >
      <header>
        <span className="inventory-page-eyebrow">
          {kindLabels[entry.kind]} · Tier {entry.item.tier}
        </span>
        <ItemIcon type={entry.type} />
        <h2>{entry.item.name}</h2>
        <p>
          {entry.kind === "equipment"
            ? `Copy ${entry.copy} of ${entry.copies} in your collection`
            : `Quantity: ${entry.quantity}`}
        </p>
      </header>
      {entry.kind === "equipment" && (
        <dl className="inventory-page-stats armoury-facts">
          <div>
            <dt>Slot</dt>
            <dd>{equipmentSlotLabels[entry.item.equipmentSlot]}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>
              {entry.equippedBy === null
                ? "Available"
                : `Equipped${entry.equippedCharacterName ? ` by ${entry.equippedCharacterName}` : ""}`}
            </dd>
          </div>
        </dl>
      )}
      <p className="inventory-description">{entry.item.description}</p>
      {entry.item.kind === "equipment" && (
        <section className="inventory-targeting">
          <h3>Attribute bonuses</h3>
          <dl className="armoury-bonuses">
            {entry.item.bonuses.map((bonus) => (
              <div key={bonus.attribute}>
                <dt>{attributeLabel(bonus.attribute)}</dt>
                <dd>
                  {formatEquipmentModifier({ ...bonus, operation: "ADD" })}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {entry.item.kind === "consumable" && (
        <section className="inventory-targeting">
          <h3>Use contexts</h3>
          <ul>
            {entry.item.useContexts.map((context) => (
              <li key={context}>{consumableContextLabel(context)}</li>
            ))}
          </ul>
        </section>
      )}
      {consumableAction}
      <footer>
        {entry.kind === "consumable" && (
          <Link to="/characters">
            Equip battle supplies on a character <ArrowUpRight size={16} />
          </Link>
        )}
        {entry.kind === "equipment" &&
          (entry.equippedBy !== null ? (
            <>
              <p>Manage this copy from its character’s loadout.</p>
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
          ))}
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

function inventoryRow(entry: CollectionEntry) {
  return {
    id: entry.id,
    title: entry.item.name,
    label: `Inspect ${entry.item.name}, ${entry.kind === "equipment" ? `copy ${entry.copy}, ${entry.equippedBy === null ? "available" : "equipped"}` : `quantity ${entry.quantity}`}`,
    icon: <ItemIcon type={entry.type} />,
    metadata: (
      <>
        <span className="armoury-slot">
          {entry.item.kind === "equipment"
            ? entry.item.equipmentSlot.toLowerCase()
            : kindLabels[entry.kind]}
        </span>
        <span>Tier {entry.item.tier}</span>
        {entry.kind === "equipment" && entry.copies > 1 && (
          <span>Copy {entry.copy}</span>
        )}
      </>
    ),
    trailing: (
      <span
        className="armoury-status"
        data-equipped={entry.kind === "equipment" && entry.equippedBy !== null}
      >
        {entry.kind === "equipment"
          ? entry.equippedBy === null
            ? "Available"
            : "Equipped"
          : `×${entry.quantity}`}
      </span>
    ),
  };
}

function InventoryToolbar({
  filters,
  onChange,
}: {
  filters: InventoryFilters;
  onChange: (patch: Partial<InventoryFilters>) => void;
}) {
  const { kind, query, status, slot, tier, sort } = filters;
  return (
    <div className="inventory-toolbar armoury-toolbar">
      <label className="inventory-search">
        <Search size={17} aria-hidden="true" />
        <span className="sr-only">Search your items</span>
        <Input
          type="search"
          placeholder="Search by name or bonus…"
          value={query}
          onChange={(event) => onChange({ query: event.target.value })}
        />
      </label>
      <label className="inventory-sort">
        <span className="sr-only">Item tier</span>
        <Select
          aria-label="Item tier"
          value={tier}
          onChange={(event) => onChange({ tier: event.target.value })}
        >
          <option value="all">All tiers</option>
          {["E", "D", "C", "B", "A", "S"].map((value) => (
            <option key={value} value={value}>
              Tier {value}
            </option>
          ))}
        </Select>
      </label>
      {kind === "equipment" && (
        <>
          <label className="inventory-sort">
            <span className="sr-only">Equipment slot</span>
            <Select
              aria-label="Equipment slot"
              value={slot}
              onChange={(event) => onChange({ slot: event.target.value })}
            >
              <option value="all">All slots</option>
              {EQUIPMENT_SLOTS.map((value) => (
                <option key={value} value={value}>
                  {equipmentSlotLabels[value]}
                </option>
              ))}
            </Select>
          </label>
          <label className="inventory-sort">
            <span className="sr-only">Equipment status</span>
            <Select
              aria-label="Equipment status"
              value={status}
              onChange={(event) => onChange({ status: event.target.value })}
            >
              <option value="all">All statuses</option>
              <option value="available">Available</option>
              <option value="equipped">Equipped</option>
            </Select>
          </label>
        </>
      )}
      <label className="inventory-sort">
        <span className="sr-only">Sort items</span>
        <Select
          aria-label="Sort items"
          value={sort === "available" && kind !== "equipment" ? "name" : sort}
          onChange={(event) => onChange({ sort: event.target.value })}
        >
          <option value="name">Name A–Z</option>
          <option value="tier">Highest tier</option>
          {kind === "equipment" && (
            <option value="available">Available first</option>
          )}
        </Select>
      </label>
    </div>
  );
}
