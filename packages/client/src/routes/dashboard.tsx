import { queryClient, trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard")({
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

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome hello</p>
      <p>{data?.email}</p>
    </div>
  );
}
