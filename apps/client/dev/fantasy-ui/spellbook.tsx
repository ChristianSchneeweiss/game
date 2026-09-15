import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bookmark,
  Check,
  Feather,
  Flame,
  Search,
  Shield,
  Sparkles,
  Waves,
  Zap,
} from "lucide-react";
import { FantasyButton, Ornament, TierBadge, spells } from "./primitives";
import type { Spell } from "./primitives";

const affinities = [
  { name: "All", icon: BookOpen },
  { name: "Fire", icon: Flame },
  { name: "Earth", icon: Shield },
  { name: "Lightning", icon: Zap },
  { name: "Water", icon: Waves },
] as const;

const inscriptions: Record<
  Spell["id"],
  { color: string; note: string; use: string }
> = {
  fireball: {
    color: "#a85c32",
    note: "The flame obeys only those who know what they are willing to burn.",
    use: "Offensive spell · Enemy target",
  },
  "aegis-wall": {
    color: "#617251",
    note: "Stand as the mountain stands. Let the storm spend itself against you.",
    use: "Defensive spell · Protective barrier",
  },
  "lightning-surge": {
    color: "#8c7634",
    note: "Thunder is merely the sky remembering where the lightning has been.",
    use: "Offensive spell · Lightning affinity",
  },
  "single-heal": {
    color: "#527f89",
    note: "There is a tide within all living things. Learn its rhythm, and mend what is broken.",
    use: "Restorative spell · Ally target",
  },
};

export function BookSpread({
  contents,
  entry,
}: {
  contents: ReactNode;
  entry: ReactNode;
}) {
  return (
    <div className="grimoire-cover">
      <div className="grimoire-spread">
        <section className="grimoire-contents">{contents}</section>
        <div className="grimoire-binding" aria-hidden="true" />
        <section className="grimoire-entry">{entry}</section>
      </div>
    </div>
  );
}

function SpellIllumination({ spell }: { spell: Spell }) {
  return (
    <div
      className="spell-illumination"
      style={{ "--spell-ink": inscriptions[spell.id].color } as CSSProperties}
    >
      <svg viewBox="0 0 240 220" fill="none" aria-hidden="true">
        <circle cx="120" cy="110" r="96" />
        <circle cx="120" cy="110" r="86" strokeDasharray="1 7" />
        <circle cx="120" cy="110" r="72" />
        <path d="m120 4 6 10-6 10-6-10ZM120 196l6 10-6 10-6-10ZM14 104l10 6-10 6-10-6ZM216 104l10 6-10 6-10-6Z" />
        <path d="m52 42 18 6-22 22ZM188 42l-18 6 22 22ZM52 178l18-6-22-22ZM188 178l-18-6 22-22Z" />
        <path d="M120 25v12m0 146v12M35 110h12m146 0h12" />
      </svg>
      <img
        src={`/icons/skills/v1/${spell.id}.webp`}
        alt={`${spell.name} spell illustration`}
      />
      <span className="illumination-seal">
        <TierBadge tier={spell.tier} />
      </span>
    </div>
  );
}

