// Two full-shell fantasy directions, switchable with ?variant=A or B.
// Uses the existing dev preview convention; all interactions use in-memory sample data.
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  LayoutGrid,
  Sparkles,
  Swords,
  X,
} from "lucide-react";
import {
  CharacterSeal,
  FantasyButton,
  Ornament,
  TierBadge,
  characters,
} from "./primitives";
import type { Spell } from "./primitives";
import { VariantA, VariantB } from "./screens";
import { Workbench } from "./workbench";
import { Spellbook } from "./spellbook";
import "./styles.css";

type Variant = "A" | "B";
type PreviewLocation = {
  variant: Variant;
  view: "game" | "components" | "spellbook";
};
function readLocation(): PreviewLocation {
  const params = new URLSearchParams(window.location.search);
  return {
    variant: params.get("variant") === "B" ? "B" : "A",
    view:
      params.get("view") === "components"
        ? "components"
        : params.get("view") === "spellbook"
          ? "spellbook"
          : "game",
  };
}

function Preview() {
  const [location, setLocation] = useState(readLocation);
  const [dialog, setDialog] = useState<"prepare" | Spell | null>(null);
  const [ready, setReady] = useState(false);
  const { variant, view } = location;
  const workbench = view === "components";
  function navigate(next: PreviewLocation) {
    const url = new URL(window.location.href);
    url.searchParams.set("variant", next.variant);
    if (next.view !== "game") url.searchParams.set("view", next.view);
    else url.searchParams.delete("view");
    window.history.pushState(null, "", url);
    setLocation(next);
    window.scrollTo({ top: 0 });
  }
  useEffect(() => {
    const onPop = () => setLocation(readLocation());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (
        dialog ||
        event.altKey ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        (event.target instanceof Element &&
          event.target.closest(
            "input, textarea, select, [contenteditable], [role=dialog]",
          ))
      )
        return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        const current = readLocation();
        const next = {
          ...current,
          variant: current.variant === "A" ? ("B" as const) : ("A" as const),
        };
        const url = new URL(window.location.href);
        url.searchParams.set("variant", next.variant);
        window.history.pushState(null, "", url);
        setLocation(next);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialog]);

  const onPrepare = () => {
    setReady(false);
    setDialog("prepare");
  };
  const props = {
    onPrepare,
    onSpell: (spell: Spell) => setDialog(spell),
    onWorkbench: () => navigate({ variant, view: "components" }),
    onLibrary: () => navigate({ variant: "A", view: "spellbook" }),
    onSanctum: () => navigate({ variant, view: "game" }),
  };
  const spell = dialog !== "prepare" ? dialog : null;
  return (
    <div className={`fantasy-prototype theme-${variant.toLowerCase()}`}>
      {workbench ? (
        <Workbench
          variant={variant}
          onBack={() => navigate({ variant, view: "game" })}
          onPrepare={onPrepare}
          onSpell={props.onSpell}
          onLibrary={props.onLibrary}
        />
      ) : variant === "A" ? (
        <VariantA
          {...props}
          library={view === "spellbook" ? <Spellbook /> : undefined}
        />
      ) : (
        <VariantB {...props} />
      )}
      <div
        className="prototype-switcher"
        aria-label="Compare design directions"
      >
        <button
          aria-label="Previous direction"
          onClick={() =>
            navigate({ ...location, variant: variant === "A" ? "B" : "A" })
          }
        >
          <ArrowLeft size={17} />
        </button>
        <span className="prototype-label">DESIGN DIRECTION</span>
        <button
          className={variant === "A" ? "selected" : ""}
          aria-pressed={variant === "A"}
          onClick={() => navigate({ ...location, variant: "A" })}
        >
          <b>A</b>
          <span>Obsidian Sanctum</span>
        </button>
        <button
          className={variant === "B" ? "selected" : ""}
          aria-pressed={variant === "B"}
          onClick={() => navigate({ ...location, variant: "B" })}
        >
          <b>B</b>
          <span>Illuminated Codex</span>
        </button>
        <span className="switcher-separator" />
        <button
          className={view === "spellbook" && variant === "A" ? "selected" : ""}
          aria-label="Spellbook"
          aria-pressed={view === "spellbook" && variant === "A"}
          onClick={() =>
            navigate({
              variant: "A",
              view: view === "spellbook" ? "game" : "spellbook",
            })
          }
        >
          <BookOpen size={16} />
          <span>Spellbook</span>
        </button>
        <button
          className={`prototype-component-toggle ${workbench ? "selected" : ""}`}
          aria-label={workbench ? "Game preview" : "Components"}
          aria-pressed={workbench}
          onClick={() =>
            navigate({ variant, view: workbench ? "game" : "components" })
          }
        >
          <LayoutGrid size={16} />
          <span>{workbench ? "Game preview" : "Components"}</span>
        </button>
        <button
          aria-label="Next direction"
          onClick={() =>
            navigate({ ...location, variant: variant === "A" ? "B" : "A" })
          }
        >
          <ArrowRight size={17} />
        </button>
      </div>
      <Dialog.Root
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
      >
        <Dialog.Portal>
          <div
            className={`fantasy-prototype theme-${variant.toLowerCase()} dialog-theme`}
          >
            <Dialog.Overlay className="f-dialog-overlay" />
            <Dialog.Content className="f-dialog">
              <Dialog.Close
                className="f-dialog-close"
                aria-label="Close dialog"
              >
                <X size={18} />
              </Dialog.Close>
              <p className="f-eyebrow">
                {spell ? "From the spell collection" : "At the threshold"}
              </p>
              <Dialog.Title>
                {spell ? spell.name : "The Hollow Sanctuary"}
              </Dialog.Title>
              <Ornament />
              {spell ? (
                <>
                  <div className="dialog-spell-art">
                    <img
                      src={`/icons/skills/v1/${spell.id}.webp`}
                      alt={`${spell.name} spell artwork`}
                    />
                    <TierBadge tier={spell.tier} />
                  </div>
                  <Dialog.Description>{spell.description}</Dialog.Description>
                  <div className="dialog-spell-stats">
                    <span>
                      <strong>{spell.affinity}</strong>Affinity
                    </span>
                    <span>
                      <strong>{spell.mana}</strong>Mana cost
                    </span>
                    <span>
                      <strong>{spell.might}</strong>Might
                    </span>
                  </div>
                  <FantasyButton onClick={() => setDialog(null)}>
                    Return to your collection <ArrowRight size={15} />
                  </FantasyButton>
                  <p className="dialog-caption">
                    Illustrative spell values for this design preview.
                  </p>
                </>
              ) : (
                <>
                  <Dialog.Description>
                    Check your fellowship before venturing beyond the eastern
                    gate.
                  </Dialog.Description>
                  <div className="dialog-party">
                    {characters.map((c) => (
                      <div key={c.name}>
                        <CharacterSeal character={c} small />
                        <span>
                          <strong>{c.name}</strong>
                          <small>
                            Level {c.level} · {c.affinity}
                          </small>
                        </span>
                        <Check size={17} />
                        <span className="f-ready">Ready</span>
                      </div>
                    ))}
                  </div>
                  <div className="dialog-summary">
                    <span>4 encounters</span>
                    <span>1–2 adventurers</span>
                    <span>Level 10–14</span>
                  </div>
                  <FantasyButton
                    onClick={() => setReady(true)}
                    disabled={ready}
                  >
                    {ready ? <Check size={17} /> : <Swords size={17} />}
                    {ready ? "Your party is ready" : "Ready the fellowship"}
                  </FantasyButton>
                  <p className="dialog-caption" role="status">
                    {ready
                      ? "Preparation preview complete. Your adventure awaits."
                      : "Design preview · sample party · no live expedition is started."}
                  </p>
                </>
              )}
            </Dialog.Content>
          </div>
        </Dialog.Portal>
      </Dialog.Root>
      <span className="prototype-corner">
        <Sparkles size={11} /> INTERACTIVE CONCEPT · SAMPLE DATA
      </span>
    </div>
  );
}

if (import.meta.env.DEV) {
  const root = createRoot(document.getElementById("root")!);
  root.render(<Preview />);
  import.meta.hot?.dispose(() => root.unmount());
}
