import { queryClient, trpc } from "@/utils/trpc";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PartyCard, WaveTrail } from "@/features/expedition/run-ui";
import { runCopy } from "@/features/expedition/run-info";
import { RunDeparture } from "@/features/expedition/run-departure";
import { RoutePlanner } from "@/features/expedition/route-planner";
import { RunRewards } from "@/features/expedition/run-rewards";

export const Route = createFileRoute("/dungeons/$id")({
  component: DungeonRun,
});
function DungeonRun() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: run } = useSuspenseQuery(
    trpc.dungeon.getRun.queryOptions(
      { id },
      {
        refetchInterval: (query) =>
          query.state.data?.activeBattle
            ? 2000
            : query.state.data?.cleared
              ? false
              : 5000,
      },
    ),
  );
  const fight = useMutation(
    trpc.dungeon.fightDungeon.mutationOptions({
      onSuccess: async (battleId) => {
        await queryClient.invalidateQueries({
          queryKey: trpc.dungeon.getRun.queryKey({ id }),
        });
        await navigate({ to: "/battle/$id", params: { id: battleId } });
      },
      onError: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.dungeon.getRun.queryKey({ id }),
        });
      },
    }),
  );
  const copy = runCopy(run);
  const lastBattle = run.battles.filter((battle) => battle.completedAt).at(-1);
  return (
    <main className="expedition">
      <div className="expedition-shell">
        <Link className="expedition-back" to="/dungeons">
          ← All expeditions
        </Link>
        <header className="expedition-title">
          <div>
            <p className="expedition-eyebrow">{copy.eyebrow}</p>
            <h1>{copy.title}</h1>
            <p>{copy.description}</p>
          </div>
          <span className="expedition-seal" aria-hidden="true">
            {run.cleared ? "✓" : String(run.round + 1).padStart(2, "0")}
            <small>{run.cleared ? "CLEARED" : "WAVE"}</small>
          </span>
        </header>
        {run.route ? (
          <RoutePlanner key={`${run.id}:${run.round}`} run={run} />
        ) : (
          <WaveTrail
            dungeonKey={run.key}
            waves={run.actualEnemies.map((wave) =>
              wave.map((enemy) => enemy.type),
            )}
            completed={run.round}
            active={run.activeBattle}
          />
        )}
        <div className="expedition-layout">
          <section>
            <div className="expedition-section-heading">
              <div>
                <small>The company</small>
                <h2>Your party</h2>
              </div>
              <span>{run.playerTeam.length} adventurers</span>
            </div>
            <div className="expedition-roster">
              {run.playerTeam.map((character) => (
                <PartyCard key={character.id} character={character} />
              ))}
            </div>
            {lastBattle && (
              <Link
                className="expedition-text-link"
                to="/battle/finished/$id"
                params={{ id: lastBattle.battleId }}
              >
                Review wave {lastBattle.round + 1} & rewards →
              </Link>
            )}
            <RunRewards rewards={run.loot} />
          </section>
          <RunDeparture
            run={run}
            onFight={() => fight.mutate({ id })}
            pending={fight.isPending}
            error={fight.error?.message}
          />
        </div>
      </div>
    </main>
  );
}
