import { useEffect, useMemo, useRef, useState } from "react";
import type { Entity } from "@loot-game/game/entity-types";
import type { CastSelection, Tile } from "@loot-game/game/tactical/types";
import {
  footprintTiles,
  legalSelections,
  potentialSelections,
  queryCast,
  reachableTiles,
} from "@loot-game/game/tactical/queries";
import type { BattleMessage } from "../../../../../server/src/battle/protocol";
import type { BattleConnection } from "./use-battle-connection";
import { sameTile } from "../-presentation/tactical-presentation";
import { tileKey } from "@loot-game/game/tactical/queries";
import { buildThreatPreview } from "../-presentation/tactical-threat";
import type { Stats } from "../-presentation/timeline";
import { buildSpellGuidance } from "../-presentation/spell-guidance";

type Plan = {
  spellId?: string;
  selection?: CastSelection;
  destination?: Tile;
  pendingId?: string;
  error?: string;
};

/** Planning uses the server's read-only rules. Only the three explicit commits send commands. */
export function useTacticalCommands(
  connection: BattleConnection,
  ownsTurn: boolean,
  caughtUp: boolean,
  activeEntity?: Entity,
  stats: Map<string, Stats> = new Map(),
) {
  const [threatId, setThreatId] = useState("");
  const [plan, updatePlan] = useState<Plan>({});
  const latest = useRef(plan);
  const setPlan = (value: Plan) => {
    latest.current = value;
    updatePlan(value);
  };
  const { battleState: state, events } = connection;
  const grid = state?.grid;
  const activation = grid?.activation;
  const actors = state?.actors ?? connection.participants;
  const pending = !!plan.pendingId;
  const canChoose =
    !!grid &&
    !!activation &&
    activation.entityId === activeEntity?.id &&
    connection.synchronized &&
    caughtUp &&
    ownsTurn &&
    !pending &&
    !connection.abandoned &&
    !connection.winner;
  const remaining = activation ? activation.allowance - activation.spent : 0;
  const spell = activeEntity?.spells.find(
    (entry) => entry.config.id === plan.spellId,
  );
  const targeting =
    spell?.config.type === "basic-attack"
      ? (activeEntity?.weaponAttackProfile?.targeting ?? spell.config.targeting)
      : spell?.config.targeting;
  const reachable = useMemo(
    () =>
      grid && activeEntity && canChoose
        ? reachableTiles(grid, actors, activeEntity.id, remaining).filter(
            (entry) => entry.path.length > 0,
          )
        : [],
    [grid, actors, activeEntity, canChoose, remaining],
  );
  const legal = useMemo(
    () =>
      grid && activeEntity && targeting && canChoose
        ? legalSelections(grid, actors, activeEntity.id, targeting)
        : [],
    [grid, actors, activeEntity, targeting, canChoose],
  );
  const spellGuidance = useMemo(
    () =>
      grid && activeEntity && targeting && canChoose
        ? buildSpellGuidance(grid, actors, activeEntity.id, targeting, reachable)
        : undefined,
    [grid, actors, activeEntity, targeting, reachable, canChoose],
  );
  const preview = useMemo(
    () =>
      grid && activeEntity && targeting && plan.selection
        ? queryCast(grid, actors, activeEntity.id, targeting, plan.selection)
        : undefined,
    [grid, actors, activeEntity, targeting, plan.selection],
  );
  const targetChoices = useMemo(() => {
    const choices = new Map<string, CastSelection>();
    if (grid && activeEntity && targeting)
      for (const selection of legal) {
        for (const id of queryCast(
          grid,
          actors,
          activeEntity.id,
          targeting,
          selection,
        ).recipientIds)
          if (!choices.has(id)) choices.set(id, selection);
      }
    return choices;
  }, [grid, actors, activeEntity, targeting, legal]);
  const move = reachable.find((entry) =>
    sameTile(entry.tile, plan.destination),
  );
  const canCast = !!(
    canChoose &&
    spell &&
    preview?.legal &&
    state?.availableSpells.includes(spell.config.id)
  );
  const threat = useMemo(
    () =>
      grid && caughtUp
        ? buildThreatPreview(
            grid,
            actors,
            connection.participants,
            threatId,
            stats,
            state?.events ?? [],
            state?.effectTracking ?? new Map(),
          )
        : undefined,
    [
      grid,
      caughtUp,
      actors,
      connection.participants,
      threatId,
      stats,
      state?.events,
      state?.effectTracking,
    ],
  );

  useEffect(() => {
    const unsubscribe = events.on((response) => {
      if (response.type === "reset") setPlan({});
      if (
        response.type === "rejected" &&
        (!response.data.requestId ||
          response.data.requestId === latest.current.pendingId)
      )
        setPlan({ error: response.data.message });
    });
    return () => unsubscribe();
  }, [events]);
  useEffect(() => {
    if (!plan.pendingId) return;
    const timer = window.setTimeout(() => {
      if (latest.current.pendingId === plan.pendingId)
        setPlan({
          ...latest.current,
          error:
            "Still awaiting the server. Reconnect to restore the committed battlefield.",
        });
    }, 8000);
    return () => clearTimeout(timer);
  }, [plan.pendingId]);

  const selectSpell = (spellId: string) => {
    if (
      !canChoose ||
      latest.current.pendingId ||
      !state?.availableSpells.includes(spellId)
    )
      return false;
    const selected = activeEntity?.spells.find(
      (entry) => entry.config.id === spellId,
    );
    const aim = (
      selected?.config.type === "basic-attack"
        ? (activeEntity?.weaponAttackProfile?.targeting ??
          selected.config.targeting)
        : selected?.config.targeting
    )?.aim;
    setPlan({
      spellId,
      selection: aim === "caster" || aim === "global" ? { aim } : undefined,
    });
    return true;
  };
  const selectTile = (tile: Tile) => {
    if (!canChoose || latest.current.pendingId || !grid || !activeEntity)
      return;
    if (!spell) {
      setPlan({ destination: tile });
      return;
    }
    if (
      spellGuidance?.castPositions.some((position) => sameTile(position, tile))
    ) {
      setPlan({ destination: tile });
      return;
    }
    if (targeting?.aim === "tile")
      setPlan({ spellId: spell.config.id, selection: { aim: "tile", tile } });
    if (targeting?.aim === "direction") {
      const selection = [
        ...legal,
        ...potentialSelections(grid, activeEntity.id, targeting),
      ].find((candidate) =>
        footprintTiles(grid, activeEntity.id, targeting, candidate).some(
          (position) => sameTile(position, tile),
        ),
      );
      if (selection) setPlan({ spellId: spell.config.id, selection });
    }
  };
  const selectActor = (entityId: string) => {
    if (
      !canChoose ||
      latest.current.pendingId ||
      !grid ||
      !activeEntity ||
      !spell
    )
      return;
    if (targeting?.aim === "direction") {
      const selection = targetChoices.get(entityId);
      if (selection) {
        setPlan({ spellId: spell.config.id, selection });
        return;
      }
    }
    const tile = grid.positions[entityId];
    if (tile) selectTile(tile);
  };
  const commit = (
    action:
      | { type: "move"; destination: Tile }
      | { type: "castSpatial"; spellId: string; selection: CastSelection }
      | { type: "endTurn" },
  ) => {
    if (!canChoose || latest.current.pendingId || !state || !activation) return;
    const requestId = crypto.randomUUID();
    const data = {
      requestId,
      revision: state.revision,
      activationId: activation.id,
      entityId: activation.entityId,
    };
    const message: BattleMessage =
      action.type === "move"
        ? { type: "move", data: { ...data, destination: action.destination } }
        : action.type === "castSpatial"
          ? {
              type: "castSpatial",
              data: {
                ...data,
                spellId: action.spellId,
                selection: action.selection,
              },
            }
          : { type: "endTurn", data };
    setPlan({ ...latest.current, pendingId: requestId });
    if (!connection.send(message)) setPlan({});
  };
  const cancelSpell = () => {
    if (!latest.current.pendingId) setPlan({});
  };
  const anchorKeys = new Set(
    legal.flatMap((selection) =>
      selection.aim === "tile" ? [tileKey(selection.tile)] : [],
    ),
  );
  const validTargets =
    targeting?.aim === "tile" && grid
      ? connection.participants
          .filter(
            (actor) =>
              grid.positions[actor.id] &&
              anchorKeys.has(tileKey(grid.positions[actor.id])),
          )
          .map((actor) => actor.id)
      : [...targetChoices.keys()];
  return {
    canChoose,
    canCast,
    pending,
    error: plan.error,
    activeSpell: plan.spellId ?? null,
    validTargets,
    chosenTargets: preview?.recipientIds ?? [],
    automaticTargets:
      targeting?.aim === "global" || targeting?.aim === "caster",
    getTargets: selectSpell,
    setChosenTargets: (ids: string[]) => {
      const id = ids.at(-1);
      if (id) selectActor(id);
    },
    castSpell: () => {
      if (canCast && plan.spellId && plan.selection)
        commit({
          type: "castSpatial",
          spellId: plan.spellId,
          selection: plan.selection,
        });
    },
    cancelSpell,
    tactical: grid
      ? {
          grid,
          actors,
          remaining,
          reachable,
          legal,
          preview,
          selection: plan.selection,
          threatId,
          setThreatId,
          threat,
          destination: plan.destination,
          path: move?.path ?? [],
          targeting,
          spellGuidance,
          selectTile,
          selectActor,
          selectDirection: (direction: "north" | "east" | "south" | "west") => {
            if (
              canChoose &&
              !latest.current.pendingId &&
              spell &&
              targeting?.aim === "direction"
            )
              setPlan({
                spellId: spell.config.id,
                selection: { aim: "direction", direction },
              });
          },
          startMoving: cancelSpell,
          canMove: canChoose && !!move,
          move: () => {
            if (canChoose && move)
              commit({ type: "move", destination: move.tile });
          },
          endTurn: () => commit({ type: "endTurn" }),
        }
      : undefined,
  };
}
