import { trpcClient } from "@/utils/trpc";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { ReadyState } from "react-use-websocket";
import { BattleRender } from "./-battle-render";
import { BattleChatBar } from "./-components/battle-chat-bar";
import { useBattle } from "./-hooks/use-battle";
import { useChat as useBattleChat } from "./-hooks/use-battle-chat";
import { PresentationBoundary } from "./-presentation-boundary";
import { BattleRunNav } from "@/features/expedition/battle-run-nav";

const BattleView3D = lazy(() => import("./-presentation/battle-view-3d"));
export const Route = createFileRoute("/battle/$id")({
  component: RouteComponent,
  beforeLoad: async ({ params }) => {
    let data;
    try {
      data = await trpcClient.getBattle.query(params.id);
    } catch {
      /* Active battles have no saved result yet. */
    }
    if (data) throw redirect({ to: "/battle/finished/$id", params });
  },
});

function RouteComponent() {
  const { id } = Route.useParams();
  // The session stays above both presentations. A view switch never opens a socket.
  return <LiveBattle key={id} id={id} />;
}
function LiveBattle({ id }: { id: string }) {
  const session = useBattle(id);
  const chat = useBattleChat(id);
  const [threeD, setThreeD] = useState(true);
  const [resultReady, setResultReady] = useState(false);
  useEffect(() => {
    if (!session.winner) return;
    if (session.playback.caughtUp) {
      setResultReady(true);
      return;
    }
    const timer = window.setTimeout(() => {
      session.playback.skip();
      setResultReady(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, [session.winner, session.playback.caughtUp, session.playback.skip]);
  const connected = session.readyState === ReadyState.OPEN;
  return (
    <div>
      <BattleRunNav battleId={id} />
      {!connected && (
        <div className="p-4 text-center" role="status">
          Connecting to the battle… Casting is disabled. Your selection will
          reset on reconnect.
        </div>
      )}
      {!threeD && (
        <div
          className="flex justify-end gap-2 px-6 py-3"
          aria-label="Battle presentation"
        >
          <button
            className="rpg-badge"
            aria-pressed={!threeD}
            onClick={() => setThreeD(false)}
          >
            Cards
          </button>
          <button
            className="rpg-badge"
            aria-pressed={threeD}
            onClick={() => setThreeD(true)}
          >
            3D battlefield
          </button>
        </div>
      )}
      {session.winner && (
        <div
          className="flex items-center justify-center gap-4 p-5"
          role="status"
        >
          <strong>{session.winner === "TEAM_A" ? "Victory" : "Defeat"}</strong>
          {resultReady && (
            <Link
              className="rpg-badge"
              to="/battle/finished/$id"
              params={{ id }}
            >
              View battle result →
            </Link>
          )}
        </div>
      )}
      {threeD && BattleView3D ? (
        <PresentationBoundary onFallback={() => setThreeD(false)}>
          <Suspense
            fallback={
              <div className="p-8">
                Loading the 3D battlefield…{" "}
                <button className="rpg-badge" onClick={() => setThreeD(false)}>
                  Use Cards
                </button>
              </div>
            }
          >
            <BattleView3D
              participants={session.participants}
              effects={session.battleState?.effectTracking ?? new Map()}
              playback={session.playback}
              round={session.battleState?.round}
              session={session}
              onFallback={() => setThreeD(false)}
            />
          </Suspense>
        </PresentationBoundary>
      ) : (
        <>
          <div
            className="flex flex-wrap items-center justify-center gap-3 p-4"
            aria-label="Prepared action"
          >
            <span>
              {session.activeEntity?.spells.find(
                (s) => s.config.id === session.activeSpell,
              )?.config.name ?? "Choose a spell"}{" "}
              →{" "}
              {session.chosenTargets
                .map(
                  (id) => session.participants.find((p) => p.id === id)?.name,
                )
                .join(", ") || "Choose targets"}
            </span>
            <button
              className="rpg-badge"
              disabled={!session.activeSpell || session.pending}
              onClick={session.cancelSpell}
            >
              Cancel
            </button>
            <button
              className="rpg-badge"
              disabled={!session.canCast}
              onClick={session.castSpell}
            >
              {session.pending ? "Casting…" : "Cast"}
            </button>
            <button
              className="rpg-badge"
              disabled={session.playback.caughtUp}
              onClick={session.playback.skip}
            >
              Skip visuals
            </button>
            {session.error && <span role="alert">{session.error}</span>}
          </div>
          <BattleRender
            participants={session.participants}
            stats={session.playback.stats}
            effectTracking={session.battleState?.effectTracking ?? new Map()}
            battleState={session.battleState}
            validTargets={
              session.canChoose
                ? (session.validTargets ?? undefined)
                : undefined
            }
            activeSpell={session.activeSpell ?? undefined}
            cancelSpell={session.cancelSpell}
            getTargets={session.getTargets}
            isLive={session.canChoose}
            chosenTargets={session.chosenTargets}
            setChosenTargets={session.setChosenTargets}
            characterAttributes={session.characterAttributes}
            getCharacterAttributes={session.getCharacterAttributes}
            resetCharacterAttributes={session.resetCharacterAttributes}
            spellDescription={session.spellDescription}
            getSpellDescription={session.getSpellDescription}
            battleId={id}
            mode="live"
          />
        </>
      )}
      <BattleChatBar
        messages={chat.messages}
        sendMessage={chat.sendMessage}
        isConnected={chat.readyState === ReadyState.OPEN}
      />
    </div>
  );
}
