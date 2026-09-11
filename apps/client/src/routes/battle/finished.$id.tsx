import { trpc } from "@/utils/trpc";
import "@/features/expedition/expedition.css";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { RunRewards } from "@/features/expedition/run-rewards";
import { resultCopy } from "@/features/expedition/run-info";
import {
  ResultHeading,
  ResultParty,
  ResultNextStep,
} from "@/features/expedition/result-details";

const ResultReplay = lazy(() => import("./-result-replay"));
export const Route = createFileRoute("/battle/finished/$id")({
  component: BattleResult,
});
function BattleResult() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(trpc.getBattle.queryOptions(id));
  const context = useQuery(
    trpc.dungeon.getBattleContext.queryOptions(
      { battleId: id },
      {
        refetchInterval: (query) =>
          query.state.data && !query.state.data.attempt.completedAt
            ? 1500
            : false,
      },
    ),
  );
  const [replay, setReplay] = useState(false);
  const run = context.data?.run;
  const victory = data.winner === "TEAM_A";
  const saved = Boolean(context.data?.attempt.completedAt);
  const defeated = data.teamB.filter((enemy) => enemy.dead).length;
  const pending = context.isPending || Boolean(context.data && !saved);
  const copy = resultCopy(victory, context.data ?? undefined);
  return (
    <>
      <main className="expedition">
        <div className="expedition-shell">
          {run ? (
            <Link
              className="expedition-back"
              to="/dungeons/$id"
              params={{ id: run.id }}
            >
              ← {run.name}
            </Link>
          ) : (
            <Link className="expedition-back" to="/dungeons">
              ← All expeditions
            </Link>
          )}
          <ResultHeading
            victory={victory}
            context={context.data ?? undefined}
          />
          <div className="expedition-result-stats">
            <div>
              <small>Foes defeated</small>
              <strong>
                {defeated} / {data.teamB.length}
              </strong>
            </div>
            <div>
              <small>Party standing</small>
              <strong>
                {data.teamA.filter((hero) => !hero.dead).length} /{" "}
                {data.teamA.length}
              </strong>
            </div>
            <div>
              <small>Waves cleared</small>
              <strong>
                {run ? `${run.round} / ${run.actualEnemies.length}` : "—"}
              </strong>
            </div>
          </div>
          <div className="expedition-layout">
            <section>
              <div className="expedition-section-heading">
                <div>
                  <small>After the encounter</small>
                  <h2>The company</h2>
                </div>
              </div>
              <ResultParty
                data={data}
                context={context.data ?? undefined}
                pending={pending}
              />
              <RunRewards
                rewards={run?.loot.filter((loot) => loot.battleId === id) ?? []}
                pending={pending}
              />
              {context.error && (
                <p role="alert" className="expedition-error">
                  Could not load the expedition: {context.error.message}{" "}
                  <button onClick={() => void context.refetch()}>
                    Try again
                  </button>
                </p>
              )}
            </section>
            <aside className="expedition-departure">
              <small>{copy.nextEyebrow}</small>
              <h2>{copy.nextTitle}</h2>
              <p>{copy.nextDescription}</p>
              <ResultNextStep
                run={run}
                saved={saved}
                pending={pending}
                victory={victory}
              />
              {pending && (
                <p role="status">
                  The result is recorded. Waiting for rewards and expedition
                  progress to finish saving.
                </p>
              )}
              <button
                className="expedition-replay-toggle"
                onClick={() => setReplay(!replay)}
                aria-expanded={replay}
              >
                {replay ? "Close battle replay ↑" : "Watch battle replay ↓"}
              </button>
            </aside>
          </div>
        </div>
      </main>
      {replay && (
        <Suspense
          fallback={
            <div className="p-8" role="status">
              Loading battle replay…
            </div>
          }
        >
          <ResultReplay data={data} />
        </Suspense>
      )}
    </>
  );
}
