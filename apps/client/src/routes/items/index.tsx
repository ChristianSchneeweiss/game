import { Button } from "@/components/ui/button";
import { CollectionHeader } from "@/components/collection-ui";
import { OwnedInventory } from "@/features/armoury/owned-armoury";
import { RpgPage } from "@/components/rpg-ui";
import { trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/items/")({ component: RouteComponent });

function RouteComponent() {
  const {
    data: items,
    isLoading,
    isError,
    refetch,
  } = useQuery(trpc.getMyInventory.queryOptions());
  const ownedItems = items ?? [];
  const equippedCount = ownedItems.filter(
    (item) => item.kind === "equipment" && item.equippedBy !== null,
  ).length;
  return (
    <RpgPage>
      <div className="space-y-8">
        <CollectionHeader
          eyebrow="Your account collection"
          title="The inventory"
          description="Equipment, consumables, and materials shared by your characters. Manage gear from a character’s loadout."
          summary={[
            {
              label: "Entries",
              value: isLoading || isError ? "—" : ownedItems.length,
            },
            {
              label: "Equipped",
              value: isLoading || isError ? "—" : equippedCount,
            },
          ]}
          actions={
            <Button asChild variant="outline">
              <Link to="/dungeons">
                Find more items <ArrowRight className="size-4" />
              </Link>
            </Button>
          }
        />
        <section aria-label="My items">
          <OwnedInventory
            items={ownedItems}
            loading={isLoading}
            error={isError}
            onRetry={() => void refetch()}
          />
        </section>
      </div>
    </RpgPage>
  );
}
