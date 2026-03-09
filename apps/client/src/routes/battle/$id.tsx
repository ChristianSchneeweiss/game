import { trpcClient } from "@/utils/trpc";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Shield, Sparkles } from "lucide-react";
import { ReadyState } from "react-use-websocket";
import { BattleRender } from "./-battle-render";
import { BattleChatBar } from "./-components/battle-chat-bar";
import { useBattle } from "./-hooks/use-battle";
import { useChat as useBattleChat } from "./-hooks/use-battle-chat";

export const Route = createFileRoute("/battle/$id")({
  component: RouteComponent,
  beforeLoad: async ({ params }) => {
    const { id } = params;

    let data: any;
    try {
      data = await trpcClient.getBattle.query(id);
    } catch (error) {}
    if (data) {
      throw redirect({ to: "/battle/finished/$id", params: { id } });
    }
  },
});

function RouteComponent() {
  const { id } = Route.useParams();
  const {
    participants,
    battleState,
    validTargets,
    enemies,
    allies,
    chosenTargets,
    activeSpell,
    statsTimeline,
    defaultStats,
    currentEventCounter,
    isLive,
    readyState,
    castSpell,
    setChosenTargets,
    getTargets,
    cancelSpell,
    characterAttributes,
    getCharacterAttributes,
    resetCharacterAttributes,
    spellDescription,
    getSpellDescription,
  } = useBattle(id);

  const {
    messages,
    sendMessage,
    readyState: chatReadyState,
  } = useBattleChat(id);

  const stats =
    statsTimeline.length === 0
      ? defaultStats
      : statsTimeline[currentEventCounter]?.stats;

  if (readyState !== ReadyState.OPEN) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.12),transparent_20%),linear-gradient(180deg,#030712_0%,#111827_46%,#020617_100%)] px-6 py-8 text-stone-100">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-4xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-10 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-amber-300/18 bg-amber-300/10 text-amber-100">
              <Shield className="h-8 w-8" />
            </div>
            <h1 className="mt-6 font-['Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Palatino,Georgia,serif] text-4xl text-stone-50">
              Connecting to battle
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-stone-400">
              Establishing the live combat socket and syncing the arena state.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-blue-300/16 bg-blue-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">
              <Sparkles className="h-4 w-4" />
              Live battle handshake
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div>
      <BattleRender
        participants={participants}
        stats={stats}
        effectTracking={battleState?.effectTracking ?? new Map()}
        battleState={battleState}
        validTargets={validTargets ?? undefined}
        activeSpell={activeSpell ?? undefined}
        castSpell={castSpell}
        cancelSpell={cancelSpell}
        getTargets={getTargets}
        isLive={isLive}
        chosenTargets={chosenTargets}
        setChosenTargets={setChosenTargets}
        characterAttributes={characterAttributes}
        getCharacterAttributes={getCharacterAttributes}
        resetCharacterAttributes={resetCharacterAttributes}
        spellDescription={spellDescription}
        getSpellDescription={getSpellDescription}
        battleId={id}
        mode="live"
      />

      <BattleChatBar
        messages={messages}
        sendMessage={sendMessage}
        isConnected={chatReadyState === ReadyState.OPEN}
      />
    </div>
  );
}
