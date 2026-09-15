import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Gem,
  Lock,
  Search,
  Shield,
  Swords,
} from "lucide-react";
import {
  FantasyButton,
  Meter,
  Ornament,
  Palette,
  Panel,
  SpellSlot,
  Stats,
  TierBadge,
  characters,
  spells,
} from "./primitives";
import type { Spell } from "./primitives";

export function Workbench({
  variant,
  onBack,
  onPrepare,
  onSpell,
  onLibrary,
}: {
  variant: "A" | "B";
  onBack: () => void;
  onPrepare: () => void;
  onSpell: (spell: Spell) => void;
  onLibrary: () => void;
}) {
  const [filter, setFilter] = useState("");
  const [tab, setTab] = useState("Spells");
  const [ready, setReady] = useState(true);
  return (
    <main className="workbench">
      <button className="f-text-button" onClick={onBack}>
        <ArrowLeft size={16} /> Back to the game preview
      </button>
      <header className="workbench-title">
        <p className="f-eyebrow">
          Shards of Affinity · Component collection {variant}
        </p>
        <h1>
          {variant === "A"
            ? "Forged in the dark."
            : "Crafted for a living story."}
        </h1>
        <p>
          {variant === "A"
            ? "Chiseled frames. Engraved controls. A glint of light in every interaction."
            : "Ink, vellum, and a little magic. An interface that feels like an artifact."}
        </p>
        <Ornament />
      </header>
      <Panel title="The material palette" eyebrow="01 · Foundations">
        <Palette variant={variant} />
      </Panel>
      <div className="workbench-grid">
        <Panel title="An invitation to act" eyebrow="02 · Buttons & states">
          <div className="workbench-buttons">
            <FantasyButton onClick={onPrepare}>
              <Swords size={16} /> Begin expedition <ArrowRight size={16} />
            </FantasyButton>
            <FantasyButton tone="secondary" onClick={() => setReady(!ready)}>
              {ready ? <Check size={16} /> : <Shield size={16} />}
              {ready ? "Ready for adventure" : "Mark yourself ready"}
            </FantasyButton>
            <FantasyButton tone="ghost" onClick={onBack}>
              Return to the sanctum <ArrowRight size={16} />
            </FantasyButton>
            <FantasyButton disabled>
              <Lock size={16} /> Requires level 20
            </FantasyButton>
          </div>
          <p className="component-caption">
            Primary · secondary · quiet · disabled
            <br />
            Hover, keyboard focus, and pressed states included.
          </p>
        </Panel>
        <Panel
          title="A character at a glance"
          eyebrow="03 · Meters & attributes"
        >
          <Meter label="Health" value={640} max={840} tone="health" />
          <Meter label="Mana" value={86} max={120} tone="mana" />
          <Meter label="Experience" value={1240} max={2000} tone="xp" />
          <Stats character={characters[0]} />
        </Panel>
      </div>
      <Panel
        title="A collection worth exploring"
        eyebrow="04 · Navigation, fields & spell slots"
        aside={<span className="f-count">4 inscribed spells</span>}
      >
        <div className="workbench-controls">
          <div className="f-tabs" role="group" aria-label="Collection type">
            {["Spells", "Equipment", "Passives"].map((label) => (
              <button
                aria-pressed={tab === label}
                key={label}
                onClick={() => setTab(label)}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="f-search">
            <Search size={16} />
            <span className="f-sr-only">Search the collection</span>
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search the collection…"
            />
          </label>
        </div>
        {tab === "Spells" ? (
          <div className="workbench-spells">
            {spells
              .filter((spell) =>
                spell.name.toLowerCase().includes(filter.toLowerCase()),
              )
              .map((spell) => (
                <SpellSlot
                  key={spell.id}
                  spell={spell}
                  onClick={() => onSpell(spell)}
                />
              ))}
            {!spells.some((spell) =>
              spell.name.toLowerCase().includes(filter.toLowerCase()),
            ) && (
              <p className="f-empty">
                No inscriptions match “{filter}”. Try another name.
              </p>
            )}
          </div>
        ) : (
          <div className="f-empty">
            <Gem size={26} />
            <h3>
              {tab === "Equipment"
                ? "An empty armory"
                : "Knowledge yet to be found"}
            </h3>
            <p>
              {tab === "Equipment"
                ? "Equipment discovered on your expeditions will appear here."
                : "Discover passive skills to shape your character’s build."}
            </p>
          </div>
        )}
      </Panel>
      <div className="workbench-grid">
        <Panel title="Power has a language" eyebrow="05 · Tier markers">
          <div className="workbench-tiers">
            {["E", "D", "C", "B", "A", "S"].map((tier) => (
              <div key={tier}>
                <TierBadge tier={tier} />
                <span>Tier {tier}</span>
              </div>
            ))}
          </div>
          <p className="component-caption">
            Tier communicates Might, from E through S.
            <br />
            The letter remains readable independently of color.
          </p>
        </Panel>
        <Panel
          title="Room for the important things"
          eyebrow="06 · Dialog & feedback"
        >
          <p className="component-caption">
            A framed preparation dialog keeps your party and the next action in
            focus.
          </p>
          <FantasyButton tone="secondary" onClick={onPrepare}>
            Preview preparation dialog <ArrowRight size={16} />
          </FantasyButton>
          <p className="f-ready workbench-status">
            <span />{" "}
            {ready
              ? "Your character is ready."
              : "Waiting for your confirmation."}
          </p>
        </Panel>
      </div>
      {variant === "A" && (
        <Panel title="A book within the sanctum" eyebrow="07 · Bound pages">
          <p className="component-caption">
            A leather cover, stitched binding, parchment pages, and an
            illuminated spell entry. The spell library brings the warmth of the
            Codex into the Obsidian Sanctum.
          </p>
          <FantasyButton tone="secondary" onClick={onLibrary}>
            Open the spellbook <ArrowRight size={16} />
          </FantasyButton>
        </Panel>
      )}
      <footer className="workbench-footer">
        A custom React component library concept · Sample data · Direction{" "}
        {variant}
      </footer>
    </main>
  );
}
