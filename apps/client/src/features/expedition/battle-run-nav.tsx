import { trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import "./expedition.css";
import { usePreparationPresence } from "@/features/social/use-preparation-presence";
import { AbandonRun } from "@/features/social/abandon-run";
import type { DungeonRunData } from "./run-info";
export function BattleRunNav({
  battleId,
  activeOwnerId,
  activeCharacterName,
}: {
  battleId: string;
  activeOwnerId?: string;
  activeCharacterName?: string;
}) {
  const { data } = useQuery(
    trpc.dungeon.getBattleContext.queryOptions(
      { battleId },
      {
        refetchInterval: (query) =>
          query.state.data?.attempt.completedAt ||
          query.state.data?.run.abandonedAt
            ? false
            : 2000,
      },
    ),
  );
  if (!data) return null;
  return (
    <>
      <nav className="expedition-battle-nav" aria-label="Current expedition">
        <Link to="/dungeons/$id" params={{ id: data.run.id }}>
          ← {data.run.name}
        </Link>
        <span>
          Wave {data.attempt.round + 1} / {data.run.actualEnemies.length} ·{" "}
          {data.attempt.round} cleared
        </span>
      </nav>
      {data.run.shared ? (
        <SharedBattleStatus
          run={data.run}
          activeOwnerId={activeOwnerId}
          activeCharacterName={activeCharacterName}
        />
      ) : null}
    </>
  );
}

function SharedBattleStatus({
  run,
  activeOwnerId,
  activeCharacterName,
}: {
  run: DungeonRunData;
  activeOwnerId?: string;
  activeCharacterName?: string;
}) {
  const shared = run.shared!;
  usePreparationPresence(
    run.abandonedAt || !run.activeBattle ? undefined : shared.preparationId,
  );
  const owner = shared.participants.find(
    (participant) => participant.userId === activeOwnerId,
  );
  if (run.abandonedAt || !run.activeBattle) return null;
  return (
    <section
      className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-3"
      aria-label="Shared battle company"
    >
      <div>
        <p className="text-sm text-[#cfbf97]">
          {shared.participants
            .map(
              (participant) =>
                `${participant.username} · ${participant.connected ? "Connected" : "Away"}`,
            )
            .join(" / ")}
        </p>
        {owner && !owner.connected ? (
          <p role="status">
            Waiting for {owner.username} to reconnect.{" "}
            {activeCharacterName ?? "Their character"}'s turn is preserved.
          </p>
        ) : (
          <p className="text-sm text-[#b8aa89]">
            Each owner controls their own character.
          </p>
        )}
      </div>
      <AbandonRun id={run.id} />
    </section>
  );
}
