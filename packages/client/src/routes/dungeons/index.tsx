import { Button } from "@/components/ui/button";
import { trpc } from "@/utils/trpc";
import { useMutation, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";

export const Route = createFileRoute("/dungeons/")({
  component: RouteComponent,
});

function RouteComponent() {
  const router = useRouter();

  const { data: dungeons } = useSuspenseQuery(
    trpc.activeDungeons.queryOptions(),
  );
  const { mutate: enterDungeon } = useMutation(
    trpc.enterDungeon.mutationOptions({
      onSuccess: (data) => {
        router.navigate({ to: "/dungeons/$id", params: { id: data.id } });
      },
    }),
  );

  return (
    <div className="container flex flex-col justify-center space-y-3 p-6">
      <h1>Dungeons</h1>
      <Button onClick={() => enterDungeon()} className="w-40">
        Enter Dungeon 1
      </Button>
      <h2>Active Dungeons</h2>
      <ul>
        {dungeons.map((dungeon) => (
          <li key={dungeon.id}>
            <Link to="/dungeons/$id" params={{ id: dungeon.id }}>
              {dungeon.key}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
