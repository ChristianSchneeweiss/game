import { Button } from "@/components/ui/button";
import {
  CollectionHeader,
  CollectionLoading,
} from "@/components/collection-ui";
import { RpgEmptyState, RpgPage } from "@/components/rpg-ui";
import { RewardEntry } from "@/features/expedition/reward-entry";
import { groupDrops } from "@/features/expedition/run-info";
import { queryClient, trpc } from "@/utils/trpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { ArrowRight, Gift } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

dayjs.extend(relativeTime);
export const Route = createFileRoute("/loot")({ component: RouteComponent });

function RouteComponent() {
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const { data: loot, isLoading } = useQuery(
    trpc.getMyLoot.queryOptions(undefined, { throwOnError: true }),
  );
  const { mutateAsync: claimLoot } = useMutation(
    trpc.claimLoot.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries(trpc.getMyLoot.queryOptions()),
          queryClient.invalidateQueries(trpc.getMyEquipment.queryOptions()),
          queryClient.invalidateQueries(trpc.getMySpells.queryOptions()),
          queryClient.invalidateQueries(trpc.getMyPassiveSkills.queryOptions()),
          queryClient.invalidateQueries({
            queryKey: trpc.dungeon.getRun.queryKey(),
          }),
        ]);
      },
    }),
  );
  return (
    <RpgPage>
      <div className="space-y-8">
        <CollectionHeader
          eyebrow="Your reward archive"
          title="Spoils of the journey"
          description="Claim your rewards, then equip spells and gear from your character’s loadout."
          summary={[
            { label: "Drops", value: isLoading ? "—" : (loot?.length ?? 0) },
            {
              label: "Items",
              value: isLoading
                ? "—"
                : (loot?.reduce(
                    (total, entry) => total + entry.items.length,
                    0,
                  ) ?? 0),
            },
          ]}
        />
        {isLoading ? (
          <CollectionLoading />
        ) : loot?.length === 0 ? (
          <RpgEmptyState
            icon={<Gift className="size-8" />}
            title="No loot waiting"
            copy="Finish battles and dungeons to start filling this reward archive."
          />
        ) : (
          loot && (
            <section className="collection-grid" aria-label="Unclaimed rewards">
              {loot.map((entry) => (
                <article key={entry.id} className="reward-bundle">
                  <header className="flex items-center justify-between gap-3">
                    <h2>Reward Bundle</h2>
                    <span className="rpg-badge">
                      {entry.items.length} entries
                    </span>
                  </header>
                  <div className="reward-bundle-meta">
                    <span>Dropped {dayjs(entry.createdAt).fromNow()}</span>
                    <span>
                      Gold roll · not credited:{" "}
                      {typeof entry.gold === "number" ? entry.gold : "None"}
                    </span>
                  </div>
                  <div>
                    {groupDrops(entry.items).map((drop) => (
                      <RewardEntry
                        key={drop.type}
                        item={drop.item}
                        count={drop.count}
                      />
                    ))}
                  </div>
                  <Button
                    disabled={claimingId !== null}
                    onClick={async () => {
                      try {
                        setClaimingId(entry.id);
                        await claimLoot(entry.id);
                        toast.success("Loot claimed.");
                      } catch (error) {
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : "Failed to claim loot.",
                        );
                      } finally {
                        setClaimingId(null);
                      }
                    }}
                    variant="relic"
                    size="lg"
                    className="mt-5 w-full"
                  >
                    {claimingId === entry.id ? "Claiming..." : "Claim loot"}
                    <ArrowRight className="size-4" />
                  </Button>
                </article>
              ))}
            </section>
          )
        )}
      </div>
    </RpgPage>
  );
}
