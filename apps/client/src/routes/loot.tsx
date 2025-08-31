import { Button } from "@/components/ui/button";
import { queryClient, trpc } from "@/utils/trpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

export const Route = createFileRoute("/loot")({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: loot } = useQuery(trpc.getMyLoot.queryOptions());
  const { mutate: claimLoot } = useMutation(
    trpc.claimLoot.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.getMyLoot.queryOptions());
      },
    }),
  );

  if (!loot) return <div>Loading loot...</div>;
  if (loot.length === 0)
    return (
      <div className="p-8 text-center text-muted-foreground">
        No loot to claim.
      </div>
    );

  return (
    <div className="mx-auto mt-8 max-w-xl">
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold">
        Your Loot
        <span className="text-base font-normal text-muted-foreground">
          ({loot.length})
        </span>
      </h1>
      <ul className="space-y-4">
        {loot.map((l) => (
          <li
            key={l.id}
            className="flex flex-col gap-2 rounded border bg-card p-4 shadow"
          >
            <div className="font-semibold">Loot Drop</div>
            <div className="flex flex-row gap-4 text-sm text-muted-foreground">
              <span>Dropped: {dayjs(l.createdAt).fromNow()}</span>
              {typeof l.gold === "number" && (
                <span>
                  Gold:{" "}
                  <span className="font-mono text-yellow-600">{l.gold}</span>
                </span>
              )}
            </div>
            <ul className="ml-4 list-disc">
              {l.items.map((item, i) => (
                <li key={i} className="text-sm">
                  {item.type === "SPELL" && (
                    <span>
                      <span className="rounded bg-muted px-2 py-0.5 font-mono">
                        {item.data.spellType}
                      </span>{" "}
                      <span className="text-muted-foreground">(Spell)</span>
                    </span>
                  )}
                  {item.type !== "SPELL" && (
                    <span>
                      <span className="rounded bg-muted px-2 py-0.5 font-mono">
                        {item.type}
                      </span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <Button onClick={() => claimLoot(l.id)}>Claim</Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
