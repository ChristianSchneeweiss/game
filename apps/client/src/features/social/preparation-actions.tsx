import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { queryClient, trpc } from "@/utils/trpc";
import { userStore } from "@/utils/user-store";
import {
  DungeonKeySchema,
  type DungeonKey,
} from "@loot-game/game/dungeons/dungeon-keys";
import { useIsMutating, useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import type { PreparationData } from "./preparation-company";
import { dungeonName, refreshSocial } from "./social-queries";

export function CreateSharedPreparation({
  dungeonKey,
}: {
  dungeonKey: DungeonKey;
}) {
  const navigate = useNavigate();
  const userId = userStore((state) => state.user?.id);
  const together = useMutation(
    trpc.preparation.create.mutationOptions({
      onSuccess: async ({ id }) => {
        if (userStore.getState().user?.id !== userId) return;
        await queryClient.invalidateQueries({
          queryKey: trpc.preparation.list.queryKey(),
        });
        if (userStore.getState().user?.id === userId)
          await navigate({ to: "/dungeons/company/$id", params: { id } });
      },
    }),
  );
  return (
    <>
      <button
        className="rpg-button rpg-button-outline mb-3 w-full"
        disabled={together.isPending}
        onClick={() => together.mutate({ key: dungeonKey, branching: true })}
      >
        {together.isPending
          ? "Making camp…"
          : "Invite friend · Prepare together"}
      </button>
      {together.error ? (
        <p className="expedition-error" role="alert">
          {together.error.message}
        </p>
      ) : null}
    </>
  );
}

export function PreparationDungeon({
  preparation,
}: {
  preparation: PreparationData;
}) {
  const dungeon = useMutation(
    trpc.preparation.setDungeon.mutationOptions({ onSuccess: refreshSocial }),
  );
  return (
    <div className="space-y-2">
      <label htmlFor="shared-dungeon" className="expedition-eyebrow">
        Host's dungeon choice
      </label>
      <Select
        id="shared-dungeon"
        value={preparation.key}
        disabled={dungeon.isPending}
        onChange={(event) =>
          dungeon.mutate({
            id: preparation.id,
            key: DungeonKeySchema.parse(event.target.value),
            branching: true,
          })
        }
      >
        {DungeonKeySchema.options.map(({ value: key }) => (
          <option key={key} value={key}>
            {dungeonName(key)}
          </option>
        ))}
      </Select>
      {dungeon.error ? (
        <p className="expedition-error" role="alert">
          {dungeon.error.message}
        </p>
      ) : null}
    </div>
  );
}

export function StartPreparation({
  preparation,
  connected,
}: {
  preparation: PreparationData;
  connected: boolean;
}) {
  const navigate = useNavigate();
  const userId = userStore((state) => state.user?.id);
  const preparing =
    useIsMutating({ mutationKey: trpc.preparation.pathKey() }) > 0;
  const building = useIsMutating({ mutationKey: trpc.character.pathKey() }) > 0;
  const start = useMutation(
    trpc.preparation.start.mutationOptions({
      onSuccess: async (result) => {
        if (userStore.getState().user?.id !== userId) return;
        await Promise.all([
          refreshSocial(),
          queryClient.invalidateQueries({
            queryKey: trpc.dungeon.allDungeons.queryKey(),
          }),
        ]);
        if (userStore.getState().user?.id === userId)
          await navigate({
            to: "/battle/$id",
            params: { id: result.battleId },
          });
      },
      onError: refreshSocial,
    }),
  );
  return (
    <>
      <button
        className="rpg-button rpg-button-primary expedition-button"
        disabled={!connected || !preparation.canStart || preparing || building}
        onClick={() =>
          start.mutate({
            id: preparation.id,
            expectedRevision: preparation.revision,
          })
        }
      >
        {start.isPending ? "Entering together…" : "Start encounter together →"}
      </button>
      {start.error ? (
        <p className="expedition-error" role="alert">
          {start.error.message}
        </p>
      ) : null}
    </>
  );
}

export function LeavePreparation({ id, host }: { id: string; host: boolean }) {
  const navigate = useNavigate();
  const userId = userStore((state) => state.user?.id);
  const leave = useMutation(
    trpc.preparation.leave.mutationOptions({
      onSuccess: async () => {
        if (userStore.getState().user?.id !== userId) return;
        await refreshSocial();
        if (userStore.getState().user?.id !== userId) return;
        toast.success(
          host
            ? "Preparation closed. Its invitations are cancelled."
            : "You left preparation. The host can invite another friend.",
        );
        await navigate({ to: "/dungeons" });
      },
    }),
  );
  return (
    <div className="border-t border-[#8a7753]/30 pt-5">
      <p className="expedition-muted">
        {host
          ? "Closing preparation ends this camp and cancels its invitations."
          : "Leaving preparation frees your place. Your host keeps this camp."}{" "}
        Going away keeps preparation saved.
      </p>
      <Button
        variant="outline"
        disabled={leave.isPending}
        onClick={() => leave.mutate({ id })}
      >
        {host ? "Close preparation" : "Leave preparation"}
      </Button>
      {leave.error ? (
        <p className="expedition-error" role="alert">
          {leave.error.message}
        </p>
      ) : null}
    </div>
  );
}
