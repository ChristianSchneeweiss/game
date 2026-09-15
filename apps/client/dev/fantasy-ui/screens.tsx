import { useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Compass,
  Feather,
  Gem,
  Map,
  Shield,
  Sparkles,
  Swords,
  Users,
} from "lucide-react";
import {
  CharacterSeal,
  Crest,
  FantasyButton,
  LootMark,
  Meter,
  Ornament,
  Panel,
  SpellSlot,
  Stats,
  characters,
  spells,
} from "./primitives";
import type { Spell } from "./primitives";

export type ScreenProps = {
  onPrepare: () => void;
  onSpell: (spell: Spell) => void;
  onWorkbench: () => void;
  onLibrary: () => void;
  onSanctum: () => void;
  library?: ReactNode;
};

function CharacterDetails({ onSpell }: Pick<ScreenProps, "onSpell">) {
  const [active, setActive] = useState(0);
  const [section, setSection] = useState("Attributes");
  const character = characters[active];
  return (
    <Panel
      title="Your party"
      eyebrow="Bound by affinity"
      aside={<span className="f-count">2 / 2</span>}
      className="party-panel"
    >
      <div
        className="party-selector"
        role="group"
        aria-label="Select character"
      >
        {characters.map((c, i) => (
          <button
            key={c.name}
            aria-pressed={active === i}
            onClick={() => setActive(i)}
          >
            <CharacterSeal character={c} small />
            <span>
              <strong>{c.name}</strong>
              <small>
                Level {c.level} · {c.affinity}
              </small>
            </span>
            {active === i && <Check size={14} />}
          </button>
        ))}
      </div>
      <div className="party-detail">
        <div className="party-name">
          <div>
            <h3>{character.name}</h3>
            <p>{character.title}</p>
          </div>
          <span className="f-ready">
            <span /> Ready
          </span>
        </div>
        <Meter
          label="Health"
          value={character.hp}
          max={character.hp}
          tone="health"
        />
        <Meter
          label="Mana"
          value={character.mp}
          max={character.mp}
          tone="mana"
        />
        <div className="f-tabs" role="group" aria-label="Character details">
          {["Attributes", "Spells", "Equipment"].map((tab) => (
            <button
              key={tab}
              aria-pressed={section === tab}
              onClick={() => setSection(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        {section === "Attributes" ? (
          <Stats character={character} />
        ) : section === "Spells" ? (
          <div className="f-slot-row">
            {spells.map((spell) => (
              <SpellSlot
                key={spell.id}
                spell={spell}
                compact
                onClick={() => onSpell(spell)}
              />
            ))}
          </div>
        ) : (
          <div className="f-equipment">
            <Swords />
            <span>
              <strong>Iron longsword</strong>
              <small>Main hand · Tier C</small>
            </span>
            <Shield />
            <span>
              <strong>Oak shield</strong>
              <small>Off hand · Tier C</small>
            </span>
          </div>
        )}
      </div>
      <div className="party-bottom">
        <Shield size={14} />
        <span>Two adventurers. One shared fate.</span>
      </div>
    </Panel>
  );
}

export function VariantA({
  onPrepare,
  onSpell,
  onWorkbench,
  onLibrary,
  onSanctum,
  library,
}: ScreenProps) {
  return (
    <div className="sanctum-layout">
      <aside className="sanctum-sidebar">
        <div className="sanctum-brand">
          <Crest />
          <span>
            Shards <i>of</i>
            <br />
            <strong>Affinity</strong>
          </span>
        </div>
        <Ornament />
        <p className="f-eyebrow nav-eyebrow">Your journey</p>
        <nav aria-label="Sanctum preview navigation">
          <button
            className={!library ? "active" : ""}
            aria-current={!library ? "page" : undefined}
            aria-label="Sanctum"
            onClick={onSanctum}
          >
            <Compass />
            <span>Sanctum</span>
            <ChevronRight size={15} />
          </button>
          <button
            aria-label="Characters"
            onClick={() =>
              library
                ? onSanctum()
                : document
                    .querySelector(".party-panel")
                    ?.scrollIntoView({ behavior: "smooth", block: "center" })
            }
          >
            <Users />
            <span>Characters</span>
            <small>02</small>
          </button>
          <button onClick={onPrepare} aria-label="Dungeons">
            <Map />
            <span>Dungeons</span>
          </button>
          <button
            aria-label="Spell library"
            className={library ? "active" : ""}
            aria-current={library ? "page" : undefined}
            onClick={onLibrary}
          >
            <BookOpen />
            <span>Spell library</span>
          </button>
        </nav>
        <div className="sidebar-library">
          <p className="f-eyebrow">The artisan’s table</p>
          <button onClick={onWorkbench}>
            <Sparkles size={17} />
            <span>Component library</span>
            <ArrowRight size={15} />
          </button>
        </div>
        <div className="sidebar-footer">
          <div className="sidebar-quote">
            “Even the smallest shard
            <br />
            remembers the light.”
          </div>
          <Ornament />
          <div className="f-account">
            <span>W</span>
            <div>
              <strong>Wanderer</strong>
              <small>Your account</small>
            </div>
            <Feather size={17} />
          </div>
        </div>
      </aside>
      <div className="sanctum-main">
        <header className="sanctum-topbar">
          <span>
            THE SANCTUM <i>/</i> {library ? "SPELL LIBRARY" : "OVERVIEW"}
          </span>
          <LootMark />
        </header>
        <main>
          {library ? (
            library
          ) : (
            <>
              <div className="sanctum-intro">
                <div>
                  <p className="f-eyebrow">The next chapter awaits</p>
                  <h1>Welcome back, Wanderer.</h1>
                  <p>
                    Gather your party. Hone your craft. Venture into the
                    unknown.
                  </p>
                </div>
                <div className="sanctum-sigil">
                  <Compass size={45} strokeWidth={1} />
                  <span>THE FIRST AGE</span>
                </div>
              </div>
              <div className="sanctum-grid">
                <section className="dungeon-hero">
                  <div className="dungeon-hero-art" />
                  <div className="hero-top">
                    <span className="f-tag">
                      <span /> Available expedition
                    </span>
                    <span className="hero-number">I</span>
                  </div>
                  <div className="hero-content">
                    <p className="f-eyebrow">Beyond the eastern gate</p>
                    <h2>
                      The Hollow
                      <br />
                      Sanctuary
                    </h2>
                    <p>
                      Roots have claimed its halls.
                      <br />
                      Something else has claimed its heart.
                    </p>
                    <div className="hero-meta">
                      <span>
                        <Swords size={15} /> 4 encounters
                      </span>
                      <span>
                        <Users size={15} /> 1–2 adventurers
                      </span>
                    </div>
                    <FantasyButton onClick={onPrepare}>
                      Prepare expedition <ArrowRight size={17} />
                    </FantasyButton>
                  </div>
                  <div className="hero-footer">
                    <span>
                      <Gem size={14} /> Spells, equipment & untold riches
                    </span>
                    <span>RECOMMENDED LV. 10–14</span>
                  </div>
                </section>
                <CharacterDetails onSpell={onSpell} />
              </div>
              <Panel
                title="Power, waiting to be mastered."
                eyebrow="From your spell collection"
                aside={
                  <button className="f-text-button" onClick={onLibrary}>
                    Open the spellbook <ArrowRight size={14} />
                  </button>
                }
                className="spell-panel"
              >
                <div className="sanctum-spells">
                  {spells.map((spell, index) => (
                    <div key={spell.id}>
                      <span className="spell-index">0{index + 1}</span>
                      <SpellSlot spell={spell} onClick={() => onSpell(spell)} />
                    </div>
                  ))}
                </div>
              </Panel>
            </>
          )}
          <footer className="screen-footer">
            <span>SHARDS OF AFFINITY</span>
            <span>Every build tells a story.</span>
            <span>✧</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

export function RealmMap() {
  return (
    <svg
      className="realm-map"
      viewBox="0 0 640 380"
      role="img"
      aria-label="An illustrated map showing the path from the camp through the woods to the Hollow Sanctuary"
    >
      <defs>
        <pattern
          id="map-hatch"
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(30)"
        >
          <path
            d="M0 0v6"
            stroke="currentColor"
            strokeWidth=".5"
            opacity=".2"
          />
        </pattern>
      </defs>
      <g fill="none" stroke="currentColor" strokeWidth="1.3" opacity=".35">
        <path d="M-10 185Q80 144 125 180T220 194T338 166T461 170T650 142M-10 197Q80 156 125 192T220 206T338 178T461 182T650 154" />
        <path d="M70 315Q122 268 200 284T337 310T505 264T660 288M90 327Q152 280 210 296T347 322T515 276T670 300" />
      </g>
      <g stroke="currentColor" strokeWidth="1.2" fill="url(#map-hatch)">
        {[
          [90, 75],
          [130, 85],
          [155, 64],
          [183, 89],
          [221, 69],
          [242, 88],
          [345, 225],
          [380, 212],
          [399, 239],
          [431, 228],
          [458, 243],
          [480, 218],
          [71, 246],
          [101, 257],
          [130, 239],
        ].map(([x, y]) => (
          <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
            <path d="m0 0-14 24h7l-12 19h14v12h10V43h14L7 24h7Z" />
            <path d="M0 14v29" />
          </g>
        ))}
      </g>
      <g stroke="currentColor" strokeWidth="1.4" fill="url(#map-hatch)">
        <path d="m355 113 32-63 29 59 27-78 50 95 20-39 38 62" />
        <path d="m376 73 10-8 9 9m34-21 12-8 14 13M412 108l-10 20m89-2-12 24" />
      </g>
      <path
        d="M170 270C228 240 227 185 283 185S364 150 412 133"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="3 7"
        strokeLinecap="round"
      />
      <g
        transform="translate(143 231)"
        fill="var(--f-paper)"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="m0 39 24-38 32 38ZM24 1v38m0-29 13 29" />
        <path d="M-6 40h69" />
      </g>
      <g
        transform="translate(409 81)"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="var(--f-paper)"
      >
        <path d="M-28 53V-5h12V5h10V-5H6v58M6 15h40v38H6m30-38V0h10v-12h10V0h10v53H46M-34 53H72" />
        <path d="M13 53V36q10-21 20 0v17M-20 20v10M-3 20v10M47 21v9M58 21v9" />
      </g>
      <g fill="currentColor" fontFamily="Georgia, serif" textAnchor="middle">
        <text x="170" y="302" fontSize="12" fontStyle="italic">
          Your camp
        </text>
        <text x="184" y="53" fontSize="12" letterSpacing="2">
          THE WHISPERING WOODS
        </text>
        <text x="449" y="166" fontSize="12" fontStyle="italic">
          The Hollow Sanctuary
        </text>
        <text x="379" y="340" fontSize="10" letterSpacing="3">
          THE EASTERN REACHES
        </text>
      </g>
      <g transform="translate(557 272)" stroke="currentColor" fill="none">
        <circle r="28" opacity=".4" />
        <path d="m0-39 7 32 32 7-32 7-7 32-7-32-32-7 32-7Z" />
        <path d="M0-39V39M-39 0h78" opacity=".4" />
        <text
          y="-46"
          textAnchor="middle"
          fill="currentColor"
          stroke="none"
          fontFamily="Georgia"
          fontSize="11"
        >
          N
        </text>
      </g>
    </svg>
  );
}

export function VariantB({ onPrepare, onSpell, onWorkbench }: ScreenProps) {
  const [active, setActive] = useState(0);
  const character = characters[active];
  return (
    <div className="codex-layout">
      <header className="codex-header">
        <div className="codex-brand">
          <Crest small />
          <span>
            Shards <i>of</i> Affinity
          </span>
        </div>
        <nav aria-label="Codex preview navigation">
          <button aria-current="page">The journal</button>
          <button onClick={onPrepare}>Expeditions</button>
          <button onClick={onWorkbench}>The collection</button>
        </nav>
        <LootMark />
      </header>
      <main>
        <div className="codex-title">
          <span className="codex-chapter">
            VOLUME I <span>◆</span> THE FIRST AGE
          </span>
          <h1>A tale yet unwritten.</h1>
          <p>A fellowship of two. A world of possibilities.</p>
          <Ornament />
        </div>
        <div className="codex-book">
          <section className="codex-left">
            <div className="book-section-title">
              <span>01</span>
              <h2>The fellowship</h2>
              <Feather size={21} />
            </div>
            <p className="book-intro">
              Every great story begins with those
              <br />
              who choose to walk beside you.
            </p>
            <div
              className="codex-characters"
              role="group"
              aria-label="Select character"
            >
              {characters.map((c, i) => (
                <button
                  key={c.name}
                  aria-pressed={active === i}
                  onClick={() => setActive(i)}
                >
                  <CharacterSeal character={c} />
                  <strong>{c.name}</strong>
                  <span>{c.title}</span>
                  <small>
                    LEVEL {c.level} <span>·</span> {c.affinity.toUpperCase()}
                  </small>
                </button>
              ))}
            </div>
            <div className="codex-character-status">
              <h3>
                {character.name}’s condition{" "}
                <span>
                  <Check size={12} /> Ready to venture
                </span>
              </h3>
              <Meter
                label="Health"
                value={character.hp}
                max={character.hp}
                tone="health"
              />
              <Meter
                label="Mana"
                value={character.mp}
                max={character.mp}
                tone="mana"
              />
            </div>
            <div className="codex-spells-heading">
              <h3>Inscribed spells</h3>
              <span>IV / IV</span>
            </div>
            <div className="codex-spells">
              {spells.map((spell) => (
                <SpellSlot
                  key={spell.id}
                  spell={spell}
                  compact
                  onClick={() => onSpell(spell)}
                />
              ))}
            </div>
            <p className="codex-note">
              “A well-chosen spell is worth a hundred blades.”
            </p>
            <div className="book-page-number">— 12 —</div>
          </section>
          <section className="codex-right">
            <div className="book-section-title">
              <span>02</span>
              <h2>Into the unknown</h2>
              <Compass size={23} />
            </div>
            <div className="codex-map-wrap">
              <RealmMap />
              <span className="map-stamp">
                <Compass size={18} /> CHARTED
                <br />
                TERRITORY
              </span>
            </div>
            <div className="codex-expedition">
              <p className="f-eyebrow">Your next expedition</p>
              <h2>The Hollow Sanctuary</h2>
              <p>
                Past the whispering woods, an old sanctuary holds its breath.
                <br className="desktop-break" /> Its doors are open. Its secrets
                are not.
              </p>
              <div className="codex-expedition-meta">
                <span>
                  <Swords size={15} /> 4 encounters
                </span>
                <span>
                  <Users size={15} /> 1–2 adventurers
                </span>
                <span>
                  <Shield size={15} /> Level 10–14
                </span>
              </div>
              <FantasyButton onClick={onPrepare}>
                Write the next chapter <ArrowRight size={17} />
              </FantasyButton>
              <small>Spells, equipment & stories to bring home</small>
            </div>
            <div className="book-page-number">— 13 —</div>
          </section>
        </div>
        <div className="codex-below">
          <span>
            <Feather size={16} /> A chronicle of your becoming.
          </span>
          <button onClick={onWorkbench}>
            Visit the component collection <ArrowDown size={15} />
          </button>
        </div>
      </main>
    </div>
  );
}
