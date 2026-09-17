import { useEffect, useMemo, useState } from "react";
import { Slider } from "@/components/ui/slider";
import * as Dialog from "@radix-ui/react-dialog";
import type { Entity } from "@loot-game/game/entity-types";
import type { EffectTracking } from "@loot-game/game/bm";
import type { BattleRound } from "@loot-game/game/battle-types";
import type { SpellDescription } from "@loot-game/game/types";
import type { BattleSession } from "../-hooks/use-battle";
import type { usePlayback } from "./use-playback";
import BattleScene from "./battle-scene";
import { entityLabel } from "./entity-label";
import { BattleCommandPanel } from "./battle-command-panel";
import { BattleInspector } from "./battle-inspector";
import { buildActionHistory, cueLabel } from "./action-history";
import "./battle-view.css";
import { encounterFor } from "./encounter-presentation";
import "./forest-battle.css";
import "./encounter-battle.css";
import { SpellGuidanceLegend, TacticalBoard } from "./tactical-board";
import "./battle-workspace.css";
import { BattleAiControls } from "../-components/battle-ai-controls";

type Props = {
  participants: Entity[];
  effects: EffectTracking;
  playback: ReturnType<typeof usePlayback>;
  round?: BattleRound;
  session?: BattleSession;
  onFallback: () => void;
  descriptions?: Map<string, SpellDescription>;
};

