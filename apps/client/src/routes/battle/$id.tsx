import { trpcClient } from "@/utils/trpc";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Shield, Sparkles } from "lucide-react";
import { ReadyState } from "react-use-websocket";
import { RpgEmptyState, RpgPage } from "@/components/rpg-ui";
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
      <RpgPage className="flex items-center">
        <div className="mx-auto max-w-4xl">
          <RpgEmptyState
            icon={<Shield className="h-8 w-8" />}
            title="Connecting to battle"
            copy="Establishing the live combat socket and syncing the arena state."
            action={
              <div className="rpg-badge mx-auto">
                <Sparkles className="h-4 w-4" />
                Live battle handshake
              </div>
            }
          />
        </div>
      </RpgPage>
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
