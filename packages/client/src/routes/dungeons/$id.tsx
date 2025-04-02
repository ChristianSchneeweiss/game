import { Button } from "@/components/ui/button";
import { trpc } from "@/utils/trpc";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dungeons/$id")({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const { mutate: fightDungeon, data: fightDungeonData } = useMutation(
    trpc.fightDungeon.mutationOptions(),
  );

  return (
    <div className="container flex flex-col justify-center space-y-3 p-6">
      <h1>Dungeon {id}</h1>
      <Button onClick={() => fightDungeon({ id })} className="w-40">
        Fight Dungeon 1
      </Button>
      <pre className="overflow-auto rounded-md p-4">
        {fightDungeonData
          ? JSON.stringify(fightDungeonData, null, 2)
          : "No data yet"}
      </pre>
    </div>
  );
}
