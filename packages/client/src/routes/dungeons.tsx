import { Button } from "@/components/ui/button";
import { queryClient, trpc } from "@/utils/trpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dungeons")({
  component: RouteComponent,
  loader: async () => {
    await queryClient.prefetchQuery(trpc.protected.queryOptions());
    console.log("prefetched");
  },
});

function RouteComponent() {
  const { data } = useQuery(
    trpc.protected.queryOptions(undefined, { enabled: false }),
  );

  const { mutate: fightDungeon, data: dungeonData } = useMutation(
    trpc.fightDungeon.mutationOptions(),
  );

  return (
    <div className="container flex flex-col justify-center space-y-3 p-6">
      <h1>Dungeons</h1>
      <Button onClick={() => fightDungeon()} className="w-40">
        Fight Dungeon 1
      </Button>
      <pre className="overflow-auto rounded-md p-4">
        {dungeonData ? JSON.stringify(dungeonData, null, 2) : "No data yet"}
      </pre>
    </div>
  );
}
