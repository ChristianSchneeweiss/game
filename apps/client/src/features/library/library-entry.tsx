import { SkillIcon } from "@/components/skill-icon";
import { EquipmentIcon } from "@/features/expedition/equipment-icon";
import { libraryName } from "@loot-game/game/library/catalog";
import type {
  LibraryEntry,
  LibraryReference,
} from "@loot-game/game/library/types";
import type { Targeting } from "@loot-game/game/tactical/types";
import { ArrowUpRight, Skull } from "lucide-react";
import { targetingLabel } from "./library-format";
import { MightBadge } from "./library-might";
import { mightFamilyLabel } from "@loot-game/game/might/might";

const assessmentDescriptions = {
  unrated: " No Might assessment yet; this does not mean zero power.",
  estimated: " Estimated: a provisional assessment under standard conditions.",
  assessed: " Assessed under standard conditions.",
};

export function LibraryIcon({
  entry,
  size = 40,
}: {
  entry: LibraryReference;
  size?: number;
}) {
  if (entry.category === "spells" || entry.category === "passives") {
    return <SkillIcon type={entry.type} size={size} />;
  }
  return (
    <span className="library-symbol" style={{ width: size, height: size }}>
      {entry.category === "items" ? (
        <EquipmentIcon type={entry.type} />
      ) : (
        <Skull size={size * 0.5} />
      )}
    </span>
  );
}

function TargetingDiagram({ targeting }: { targeting: Targeting }) {
  if (targeting.aim === "global")
    return (
      <p className="library-note">
        Affects {targeting.recipients} across the battlefield.
      </p>
    );
  const tiles = new Set(targeting.affectedTiles.map(([x, y]) => `${x},${y}`));
  return (
    <div className="library-targeting">
      <div
        className="library-footprint"
        role="img"
        aria-label={`${targeting.affectedTiles.length} affected tiles; ${targeting.aim === "tile" ? "relative to the selected tile" : "relative to the caster"}`}
      >
        {Array.from({ length: 49 }, (_, index) => {
          const x = (index % 7) - 3;
          const y = Math.floor(index / 7) - 3;
          return (
            <span
              key={`${x},${y}`}
              data-affected={tiles.has(`${x},${y}`)}
              data-origin={x === 0 && y === 0}
            />
          );
        })}
      </div>
      <div>
        <strong>{targetingLabel(targeting)}</strong>
        <p>
          {targeting.affectedTiles.length} affected{" "}
          {targeting.affectedTiles.length === 1 ? "tile" : "tiles"} ·{" "}
          {targeting.recipients}
        </p>
        <small>
          Gold = affected · dot ={" "}
          {targeting.aim === "tile" ? "selected tile" : "caster"}
          {targeting.aim === "direction" ? ". Facing north." : "."}
        </small>
      </div>
    </div>
  );
}

export function LibraryDetail({
  entry,
  entries,
  onInspect,
}: {
  entry: LibraryEntry;
  entries: LibraryEntry[];
  onInspect: (reference: LibraryReference) => void;
}) {
  const byKey = new Map(
    entries.map((item) => [`${item.category}:${item.type}`, item]),
  );
  const usedBy = entries.filter((item) =>
    item.related.some(
      (reference) =>
        reference.category === entry.category && reference.type === entry.type,
    ),
  );
  const droppedBy = entries.flatMap((item) =>
    (item.drops ?? [])
      .filter(
        (drop) => drop.category === entry.category && drop.type === entry.type,
      )
      .map((drop) => ({ entry: item, chance: drop.chance })),
  );
  const referenceButton = (reference: LibraryReference, suffix?: string) => {
    const related = byKey.get(`${reference.category}:${reference.type}`);
    return (
      <button
        type="button"
        className="library-reference"
        key={`${reference.category}:${reference.type}`}
        onClick={() => onInspect(reference)}
      >
        <LibraryIcon entry={reference} size={28} />
        <span>
          {related?.name ?? libraryName(reference.type)}
          {related ? <MightBadge entry={related} /> : null}
        </span>
        {suffix ? <small>{suffix}</small> : <ArrowUpRight size={14} />}
      </button>
    );
  };
  return (
    <aside
      className="library-detail"
      aria-label="Entry details"
      aria-live="polite"
    >
      <div className="library-detail-heading">
        <LibraryIcon entry={entry} size={64} />
        <div>
          <p className="library-eyebrow">
            {
              {
                spells: "Spell",
                items: "Item",
                passives: "Passive skill",
                enemies: "Enemy",
              }[entry.category]
            }
          </p>
          <h2>{entry.name}</h2>
          <MightBadge entry={entry} />
        </div>
      </div>
      <p className="library-note">
        Comparison family: <strong>{mightFamilyLabel(entry.family)}</strong>.
        {assessmentDescriptions[entry.assessmentStatus]}
      </p>
      {entry.legacyTier ? (
        <p className="library-note">Legacy tier {entry.legacyTier}</p>
      ) : null}
      <p className="library-description">{entry.description}</p>
      <section className="library-detail-section">
        <h3>
          {entry.category === "enemies" ? "Base stats" : "Numbers & rules"}
        </h3>
        <dl className="library-stats">
          {entry.stats.map((stat) => (
            <div key={stat.label}>
              <dt>{stat.label}</dt>
              <dd>{stat.value}</dd>
            </div>
          ))}
        </dl>
        {entry.category === "spells" ? (
          <p className="library-note">
            Damage assumes one enemy and uses the preview attributes, without
            capping damage at remaining health. It excludes damage over time and
            reactive effects; conditional and delayed spells need their
            description for context. Cooldowns count down at the caster’s end
            step.
          </p>
        ) : null}
      </section>
      {entry.targeting ? (
        <section className="library-detail-section">
          <h3>
            Targeting{entry.category === "items" ? " · Basic Attack" : ""}
          </h3>
          <TargetingDiagram targeting={entry.targeting} />
        </section>
      ) : null}
      {entry.related.length ? (
        <section className="library-detail-section">
          <h3>
            {entry.category === "enemies" ? "Combat kit" : "Related entries"}
          </h3>
          {entry.related.map((reference) => referenceButton(reference))}
        </section>
      ) : null}
      {entry.drops ? (
        <section className="library-detail-section">
          <h3>Possible drops</h3>
          {entry.drops.length ? (
            entry.drops.map((drop) =>
              referenceButton(drop, `${formatChance(drop.chance)}%`),
            )
          ) : (
            <p className="library-note">No item or spell drops configured.</p>
          )}
        </section>
      ) : null}
      {usedBy.length ? (
        <section className="library-detail-section">
          <h3>Used by</h3>
          {usedBy.map((item) => referenceButton(item))}
        </section>
      ) : null}
      {droppedBy.length ? (
        <section className="library-detail-section">
          <h3>Drops from</h3>
          {droppedBy.map(({ entry: source, chance }) =>
            referenceButton(source, `${formatChance(chance)}%`),
          )}
        </section>
      ) : null}
      <p className="library-entry-id">{entry.type}</p>
    </aside>
  );
}

function formatChance(chance: number) {
  return Number((chance * 100).toFixed(2));
}
