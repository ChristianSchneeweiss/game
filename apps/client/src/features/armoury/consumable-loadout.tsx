import { useMutation, useQuery } from "@tanstack/react-query";
import { getItemDefinitions } from "@loot-game/game/items/catalog";
import type { ConsumableLoadout as Loadout } from "@loot-game/game/items/consumables";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { queryClient, trpc } from "@/utils/trpc";
import { userStore } from "@/utils/user-store";
import { finishAccountAction } from "@/features/social/social-queries";

const supplies = getItemDefinitions().filter(
  (item) => item.kind === "consumable" && item.useContexts.includes("battle"),
);
export function ConsumableLoadout({ characterId }: { characterId: string }) {
  const userId = userStore((state) => state.user?.id);
  const loadout = useQuery(
    trpc.character.getConsumableLoadout.queryOptions({ characterId }),
  );
  const inventory = useQuery(trpc.getMyInventory.queryOptions());
  const save = useMutation(
    trpc.character.setConsumableLoadout.mutationOptions({
      onSuccess: () =>
        finishAccountAction(
          userId,
          () =>
            Promise.all([
              queryClient.invalidateQueries({
                queryKey: trpc.character.getConsumableLoadout.queryKey({
                  characterId,
                }),
              }),
              queryClient.invalidateQueries({
                queryKey: trpc.character.pathKey(),
              }),
              queryClient.invalidateQueries({
                queryKey: trpc.preparation.pathKey(),
              }),
            ]),
          () => {},
        ),
    }),
  );
  return (
    <section
      className="expedition-equipment space-y-4"
      aria-label="Consumable loadout"
    >
      <h3>Battle supplies</h3>
      <p className="expedition-muted">
        Two slots, one bottle per slot per encounter. Drinking uses your action
        and restores only you. Supplies are taken from inventory when the
        encounter starts; unused bottles return afterward.
      </p>
      {loadout.isLoading || inventory.isLoading ? (
        <p role="status">Loading supplies…</p>
      ) : loadout.isError || inventory.isError ? (
        <div role="alert">
          Could not load supplies.{" "}
          <Button
            variant="outline"
            onClick={() => {
              void loadout.refetch();
              void inventory.refetch();
            }}
          >
            Retry
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {([0, 1] as const).map((slot) => (
            <label key={slot} className="space-y-2">
              <span>Consumable slot {slot + 1}</span>
              <Select
                className="w-full"
                aria-label={`Consumable slot ${slot + 1}`}
                value={
                  (save.isPending
                    ? save.variables?.loadout[slot]
                    : loadout.data?.[slot]) ?? ""
                }
                disabled={save.isPending}
                onChange={(event) => {
                  const next: Loadout = [...loadout.data!];
                  next[slot] = event.target.value || null;
                  save.mutate({ characterId, loadout: next });
                }}
              >
                <option value="">Empty</option>
                {supplies.map((item) => (
                  <option key={item.type} value={item.type}>
                    {item.name} ·{" "}
                    {inventory.data?.find((entry) => entry.type === item.type)
                      ?.quantity ?? 0}{" "}
                    in inventory
                  </option>
                ))}
              </Select>
            </label>
          ))}
        </div>
      )}
      {save.error && <p role="alert">{save.error.message}</p>}
    </section>
  );
}
