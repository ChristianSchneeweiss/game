import { trpcClient } from "@/utils/trpc";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { ReadyState } from "react-use-websocket";
import { BattleRender } from "./-battle-render";
import { useBattle } from "./-hooks/use-battle";

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
  } = useBattle(id);

  const stats =
    statsTimeline.length === 0
      ? defaultStats
      : statsTimeline[currentEventCounter]?.stats;

  if (readyState !== ReadyState.OPEN) return <p>Connecting to battle...</p>;

  return (
    <div className="p-4">
      <h1 className="mb-4 text-2xl font-bold">Battle Timeline</h1>

      <BattleRender
        participants={participants}
        stats={stats}
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
      />
    </div>
  );
}
