import { trpc } from "@/utils/trpc";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/battle/finished/$id")({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(trpc.getBattle.queryOptions(id));

  return (
    <div>
      <h1>Battle finished</h1>
      <p>Battle ID: {id}</p>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
