import { queryClient, trpc } from "@/utils/trpc";
import { userStore } from "@/utils/user-store";

/** Mutation callbacks can outlive the account's mounted query provider. */
export async function finishAccountAction(
  userId: string | undefined,
  refresh: () => Promise<unknown>,
  onCurrentAccount: () => void | Promise<unknown>,
) {
  if (!userId || userStore.getState().user?.id !== userId) return;
  await refresh();
  if (userStore.getState().user?.id !== userId) return;
  await onCurrentAccount();
}

/** All social mutations can change invitations and waiting preparations together. */
export async function refreshSocial() {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: trpc.social.pathKey() }),
    queryClient.invalidateQueries({ queryKey: trpc.preparation.pathKey() }),
    queryClient.invalidateQueries({ queryKey: trpc.dungeon.getRun.queryKey() }),
  ]);
}

export function dungeonName(key: string) {
  return key === "dungeon1"
    ? "Avalanche Lair"
    : key
        .replaceAll("-", " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
