import { Button } from "@/components/ui/button";
import { CollectionHeader } from "@/components/collection-ui";
import { OwnedArmoury } from "@/features/armoury/owned-armoury";
import { RpgPage } from "@/components/rpg-ui";
import { trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/items/")({ component: RouteComponent });

function RouteComponent() {
  const { data: equipment, isLoading } = useQuery(
    trpc.getMyEquipment.queryOptions(undefined, { throwOnError: true }),
  );
  const ownedEquipment = equipment ?? [];
  const equippedCount = ownedEquipment.filter(
    (item) => item.equippedBy !== null,
  ).length;
  return (
    <RpgPage>
      <div className="space-y-8">
        <CollectionHeader
          eyebrow="Your equipment vault"
          title="The armoury"
          description="Every piece you own, ready to shape a build. Manage equipment from a character’s loadout."
          summary={[
            { label: "Items", value: isLoading ? "—" : ownedEquipment.length },
            { label: "Equipped", value: isLoading ? "—" : equippedCount },
          ]}
          actions={
            <Button asChild variant="outline">
              <Link to="/dungeons">
                Find more gear <ArrowRight className="size-4" />
              </Link>
            </Button>
          }
        />
        <section aria-label="My items">
          <OwnedArmoury equipment={ownedEquipment} loading={isLoading} />
        </section>
      </div>
    </RpgPage>
  );
}
