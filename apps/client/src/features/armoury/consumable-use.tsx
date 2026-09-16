import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ItemDefinition } from "@loot-game/game/items/catalog";
import { restorationAmount } from "@loot-game/game/items/consumables";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { queryClient, trpc, type trpcClient } from "@/utils/trpc";
import { userStore } from "@/utils/user-store";
import { finishAccountAction } from "@/features/social/social-queries";

type Consumable = Extract<ItemDefinition, { kind: "consumable" }>;
type Target = Awaited<
  ReturnType<typeof trpcClient.getConsumableTargets.query>
>[number];
const targetKey = (target: Target) =>
  `${target.dungeonId}:${target.characterId}`;

export function ConsumableUseForm({
  item,
  targets,
  pending,
  onUse,
}: {
  item: Consumable;
  targets: Target[];
  pending: boolean;
  onUse: (target: Target) => void;
}) {
  const [choice, setChoice] = useState("");
  const eligible = targets.filter(
    (target) => restorationAmount(item.restoration, target) > 0,
  );
  const target =
    eligible.find((target) => targetKey(target) === choice) ?? eligible[0];
  return (
    <section
      className="inventory-targeting space-y-3"
      aria-label="Use consumable outside battle"
    >
      <h3>Use between encounters</h3>
      {target ? (
        <>
          <label className="block space-y-2">
            <span>Character and expedition</span>
            <Select
              className="w-full"
              aria-label="Consumable target"
              value={targetKey(target)}
              disabled={pending}
              onChange={(event) => setChoice(event.target.value)}
            >
              {eligible.map((entry) => (
                <option key={targetKey(entry)} value={targetKey(entry)}>
                  {entry.name} · {entry.dungeonName} · Wave {entry.round + 1} ·{" "}
                  {entry.dungeonId.slice(-4)}
                </option>
              ))}
            </Select>
          </label>
          <p>
            {target.health}/{target.maxHealth} health · {target.mana}/
            {target.maxMana} mana
          </p>
          <Button disabled={pending} onClick={() => onUse(target)}>
            {pending
              ? "Using…"
              : `Use ${item.name} (+${restorationAmount(item.restoration, target)} ${item.restoration.resource})`}
          </Button>
        </>
      ) : (
        <p>
          No living character needs {item.restoration.resource} between
          encounters. Equip this item on a character to bring it into battle.
        </p>
      )}
    </section>
  );
}

export function ConsumableUse({ item }: { item: Consumable }) {
  const userId = userStore((state) => state.user?.id);
  const targets = useQuery(
    trpc.getConsumableTargets.queryOptions(undefined, {
      refetchInterval: 5000,
    }),
  );
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: trpc.getMyInventory.queryKey(),
      }),
      queryClient.invalidateQueries({
        queryKey: trpc.getConsumableTargets.queryKey(),
      }),
      queryClient.invalidateQueries({
        queryKey: trpc.dungeon.getRun.queryKey(),
      }),
      queryClient.invalidateQueries({ queryKey: trpc.preparation.pathKey() }),
    ]);
  const use = useMutation(
    trpc.useConsumable.mutationOptions({
      onSuccess: (result) =>
        finishAccountAction(userId, refresh, () => {
          toast.success(
            `Restored ${result.restored} ${item.restoration.resource}.`,
          );
        }),
      onError: () => finishAccountAction(userId, refresh, () => {}),
    }),
  );
  if (!item.useContexts.includes("outside-battle")) return null;
  if (targets.isLoading)
    return <p role="status">Finding expedition characters…</p>;
  if (targets.isError)
    return (
      <div role="alert">
        Could not load expedition characters.{" "}
        <Button variant="outline" onClick={() => void targets.refetch()}>
          Retry
        </Button>
      </div>
    );
  return (
    <>
      <ConsumableUseForm
        item={item}
        targets={targets.data ?? []}
        pending={use.isPending}
        onUse={(target) =>
          use.mutate({
            requestId: crypto.randomUUID(),
            itemType: item.type,
            dungeonId: target.dungeonId,
            characterId: target.characterId,
            expected: {
              round: target.round,
              health: target.health,
              mana: target.mana,
            },
          })
        }
      />
      {use.error && <p role="alert">{use.error.message}</p>}
    </>
  );
}
