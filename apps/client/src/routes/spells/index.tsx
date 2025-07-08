import { Button } from "@/components/ui/button";
import { trpc } from "@/utils/trpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/spells/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: spells, refetch: refetchSpells } = useQuery(
    trpc.getMySpells.queryOptions(),
  );
  const { mutateAsync: unequipSpell } = useMutation(
    trpc.unequipSpell.mutationOptions({
      onSuccess: () => {
        refetchSpells();
      },
    }),
  );
  const { mutateAsync: createSpell } = useMutation(
    trpc.createSpell.mutationOptions({
      onSuccess: () => {
        refetchSpells();
      },
    }),
  );

  return (
    <div className="m-6">
      <div className="space-y-4">
        <Button onClick={() => createSpell({ type: "fireball" })}>
          Create Fireball
        </Button>
        <h2 className="text-2xl font-bold">My Spells</h2>
        <div className="grid gap-3">
          {spells &&
            spells.map((spell) => (
              <div
                key={spell.id}
                className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm"
              >
                <div>
                  <p className="font-medium capitalize">{spell.type}</p>
                  <p className="text-sm text-muted-foreground">
                    ID: {spell.id}
                  </p>
                </div>
                {spell.equippedBy !== null && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => unequipSpell({ spellId: spell.id })}
                  >
                    Unequip
                  </Button>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
