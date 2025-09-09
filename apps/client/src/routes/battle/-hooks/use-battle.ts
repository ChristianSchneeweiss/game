import type { Entity } from "@loot-game/game/types";
import { useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import useWebSocket from "react-use-websocket";
import { toast } from "sonner";
import SuperJSON from "superjson";
import type z from "zod";
import type {
  BattleState,
  messageSchema,
  ResponseMessage,
} from "../../../../../server/src/battle-ws";
import { useAttributes } from "./use-attributes";
import { useStatsTimeline } from "./use-stats-timeline";

export const useBattle = (id: string) => {
  const [participants, setParticipants] = useState<Entity[]>([]);
  const [battleState, setBattleState] = useState<BattleState>();
  const [currentEventCounter, setCurrentEventCounter] = useState<number>(0);
  const [validTargets, setValidTargets] = useState<string[] | null>(null);
  const [enemies, setEnemies] = useState<number | undefined>(undefined);
  const [allies, setAllies] = useState<number | undefined>(undefined);
  const [chosenTargets, setChosenTargets] = useState<string[]>([]);
  const [activeSpell, setActiveSpell] = useState<string | null>(null);

  const events = battleState?.events ?? [];

  useEffect(() => {
    if (!battleState) return;
    if (!activeSpell) return;
    if (enemies === undefined || allies === undefined) return;
    console.log("chosenTargets", chosenTargets, enemies, allies);
    if (chosenTargets.length === enemies + allies) {
      castSpell(activeSpell, chosenTargets);
    }
  }, [battleState, chosenTargets, enemies, allies, activeSpell]);

  const castSpell = useCallback(
    (spellId: string, targetIds: string[]) => {
      // no idea why target sometimes just gets nulled out
      //   if (!targets) return;
      if (!battleState) return;
      const activeEntity = battleState.round.orderQueue[0];

      sendMessage(
        SuperJSON.stringify({
          type: "castSpell",
          data: { entityId: activeEntity, spellId, targetIds },
        } satisfies z.infer<typeof messageSchema>),
      );
      setValidTargets(null);
      setActiveSpell(null);
      setChosenTargets([]);
      setEnemies(undefined);
      setAllies(undefined);
    },
    [battleState],
  );

  const getTargets = useCallback(
    (spellId: string) => {
      if (!battleState) return;
      const activeEntity = battleState.round.orderQueue[0];
      setActiveSpell(spellId);
      setChosenTargets([]);
      setEnemies(undefined);
      setAllies(undefined);

      sendMessage(
        SuperJSON.stringify({
          type: "getTargets",
          data: { entityId: activeEntity, spellId },
        } satisfies z.infer<typeof messageSchema>),
      );
    },
    [battleState],
  );

  const { statsTimeline, defaultStats } = useStatsTimeline(
    events,
    participants,
  );

  console.log(events);

  useEffect(() => {
    const interval = setInterval(() => {
      if (currentEventCounter === events.length) return;
      setCurrentEventCounter((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [currentEventCounter, events.length]);

  const isLive = currentEventCounter === events.length;
  const router = useRouter();

  const { sendMessage, readyState, getWebSocket } = useWebSocket(
    `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/battle/${id}`,
    {
      onMessage: (event) => {
        const response = SuperJSON.parse(event.data) as ResponseMessage;
        switch (response.type) {
          case "entities":
            setParticipants(response.data.entities);
            break;
          case "state":
            setCurrentEventCounter(events.length);
            // we have a weird where we suddenly get a subset of events instead of all events. no idea why
            if (response.data.events.length >= events.length) {
              setBattleState(response.data);
            }
            break;
          case "targets":
            console.log("chosenTargets", response.data);
            setValidTargets(response.data.targets);
            setEnemies(response.data.enemies);
            setAllies(response.data.allies);
            break;
          case "finished":
            const winner = response.data.winner;
            if (winner === "TEAM_A") {
              toast.success("You won!");
            } else {
              toast.error("You lost!");
            }
            setTimeout(() => {
              router.navigate({ to: "/battle/finished/$id", params: { id } });
            }, 3000);
            break;
        }
      },
    },
  );

  const {
    characterAttributes,
    getCharacterAttributes,
    resetCharacterAttributes,
  } = useAttributes(getWebSocket()! as WebSocket);

  return {
    participants,
    battleState,
    currentEventCounter,
    validTargets,
    chosenTargets,
    enemies,
    allies,
    activeSpell,
    statsTimeline,
    defaultStats,
    isLive,
    readyState,
    characterAttributes,
    castSpell,
    getTargets,
    setChosenTargets,
    getCharacterAttributes,
    resetCharacterAttributes,

    cancelSpell: () => {
      setValidTargets(null);
      setChosenTargets([]);
      setEnemies(undefined);
      setAllies(undefined);
      setActiveSpell(null);
    },
  };
};
