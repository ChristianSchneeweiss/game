import { queryClient, trpc } from "@/utils/trpc";

export async function refreshBuilds() {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: trpc.preparation.pathKey() }),
    queryClient.invalidateQueries({
      queryKey: trpc.character.getCharacters.queryKey(),
    }),
    queryClient.invalidateQueries({
      queryKey: trpc.character.getCharacter.queryKey(),
    }),
    queryClient.invalidateQueries({ queryKey: trpc.getMySpells.queryKey() }),
    queryClient.invalidateQueries({ queryKey: trpc.getMyEquipment.queryKey() }),
    queryClient.invalidateQueries({ queryKey: trpc.getMyInventory.queryKey() }),
    queryClient.invalidateQueries({ queryKey: trpc.dungeon.getRun.queryKey() }),
  ]);
}