export default function BattleView3D({
  participants,
  playback,
  round,
  session,
  onFallback,
  descriptions,
}: Props) {
  useEffect(() => {
    performance.mark("battle-controls-ready");
  }, []);
  const [inspectedId, setInspectedId] = useState<string>();
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [graphicsFailed, setGraphicsFailed] = useState(false);
  const actingId = playback.cue?.casterId ?? round?.orderQueue[0];
  const presenting = !playback.caughtUp;
  const order = presenting
    ? actingId
      ? [actingId]
      : []
    : (round?.orderQueue ?? []);
  const turnLabel = presenting
    ? playback.playing
      ? "Resolving"
      : "Next action"
    : "Acting";
  const inspected =
    participants.find((p) => p.id === inspectedId) ??
    participants.find((p) => p.id === actingId) ??
    participants[0];
  const history = useMemo(
    () =>
      buildActionHistory(playback.frames, participants, playback.conditions),
    [playback.frames, participants, playback.conditions],
  );
  const legal = session?.canChoose ? (session.validTargets ?? []) : [];
  const selected = session?.chosenTargets ?? [];
  const legalIds = new Set(legal);
  const selectedIds = new Set(selected);
  const names = (ids: string[]) =>
    ids
      .map((id) => {
        const entity = participants.find((e) => e.id === id);
        return entity ? entityLabel(entity, participants) : "Unknown entity";
      })
      .join(", ");
  const inspect = (id: string) => {
    setInspectedId(id);
    if (session) setInspectorOpen(true);
  };
  const target = (id: string) => {
    if (session?.tactical && session.activeSpell) {
      session.tactical.selectActor(id);
      return;
    }
    if (!session || !legalIds.has(id)) {
      inspect(id);
      return;
    }
    if (session.automaticTargets) return;
    session.setChosenTargets(
      selectedIds.has(id)
        ? selected.filter((t) => t !== id)
        : [...selected, id],
    );
  };
  const encounter = encounterFor(participants);
  const status = !session
    ? "Recorded battle · read only"
    : !playback.caughtUp
      ? "Presenting resolved actions…"
      : session.winner
        ? session.winner === "TEAM_A"
          ? "Victory"
          : "Defeat"
        : session.battleState?.ai?.choosing
          ? "Commander is choosing an action…"
          : session.pending
            ? "Awaiting the server…"
            : session.canChoose
              ? "Your turn · prepare an action"
              : "Watching · waiting for the active owner";
  const inspector = (
    <BattleInspector
      entity={inspected}
      name={
        inspected ? entityLabel(inspected, participants) : "The battlefield"
      }
      stats={inspected ? playback.stats.get(inspected.id) : undefined}
      conditions={playback.conditions}
      session={session}
      descriptions={descriptions}
      history={history}
      shownCursor={playback.shownCursor}
    />
  );
  return (
    <Dialog.Root open={inspectorOpen} onOpenChange={setInspectorOpen}>
      <section
        className={session ? "battle-3d battle-live-workspace" : "battle-3d"}
        data-mode={session ? "live" : "replay"}
        data-encounter={encounter.id}
        aria-label={session ? "Live 3D battle" : "Recorded 3D battle"}
      >
        <header className="battle-stage-heading">
          <div>
            <span className="battle-eyebrow">
              Shards of Affinity /{" "}
              {session ? "Live encounter" : "Battle replay"}
            </span>
            <h1>
              {encounter.title}
              <span>
                {playback.grid
                  ? `${playback.grid.battlefield.width} × ${playback.grid.battlefield.height} battlefield`
                  : encounter.location}
              </span>
            </h1>
          </div>
          <div className="battle-visual-controls">
            {session && <BattleAiControls session={session} />}
            {session && (
              <Dialog.Trigger asChild>
                <button>Inspect</button>
              </Dialog.Trigger>
            )}
            <label>
              Speed{" "}
              <select
                value={playback.speed}
                onChange={(e) => playback.setSpeed(Number(e.target.value))}
              >
                <option value={1}>1×</option>
                <option value={2}>2×</option>
                <option value={4}>4×</option>
              </select>
            </label>
            <label>
              <input
                type="checkbox"
                checked={playback.reducedMotion}
                onChange={(e) => playback.setReducedMotion(e.target.checked)}
              />{" "}
              Reduced motion
            </label>
            <button onClick={playback.skip} disabled={playback.caughtUp}>
              Skip visuals
            </button>
            <button onClick={onFallback}>Cards</button>
          </div>
        </header>
        <div className="battle-turn-order" aria-label="Turn order">
          <span className="battle-eyebrow">
            Round{" "}
            {((presenting
              ? playback.frames[playback.shownCursor].event?.round
              : round?.round) ??
              playback.frames[playback.shownCursor].event?.round ??
              0) + 1}
          </span>
          {order.map((id, index) => (
            <button
              key={`${id}:${index}`}
              onClick={() => inspect(id)}
              className={index === 0 ? "is-active" : ""}
              aria-label={`Inspect ${names([id])}, ${index === 0 ? turnLabel.toLowerCase() : `turn ${index + 1}`}`}
            >
              <span>{index === 0 ? "◆" : `${index + 1}`}</span>
              {names([id])}
              {index === 0 && <small>{turnLabel}</small>}
            </button>
          ))}
          {!round && !actingId && (
            <span>Seek or play the recorded events below.</span>
          )}
        </div>
        <div className="battle-composition">
          <div className="battle-field-column">
            <div className="battle-viewport">
              <div className="battle-scene-caption">
                <span>I / YOUR PARTY</span>
                <span>II / ENCOUNTER</span>
              </div>
              {graphicsFailed ? (
                <div className="battle-graphics-error" role="alert">
                  <h2>Graphics unavailable</h2>
                  <p>
                    {session
                      ? "Your battle session is still connected."
                      : "The recording and playback controls are still available."}
                  </p>
                  <button onClick={onFallback}>Continue with Cards</button>
                </div>
              ) : (
                <BattleScene
                  grid={playback.grid}
                  tactical={session?.tactical}
                  participants={participants}
                  stats={playback.stats}
                  conditions={playback.conditions}
                  durationMs={playback.durationMs}
                  activeId={actingId}
                  selected={selected}
                  legal={legal}
                  inspected={inspected?.id}
                  onPick={target}
                  cue={playback.cue}
                  resolvedEvent={
                    playback.frames[playback.cursor + 1]?.event?.event
                  }
                  cueKey={playback.cueKey}
                  impact={playback.impact}
                  speed={playback.playing ? playback.speed : 0}
                  reducedMotion={playback.reducedMotion}
                  onFailure={() => setGraphicsFailed(true)}
                />
              )}
              <div className="battle-event-caption" aria-live="polite">
                <span>
                  {playback.cue
                    ? `${playback.cue.casterId ? names([playback.cue.casterId]) + " · " : ""}${cueLabel(playback.cue, playback.conditions)}${playback.cue.targetIds.length ? " → " + (playback.cue.targetIds.length > 2 ? `${playback.cue.targetIds.length} targets` : names(playback.cue.targetIds)) : ""}`
                    : status}
                </span>
              </div>
            </div>
            <div className="battle-spell-legend-slot">
              <SpellGuidanceLegend tactical={session?.tactical} />
            </div>
            <div
              className="battle-entity-controls"
              aria-label="Inspect entities and select targets"
            >
              {participants.map((entity) => {
                const name = entityLabel(entity, participants);
                const stats = playback.stats.get(entity.id);
                const dead = stats?.flags.dead;
                return (
                  <div
                    key={entity.id}
                    className={selectedIds.has(entity.id) ? "is-selected" : ""}
                  >
                    <button
                      className="battle-inspect-button"
                      aria-label={`Inspect ${name}`}
                      aria-pressed={inspected?.id === entity.id}
                      onClick={() => inspect(entity.id)}
                    >
                      <span>
                        {dead
                          ? "✕"
                          : (stats?.team ?? entity.team) === "TEAM_A"
                            ? "I"
                            : "II"}
                      </span>
                      <strong>{name}</strong>
                      <small>
                        {stats?.health} HP{dead ? " · Fallen" : ""}
                      </small>
                    </button>
                    {session && (
                      <button
                        aria-label={`Target ${name}`}
                        aria-pressed={selectedIds.has(entity.id)}
                        disabled={
                          !legalIds.has(entity.id) ||
                          dead ||
                          session.automaticTargets
                        }
                        onClick={() => target(entity.id)}
                      >
                        {selectedIds.has(entity.id)
                          ? "◎ Selected"
                          : legalIds.has(entity.id)
                            ? "◇ Target"
                            : "—"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {!session && (
              <div className="battle-replay-controls">
                <button onClick={() => playback.setPlaying(!playback.playing)}>
                  {playback.playing ? "Pause" : "Play"}
                </button>
                <button
                  onClick={() => {
                    playback.seek(0);
                    playback.setPlaying(false);
                  }}
                >
                  Restart
                </button>
                <label>
                  Event {playback.cursor} / {playback.frames.length - 1}
                  <Slider
                    aria-label="Replay event"
                    min={0}
                    max={playback.frames.length - 1}
                    value={playback.cursor}
                    onChange={(e) => {
                      playback.setPlaying(false);
                      playback.seek(Number(e.target.value));
                    }}
                  />
                </label>
                <p>Recorded presentation only. No combat commands are sent.</p>
              </div>
            )}
            {playback.grid && (
              <details className="tactical-accessible-controls">
                <summary>Tile controls and threat preview</summary>
                <TacticalBoard
                  grid={playback.grid}
                  participants={participants}
                  stats={playback.stats}
                  session={session}
                  footprint={playback.cue?.tiles}
                />
              </details>
            )}
          </div>
          {session ? (
            <BattleCommandPanel
              compact
              session={session}
              stats={playback.stats}
              status={status}
              targetNames={names(selected)}
            />
          ) : (
            inspector
          )}
        </div>
      </section>
      {session && (
        <Dialog.Portal>
          <Dialog.Overlay className="battle-inspector-backdrop" />
          <Dialog.Content
            className="battle-3d battle-inspector-dialog"
            data-encounter={encounter.id}
            aria-describedby={undefined}
          >
            <div className="battle-inspector-dialog-heading">
              <Dialog.Title>Entity inspector</Dialog.Title>
              <Dialog.Close aria-label="Close inspector">Close ×</Dialog.Close>
            </div>
            {inspector}
          </Dialog.Content>
        </Dialog.Portal>
      )}
    </Dialog.Root>
  );
}
