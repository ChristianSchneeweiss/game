import { useEffect, useMemo, useState } from "react";
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
  const names = (ids: string[]) =>
    ids
      .map((id) => {
        const entity = participants.find((e) => e.id === id);
        return entity ? entityLabel(entity, participants) : "Unknown entity";
      })
      .join(", ");
  const inspect = (id: string) => {
    setInspectedId(id);
    session?.getCharacterAttributes(id);
    participants
      .find((p) => p.id === id)
      ?.spells.forEach((s) => session?.getSpellDescription(s.config.id));
  };
  const target = (id: string) => {
    if (!session || !legal.includes(id)) {
      inspect(id);
      return;
    }
    if (session.automaticTargets) return;
    session.setChosenTargets(
      selected.includes(id)
        ? selected.filter((t) => t !== id)
        : [...selected, id],
    );
  };
  const status = !session
    ? "Recorded battle · read only"
    : !playback.caughtUp
      ? "Presenting resolved actions…"
      : session.winner
        ? session.winner === "TEAM_A"
          ? "Victory"
          : "Defeat"
        : session.pending
          ? "Awaiting the server…"
          : session.canChoose
            ? "Your turn · prepare an action"
            : "Watching · waiting for the active owner";
  return (
    <section
      className="battle-3d"
      data-mode={session ? "live" : "replay"}
      aria-label={session ? "Live 3D battle" : "Recorded 3D battle"}
    >
      <header className="battle-stage-heading">
        <div>
          <span className="battle-eyebrow">
            Shards of Affinity / {session ? "Live encounter" : "Battle replay"}
          </span>
          <h1>
            The hollow court<span>3D prototype</span>
          </h1>
        </div>
        <div className="battle-visual-controls">
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
                  className={selected.includes(entity.id) ? "is-selected" : ""}
                >
                  <button
                    className="battle-inspect-button"
                    aria-label={`Inspect ${name}`}
                    aria-pressed={inspected?.id === entity.id}
                    onClick={() => inspect(entity.id)}
                  >
                    <span>
                      {dead ? "✕" : entity.team === "TEAM_A" ? "I" : "II"}
                    </span>
                    <strong>{name}</strong>
                    <small>
                      {stats?.health} HP{dead ? " · Fallen" : ""}
                    </small>
                  </button>
                  {session && (
                    <button
                      aria-label={`Target ${name}`}
                      aria-pressed={selected.includes(entity.id)}
                      disabled={
                        !legal.includes(entity.id) ||
                        dead ||
                        session.automaticTargets
                      }
                      onClick={() => target(entity.id)}
                    >
                      {selected.includes(entity.id)
                        ? "◎ Selected"
                        : legal.includes(entity.id)
                          ? "◇ Target"
                          : "—"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {session ? (
            <BattleCommandPanel
              session={session}
              stats={playback.stats}
              status={status}
              targetNames={names(selected)}
            />
          ) : (
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
                <input
                  aria-label="Replay event"
                  type="range"
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
        </div>
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
      </div>
    </section>
  );
}
