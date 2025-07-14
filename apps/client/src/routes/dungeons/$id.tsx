import { Button } from "@/components/ui/button";
import { queryClient, trpc } from "@/utils/trpc";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";

export const Route = createFileRoute("/dungeons/$id")({
  component: RouteComponent,
  beforeLoad: async ({ params }) => {
    await queryClient.prefetchQuery(
      trpc.dungeon.getDungeon.queryOptions({ id: params.id }),
    );
  },
});

function RouteComponent() {
  const { id } = Route.useParams();
  const router = useRouter();
  const { mutate: fightDungeon } = useMutation(
    trpc.dungeon.fightDungeon.mutationOptions({
      onSuccess: (id) => {
        queryClient.invalidateQueries({
          queryKey: trpc.dungeon.getDungeon.queryKey({ id }),
        });
        router.navigate({ to: "/battle/$id", params: { id } });
      },
    }),
  );
  const { data: dungeon } = useSuspenseQuery(
    trpc.dungeon.getDungeon.queryOptions({ id }),
  );
  const { data: battles } = useSuspenseQuery(
    trpc.dungeon.getDungeonBattles.queryOptions({ id }),
  );
  console.log(battles);

  return (
    <div className="container flex flex-col justify-center space-y-3 p-6">
      <h1 className="text-2xl font-bold">
        Dungeon {dungeon.key} round {dungeon.round + 1}
      </h1>
      <div className="overflow-auto rounded-md bg-slate-100 p-4 dark:bg-slate-800">
        <div className="mb-4">
          <h3 className="mb-2 text-lg font-semibold">Your Team</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {dungeon.playerTeam.map((player) => (
              <div
                key={player.id}
                className="rounded-md bg-blue-100 p-3 dark:bg-blue-900"
              >
                <p className="font-medium">{player.name}</p>
                <p>
                  HP: {player.health}/{player.maxHealth}
                </p>
                <p>
                  Mana: {player.mana}/{player.maxMana}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-lg font-semibold">Current Enemies</h3>
          {dungeon.actualEnemies[dungeon.round] ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {dungeon.actualEnemies[dungeon.round].map((enemy) => (
                <div
                  key={enemy.id}
                  className="rounded-md bg-red-100 p-3 dark:bg-red-900"
                >
                  <p className="font-medium">{enemy.name}</p>
                  <p>
                    HP: {enemy.health}/{enemy.maxHealth}
                  </p>
                  <p>
                    Mana: {enemy.mana}/{enemy.maxMana}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p>No enemies in this round</p>
          )}
        </div>
      </div>
      <Button onClick={() => fightDungeon({ id })} className="w-40">
        Fight Dungeon 1
      </Button>
      <div className="mt-8">
        <h3 className="mb-2 text-lg font-semibold">Battle History</h3>
        <ul className="space-y-2">
          {battles.map((battle, i) => (
            <Link
              to="/battle/$id"
              params={{ id: battle.battleId }}
              key={battle.id}
              className="flex items-center justify-between rounded bg-slate-200 px-4 py-2 dark:bg-slate-700"
            >
              <span className="font-mono text-sm text-slate-600 dark:text-slate-300">
                Battle {i + 1}
              </span>
              <span className="ml-2 truncate text-xs text-slate-500 dark:text-slate-400">
                {battle.battleId}
              </span>
            </Link>
          ))}
        </ul>
      </div>
    </div>
  );
}
