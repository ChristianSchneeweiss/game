import { Button } from "@/components/ui/button";
import { useId, useRef } from "react";
import type { Entity } from "@loot-game/game/entity-types";
import type { GridState, Tile } from "@loot-game/game/tactical/types";
import type { BattleSession } from "../-hooks/use-battle";
import type { Stats } from "./timeline";
import { sameTile, selectionTile, tileKey } from "./tactical-presentation";
import { describeTargeting } from "@loot-game/game/tactical/queries";
import "./tactical-grid.css";

export function TacticalBoard({
  grid,
  participants,
  stats,
  session,
  footprint,
}: {
  grid: GridState;
  participants: Entity[];
  stats: Map<string, Stats>;
  session?: BattleSession;
  footprint?: Tile[];
}) {
  const helpId = useId();
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const tactical = session?.tactical;
  const reachable = new Set(
    tactical?.reachable.map((entry) => tileKey(entry.tile)),
  );
  const origin = grid.positions[grid.activation?.entityId ?? ""];
  const anchors = new Set(
    tactical?.legal.flatMap((selection) => {
      const tile = selectionTile(selection, origin);
      return tile ? [tileKey(tile)] : [];
    }),
  );
  const spellRange = new Set(tactical?.spellGuidance?.range.map(tileKey));
  const castPositions = new Set(
    tactical?.spellGuidance?.castPositions.map(tileKey),
  );
  const affected = new Set(
    (tactical?.preview?.tiles ?? footprint)?.map(tileKey),
  );
  const path = new Set(tactical?.path.map(tileKey));
  const blocked = new Set(grid.battlefield.blocked.map(tileKey));
  const threatMoves = new Set(tactical?.threat?.movement.map(tileKey));
  const threatAttacks = new Set(tactical?.threat?.attacks.map(tileKey));
  const chargedRecipients = new Set(tactical?.threat?.chargedRecipientIds);
  const occupants = new Map(
    participants
      .filter((entity) => (stats.get(entity.id)?.health ?? entity.health) > 0)
      .flatMap((entity) =>
        grid.positions[entity.id]
          ? [[tileKey(grid.positions[entity.id]), entity] as const]
          : [],
      ),
  );
  const selectedTile =
    selectionTile(tactical?.selection, origin) ?? tactical?.destination;
  const select = (tile: Tile) => tactical?.selectTile(tile);
  return (
    <section className="tactical-board-panel" aria-label="Tactical battlefield">
      <div className="tactical-board-heading">
        <div>
          <span className="battle-eyebrow">
            Battlefield · {grid.battlefield.width} × {grid.battlefield.height}
          </span>
          <h2>
            {session?.activeSpell
              ? "Choose your aim"
              : session
                ? "Plan your movement"
                : "Recorded positions"}
          </h2>
        </div>
        {tactical && (
          <label>
            Threat preview
            <select
              aria-label="Preview enemy threat"
              value={tactical.threatId}
              onChange={(event) => tactical.setThreatId(event.target.value)}
            >
              <option value="">None</option>
              {participants
                .filter(
                  (entity) =>
                    (stats.get(entity.id)?.team ?? entity.team) !==
                      (stats.get(session?.activeEntity?.id ?? "")?.team ??
                        session?.activeEntity?.team ??
                        "TEAM_A") &&
                    (stats.get(entity.id)?.health ?? entity.health) > 0,
                )
                .map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.name}
                  </option>
                ))}
            </select>
          </label>
        )}
      </div>
      <p id={helpId} className="tactical-help">
        {tactical?.targeting
          ? describeTargeting(tactical.targeting)
          : "Orthogonal movement · one step per tile"}
        . Obstacles block movement; attacks pass through. Arrow keys navigate;
        Enter or touch selects. Confirm below.
      </p>
      <div className="tactical-board-scroll">
        <div
          role="grid"
          aria-label="Battlefield tiles"
          aria-describedby={helpId}
          aria-rowcount={grid.battlefield.height}
          aria-colcount={grid.battlefield.width}
          className="tactical-board"
        >
          {Array.from({ length: grid.battlefield.height }, (_, y) => (
            <div role="row" className="tactical-board-row" key={y}>
              {Array.from({ length: grid.battlefield.width }, (_, x) => {
                const tile = { x, y },
                  key = tileKey(tile),
                  occupant = occupants.get(key);
                const ally =
                  occupant &&
                  (stats.get(occupant.id)?.team ?? occupant.team) === "TEAM_A";
                const selected = sameTile(tile, selectedTile);
                const charged = occupant && chargedRecipients.has(occupant.id);
                const status = [
                  blocked.has(key) ? "movement blocked" : "",
                  !session?.activeSpell && reachable.has(key)
                    ? "reachable"
                    : "",
                  spellRange.has(key) ? "within spell reach" : "",
                  anchors.has(key) ? "legal aim" : "",
                  castPositions.has(key)
                    ? "move here to bring a target into range"
                    : "",
                  affected.has(key) ? "affected" : "",
                  path.has(key) ? "planned path" : "",
                  threatAttacks.has(key) ? "possible enemy attack" : "",
                  charged ? "charged attack follows this actor" : "",
                ].filter(Boolean);
                return (
                  <div role="gridcell" key={key} aria-selected={selected}>
                    <button
                      ref={(node) => {
                        if (node) buttons.current.set(key, node);
                        else buttons.current.delete(key);
                      }}
                      type="button"
                      className="tactical-tile"
                      data-reachable={
                        !session?.activeSpell && reachable.has(key)
                      }
                      data-anchor={anchors.has(key)}
                      data-spell-range={spellRange.has(key)}
                      data-cast-position={castPositions.has(key)}
                      data-affected={affected.has(key)}
                      data-path={path.has(key)}
                      data-blocked={blocked.has(key)}
                      data-team={
                        occupant ? (ally ? "ally" : "enemy") : undefined
                      }
                      data-threat-move={threatMoves.has(key)}
                      data-threat-attack={threatAttacks.has(key)}
                      data-charged={charged || undefined}
                      aria-label={`Tile ${x + 1}, ${y + 1}${occupant ? `: ${occupant.name}` : ": empty"}${status.length ? `; ${status.join(", ")}` : ""}`}
                      aria-pressed={selected}
                      aria-disabled={!session?.canChoose}
                      onClick={() =>
                        occupant && session?.activeSpell
                          ? tactical?.selectActor(occupant.id)
                          : select(tile)
                      }
                      onKeyDown={(event) => {
                        const offsets: Record<string, Tile> = {
                          ArrowUp: { x: 0, y: -1 },
                          ArrowRight: { x: 1, y: 0 },
                          ArrowDown: { x: 0, y: 1 },
                          ArrowLeft: { x: -1, y: 0 },
                        };
                        const offset = offsets[event.key];
                        if (offset) {
                          event.preventDefault();
                          buttons.current
                            .get(tileKey({ x: x + offset.x, y: y + offset.y }))
                            ?.focus();
                        }
                      }}
                    >
                      <small aria-hidden="true">
                        {x + 1}·{y + 1}
                      </small>
                      <span aria-hidden="true">
                        {occupant
                          ? ally
                            ? "◆"
                            : "▲"
                          : blocked.has(key)
                            ? "▨"
                            : path.has(key)
                              ? "•"
                              : "·"}
                      </span>
                      {occupant && <strong>{occupant.name}</strong>}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <SpellGuidanceLegend tactical={tactical} />
      <div className="tactical-legend">
        {!tactical?.spellGuidance && <span>◇ Reachable</span>}
        <span>◆ Planned footprint</span>
        <span>▨ Movement obstacle</span>
        {tactical?.threat && (
          <>
            <span>Dashed: possible move + attack</span>
            <span>Red: committed charge recipient</span>
          </>
        )}
      </div>
      {tactical?.threat && (
        <p className="tactical-help">
          Possible reach after movement, using currently available abilities.{" "}
          {chargedRecipients.size > 0
            ? `Charged attack follows ${participants
                .filter((actor) => chargedRecipients.has(actor.id))
                .map((actor) => actor.name)
                .join(", ")} even after movement.`
            : "Enemy decisions are not committed."}
        </p>
      )}
    </section>
  );
}

export function SpellGuidanceLegend({
  tactical,
}: {
  tactical?: BattleSession["tactical"];
}) {
  if (!tactical?.spellGuidance) return null;
  return (
    <div className="tactical-spell-guidance" aria-label="Spell tile colors">
      <span>
        <i data-kind="range" aria-hidden="true" />
        Spell reach
      </span>
      <span>
        <i data-kind="aim" aria-hidden="true" />
        Valid aim · select to prepare
      </span>
      {tactical.spellGuidance.castPositions.length > 0 && (
        <span>
          <i data-kind="move" aria-hidden="true" />
          Move into range · select to plan
        </span>
      )}
    </div>
  );
}

export function TacticalActions({ session }: { session: BattleSession }) {
  const tactical = session.tactical;
  if (!tactical) return null;
  return (
    <div className="tactical-actions">
      <div className="tactical-movement">
        <strong>
          Movement {tactical.remaining} /{" "}
          {tactical.grid.activation?.allowance ?? 0}
        </strong>
        <span>
          Move freely within your allowance, then cast once or end your turn.
        </span>
      </div>
      {tactical.targeting?.aim === "direction" && (
        <div className="tactical-directions" aria-label="Choose direction">
          {(["north", "east", "south", "west"] as const).map((direction) => (
            <Button
              variant="outline"
              key={direction}
              onClick={() => tactical.selectDirection(direction)}
              disabled={!session.canChoose}
              aria-pressed={
                tactical.selection?.aim === "direction" &&
                tactical.selection.direction === direction
              }
            >
              {direction}
            </Button>
          ))}
        </div>
      )}
      <div className="tactical-action-buttons">
        <Button
          variant="outline"
          onClick={tactical.startMoving}
          disabled={!session.canChoose}
          aria-pressed={!session.activeSpell}
        >
          Plan move
        </Button>
        <Button
          variant="outline"
          onClick={tactical.move}
          disabled={!tactical.canMove || !!session.activeSpell}
        >
          Move{tactical.path.length ? ` · ${tactical.path.length} steps` : ""}
        </Button>
        <Button
          variant="outline"
          onClick={tactical.endTurn}
          disabled={!session.canChoose}
        >
          End Turn
        </Button>
      </div>
      <p className="tactical-plan-status" role="status">
        {session.pending
          ? "Awaiting the committed battlefield…"
          : tactical.destination
            ? tactical.canMove
              ? `Planned destination ${tactical.destination.x + 1}, ${tactical.destination.y + 1}. Confirm Move to spend ${tactical.path.length} steps.`
              : "That destination is unavailable."
            : session.activeSpell
              ? tactical.preview?.legal
                ? "Aim prepared. Cast to commit."
                : tactical.legal.length === 0 && tactical.spellGuidance
                  ? tactical.spellGuidance.castPositions.length > 0
                    ? "No target is in range. Select a blue outlined tile to plan a move into casting range."
                    : "No target is in range, and none can be reached with your remaining movement this turn."
                  : "Choose a green tile or direction to prepare your cast."
              : "Select a reachable tile to preview a path."}
      </p>
    </div>
  );
}
