import { useEffect, useState } from "react";
import type { Entity } from "@loot-game/game/entity-types";
import type { EffectTracking } from "@loot-game/game/bm";
import type { BattleRound } from "@loot-game/game/battle-types";
import type { SpellDescription } from "@loot-game/game/types";
import type { BattleSession } from "../-hooks/use-battle";
import type { usePlayback } from "./use-playback";
import BattleScene from "./battle-scene";
import { entityLabel } from "./entity-label";
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
  effects,
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
  const inspected =
    participants.find((p) => p.id === inspectedId) ??
    participants.find((p) => p.id === actingId) ??
    participants[0];
  const actor = session?.activeEntity;
  const spells = actor?.spells ?? [];
  const selectedSpell = spells.find(
    (s) => s.config.id === session?.activeSpell,
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
    : session.winner
      ? session.winner === "TEAM_A"
        ? "Victory"
        : "Defeat"
      : session.pending
        ? "Awaiting the server…"
        : !playback.caughtUp
          ? "Presenting resolved actions…"
          : session.canChoose
            ? "Your turn · prepare an action"
            : "Watching · waiting for the active owner";
  return (
    <section
      className="battle-3d"
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
          {(round?.round ??
            playback.frames[playback.cursor].event?.round ??
            0) + 1}
        </span>
        {(round?.orderQueue ?? (actingId ? [actingId] : [])).map(
          (id, index) => (
            <button
              key={`${id}:${index}`}
              onClick={() => inspect(id)}
              className={index === 0 ? "is-active" : ""}
              aria-label={`Inspect ${names([id])}, ${index === 0 ? "acting" : `turn ${index + 1}`}`}
            >
              <span>{index === 0 ? "◆" : `${index + 1}`}</span>
              {names([id])}
              {index === 0 && <small>Acting</small>}
            </button>
          ),
        )}
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
                  ? `${playback.cue.casterId ? names([playback.cue.casterId]) + " · " : ""}${playback.cue.label}${playback.cue.targetIds.length ? " → " + names(playback.cue.targetIds) : ""}`
                  : status}
              </span>
            </div>
            <p className="battle-model-note">
              KayKit Skeleton Warrior · model stand-in for every entity
            </p>
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
            <div className="battle-command-panel">
              <div className="battle-command-title">
                <span className="battle-eyebrow">
                  {actor?.name ?? "Waiting for battle"}
                </span>
                <span role="status">{status}</span>
              </div>
              <div className="battle-spell-list" aria-label="Choose a spell">
                {spells.map((spell, index) => {
                  const cooldown =
                    playback.stats
                      .get(actor!.id)
                      ?.cooldowns.get(spell.config.id) ?? 0;
                  const randomTarget = ["storm-pulse", "volt-lash"].includes(
                    spell.config.type,
                  );
                  const unavailable =
                    randomTarget ||
                    !session.battleState?.availableSpells.includes(
                      spell.config.id,
                    );
                  return (
                    <button
                      key={spell.config.id}
                      disabled={!session.canChoose || unavailable}
                      aria-pressed={session.activeSpell === spell.config.id}
                      onFocus={() =>
                        session.getSpellDescription(spell.config.id)
                      }
                      onClick={() => session.getTargets(spell.config.id)}
                    >
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <strong>{spell.config.name}</strong>
                      <small>
                        {spell.config.manaCost} mana ·{" "}
                        {randomTarget
                          ? "Use Cards (random targets)"
                          : cooldown > 0
                            ? `${cooldown} turns`
                            : "Ready"}
                      </small>
                    </button>
                  );
                })}
              </div>
              <div className="battle-cast-row">
                <div>
                  <span className="battle-eyebrow">Prepared action</span>
                  <p>
                    {selectedSpell ? (
                      <>
                        <strong>{selectedSpell.config.name}</strong> →{" "}
                        {selected.length
                          ? names(selected)
                          : session.validTargets
                            ? "Choose a legal target"
                            : "Requesting legal targets…"}
                      </>
                    ) : (
                      "Choose a spell, review its targets, then Cast."
                    )}
                  </p>
                </div>
                <button
                  onClick={session.cancelSpell}
                  disabled={!session.activeSpell || session.pending}
                >
                  Cancel
                </button>
                <button
                  className="battle-cast-button"
                  onClick={session.castSpell}
                  disabled={!session.canCast}
                >
                  {session.pending ? "Casting…" : "Cast"}
                  <span>↗</span>
                </button>
              </div>
              {session.error && (
                <p role="alert" className="battle-command-error">
                  {session.error}
                </p>
              )}
            </div>
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
        <aside className="battle-inspector" aria-label="Entity inspector">
          <span className="battle-eyebrow">Entity dossier / inspection</span>
          <h2>
            {inspected
              ? entityLabel(inspected, participants)
              : "The battlefield"}
          </h2>
          <p className="battle-muted">
            {inspected?.team === "TEAM_A" ? "Party member" : "Enemy"}
            {inspected && playback.stats.get(inspected.id)?.flags.dead
              ? " · Fallen"
              : ""}
          </p>
          {inspected && (
            <>
              <div className="battle-inspector-resources">
                <div>
                  <span>Health</span>
                  <strong>
                    {playback.stats.get(inspected.id)?.health}
                    <small> / {inspected.maxHealth}</small>
                  </strong>
                </div>
                <div>
                  <span>Mana</span>
                  <strong>
                    {playback.stats.get(inspected.id)?.mana}
                    <small> / {inspected.maxMana}</small>
                  </strong>
                </div>
              </div>
              <h3>
                Conditions <span>✦</span>
              </h3>
              {(playback.stats.get(inspected.id)?.activeEffects ?? [])
                .length === 0 && (
                <p className="battle-muted">No active effects.</p>
              )}
              {(playback.stats.get(inspected.id)?.activeEffects ?? []).map(
                (id) => (
                  <div className="battle-effect" key={id}>
                    <strong>{effects.get(id)?.effectType ?? "Effect"}</strong>
                    <p>
                      {effects.get(id)?.description ??
                        "Effect metadata is unavailable in this recording."}
                    </p>
                  </div>
                ),
              )}
              <h3>
                Spellbook <span>↗</span>
              </h3>
              {inspected.spells.map((spell) => (
                <details
                  key={spell.config.id}
                  onToggle={(e) => {
                    if (e.currentTarget.open)
                      session?.getSpellDescription(spell.config.id);
                  }}
                >
                  <summary>
                    {spell.config.name}
                    <span>
                      {playback.stats
                        .get(inspected.id)
                        ?.cooldowns.get(spell.config.id) || 0}{" "}
                      cd
                    </span>
                  </summary>
                  <p>
                    {spell.config.manaCost} mana · {spell.config.cooldown} turn
                    cooldown
                  </p>
                  <p>
                    {session?.spellDescription.get(spell.config.id)?.text ??
                      descriptions?.get(spell.config.id)?.text ??
                      "Description not recorded. In a live battle, expand to request it from the server."}
                  </p>
                </details>
              ))}
            </>
          )}
          {selectedSpell &&
            session?.spellDescription.get(selectedSpell.config.id) && (
              <div className="battle-prepared-description">
                <span className="battle-eyebrow">Prepared spell</span>
                <h3>{selectedSpell.config.name}</h3>
                <p>
                  {session.spellDescription.get(selectedSpell.config.id)!.text}
                </p>
              </div>
            )}
          <div className="battle-legend">
            <span>◆ Active turn</span>
            <span>◇ Legal target</span>
            <span>◎ Selected target</span>
            <span>✕ Fallen</span>
          </div>
          <p className="battle-inspector-note">
            Inspecting is separate from targeting. Use Tab and Enter for every
            control.
          </p>
        </aside>
      </div>
    </section>
  );
}
