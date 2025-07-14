import { Button } from "@/components/ui/button";
import { trpc } from "@/utils/trpc";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMemo } from "react";

export const Route = createFileRoute("/dungeons/")({
  component: RouteComponent,
});

function RouteComponent() {
  const router = useRouter();

  const { data: dungeons } = useSuspenseQuery(trpc.allDungeons.queryOptions());
  const { mutate: enterDungeon } = useMutation(
    trpc.enterDungeon.mutationOptions({
      onSuccess: (data) => {
        router.navigate({ to: "/dungeons/$id", params: { id: data.id } });
      },
    }),
  );

  const activeDungeons = useMemo(() => {
    return dungeons.filter((dungeon) => dungeon.cleared === false);
  }, [dungeons]);

  const clearedDungeons = useMemo(() => {
    return dungeons.filter((dungeon) => dungeon.cleared === true);
  }, [dungeons]);

  return (
    <div className="container flex flex-col justify-center space-y-3 p-6">
      <h1>Dungeons</h1>
      <Button onClick={() => enterDungeon()} className="w-40">
        Enter Dungeon 1
      </Button>
      <div className="mt-6">
        <h2 className="mb-2 flex items-center gap-2 text-lg font-bold">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
          Active Dungeons
        </h2>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {activeDungeons.length === 0 ? (
            <li className="col-span-full text-gray-500 italic">
              No active dungeons
            </li>
          ) : (
            activeDungeons.map((dungeon) => (
              <li key={dungeon.id}>
                <Link
                  to="/dungeons/$id"
                  params={{ id: dungeon.id }}
                  className="group block rounded-lg border border-slate-300 bg-gradient-to-br from-slate-100 to-slate-200 p-4 shadow transition hover:shadow-lg dark:border-slate-700 dark:from-slate-800 dark:to-slate-700"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold transition group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {dungeon.key}
                    </span>
                    <span className="ml-2 rounded bg-slate-300 px-2 py-0.5 font-mono text-xs text-gray-600 dark:bg-slate-800 dark:text-gray-400">
                      {dungeon.id.slice(0, 8)}...
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    In Progress
                  </div>
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>
      <div className="mt-8">
        <h2 className="mb-2 flex items-center gap-2 text-lg font-bold">
          <span className="inline-block h-2 w-2 rounded-full bg-gray-400" />
          Cleared Dungeons
        </h2>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {clearedDungeons.length === 0 ? (
            <li className="col-span-full text-gray-500 italic">
              No cleared dungeons
            </li>
          ) : (
            clearedDungeons.map((dungeon) => (
              <Link
                to="/dungeons/$id"
                params={{ id: dungeon.id }}
                key={dungeon.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <span className="font-semibold text-gray-700 dark:text-gray-200">
                  {dungeon.key}
                </span>
                <span className="ml-2 rounded bg-slate-200 px-2 py-0.5 font-mono text-xs text-gray-400 dark:bg-slate-800">
                  {dungeon.id.slice(0, 8)}...
                </span>
              </Link>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