export function Spellbook() {
  const [affinity, setAffinity] = useState("All");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<Spell["id"]>("fireball");
  const [bookmarks, setBookmarks] = useState<Set<Spell["id"]>>(() => new Set());
  const visible = spells.filter(
    (spell) =>
      (affinity === "All" || spell.affinity === affinity) &&
      spell.name.toLowerCase().includes(query.toLowerCase()),
  );
  const selected =
    visible.find((spell) => spell.id === selectedId) ?? visible[0];
  const selectedIndex = selected ? spells.indexOf(selected) : -1;
  const visibleIndex = selected ? visible.indexOf(selected) : -1;
  const bookmarked = selected ? bookmarks.has(selected.id) : false;
  function turnPage(direction: -1 | 1) {
    const next = visible[visibleIndex + direction];
    if (next) setSelectedId(next.id);
  }
  function toggleBookmark() {
    if (!selected) return;
    setBookmarks((current) => {
      const next = new Set(current);
      if (next.has(selected.id)) next.delete(selected.id);
      else next.add(selected.id);
      return next;
    });
  }

  return (
    <div className="spellbook-screen">
      <header className="spellbook-intro">
        <div>
          <p className="f-eyebrow">The collected arts</p>
          <h1>Your grimoire.</h1>
          <p>Power is discovered. Mastery is written.</p>
        </div>
        <div className="grimoire-volume">
          <Feather size={29} strokeWidth={1} />
          <span>VOLUME I</span>
          <small>4 inscriptions</small>
        </div>
      </header>
      <div className="spellbook-toolbar">
        <div
          className="grimoire-affinities"
          role="group"
          aria-label="Filter by affinity"
        >
          {affinities.map((item) => (
            <button
              key={item.name}
              aria-pressed={affinity === item.name}
              onClick={() => setAffinity(item.name)}
            >
              <item.icon size={14} aria-hidden="true" />
              <span>
                {item.name === "All" ? "All inscriptions" : item.name}
              </span>
            </button>
          ))}
        </div>
        <label className="grimoire-search">
          <Search size={15} aria-hidden="true" />
          <span className="f-sr-only">Search the spellbook</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find an inscription…"
          />
        </label>
      </div>
      <BookSpread
        contents={
          <>
            <div className="grimoire-folio">
              <span>THE WANDERER’S COLLECTION</span>
              <Feather size={17} aria-hidden="true" />
            </div>
            <h2>A catalogue of wonders</h2>
            <p className="grimoire-preface">
              What you carry in these pages
              <br />
              may change the course of your journey.
            </p>
            <Ornament />
            <div
              className="grimoire-index"
              role="group"
              aria-label="Spell inscriptions"
            >
              {visible.map((spell) => (
                <button
                  className="grimoire-index-entry"
                  key={spell.id}
                  aria-pressed={selected?.id === spell.id}
                  onClick={() => setSelectedId(spell.id)}
                >
                  <span className="grimoire-index-art">
                    <img src={`/icons/skills/v1/${spell.id}.webp`} alt="" />
                    <TierBadge tier={spell.tier} />
                  </span>
                  <span className="grimoire-index-copy">
                    <strong>{spell.name}</strong>
                    <span>
                      {spell.affinity} <i>·</i> {spell.mana} mana
                    </span>
                  </span>
                  <span className="grimoire-index-page">
                    0{spells.indexOf(spell) + 1}
                  </span>
                  {bookmarks.has(spell.id) && (
                    <Bookmark
                      className="grimoire-index-bookmark"
                      size={12}
                      fill="currentColor"
                      aria-label="Bookmarked"
                    />
                  )}
                </button>
              ))}
            </div>
            {visible.length === 0 && (
              <div className="grimoire-empty">
                <Search size={28} />
                <h3>No matching inscriptions</h3>
                <p>Try another name or affinity.</p>
                <button
                  onClick={() => {
                    setQuery("");
                    setAffinity("All");
                  }}
                >
                  Show all inscriptions
                </button>
              </div>
            )}
            <div className="grimoire-marginalia">
              <Feather size={17} aria-hidden="true" />
              <span>
                “Every spell was once
                <br />
                someone’s impossible idea.”
              </span>
            </div>
            <div className="grimoire-page-foot">
              <span>INDEX</span>
              <span>
                {visible.length} / {spells.length} INSCRIPTIONS
              </span>
            </div>
          </>
        }
        entry={
          selected ? (
            <>
              <div className="grimoire-folio">
                <span>
                  INSCRIPTION {String(selectedIndex + 1).padStart(2, "0")}
                </span>
                <span className="grimoire-affinity-label">
                  {selected.affinity} affinity <Sparkles size={11} />
                </span>
              </div>
              <article
                className="grimoire-spell-detail"
                key={selected.id}
                aria-label={`${selected.name} details`}
              >
                <SpellIllumination spell={selected} />
                <div className="grimoire-entry-title">
                  <span>{inscriptions[selected.id].use}</span>
                  <h2>{selected.name}</h2>
                </div>
                <p className="grimoire-description">{selected.description}</p>
                <div className="grimoire-spell-stats">
                  <div>
                    <span>Mana cost</span>
                    <strong>
                      {selected.mana}
                      <small> MP</small>
                    </strong>
                  </div>
                  <div>
                    <span>Might</span>
                    <strong>{selected.might}</strong>
                  </div>
                  <div>
                    <span>Power tier</span>
                    <strong>{selected.tier}</strong>
                  </div>
                </div>
                <p className="grimoire-field-note">
                  {inscriptions[selected.id].note}
                </p>
                <FantasyButton
                  className="grimoire-bookmark"
                  tone="secondary"
                  onClick={toggleBookmark}
                  aria-pressed={bookmarked}
                >
                  {bookmarked ? <Check size={15} /> : <Bookmark size={15} />}
                  {bookmarked
                    ? "Inscription bookmarked"
                    : "Bookmark inscription"}
                </FantasyButton>
              </article>
              <div className="grimoire-page-foot">
                <button
                  aria-label="Previous inscription"
                  disabled={visibleIndex === 0}
                  onClick={() => turnPage(-1)}
                >
                  <ArrowLeft size={14} /> Previous
                </button>
                <span>— {String(selectedIndex + 1).padStart(2, "0")} —</span>
                <button
                  aria-label="Next inscription"
                  disabled={visibleIndex === visible.length - 1}
                  onClick={() => turnPage(1)}
                >
                  Next <ArrowRight size={14} />
                </button>
              </div>
            </>
          ) : (
            <div className="grimoire-unwritten">
              <BookOpen size={43} strokeWidth={1} />
              <h2>A page yet unwritten.</h2>
              <p>Your next discovery awaits.</p>
            </div>
          )
        }
      />
      <div className="grimoire-below">
        <span>
          <Shield size={13} /> Bound in leather. Inscribed with possibility.
        </span>
        <span role="status">
          {bookmarks.size}{" "}
          {bookmarks.size === 1 ? "inscription" : "inscriptions"} bookmarked
        </span>
      </div>
    </div>
  );
}
