import { SkillIcon } from "@/components/skill-icon";
import { queryClient, trpc } from "@/utils/trpc";
import type { LootEntity } from "@loot-game/game/types";
import { useMutation } from "@tanstack/react-query";
import { groupDrops, readable } from "./run-info";

type Reward = { id: string; items: LootEntity[]; battleId: string };
export function RunRewards({
  rewards,
  pending = false,
}: {
  rewards: Reward[];
  pending?: boolean;
}) {
  const claim = useMutation(
    trpc.claimLoot.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: trpc.dungeon.getRun.queryKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.dungeon.getBattleContext.queryKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.getMyLoot.queryKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.getMySpells.queryKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.getMyEquipment.queryKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.getMyPassiveSkills.queryKey(),
          }),
        ]);
      },
    }),
  );
  const itemRewards = rewards.filter((reward) => reward.items.length > 0);
  return (
    <section className="expedition-rewards" aria-label="Run rewards">
      <div className="expedition-section-heading">
        <div>
          <small>From the expedition</small>
          <h2>Your spoils</h2>
        </div>
        <span>✦</span>
      </div>
      {pending ? (
        <p role="status">Securing your rewards and saving the party…</p>
      ) : itemRewards.length === 0 ? (
        <p className="expedition-muted">
          No unclaimed rewards. Collected spells are in your spellbook.
        </p>
      ) : (
        itemRewards.map((reward) => (
          <div className="expedition-reward-bundle" key={reward.id}>
            {groupDrops(reward.items).map((drop) => (
              <div className="expedition-drop" key={drop.type}>
                <SkillIcon type={drop.type} size={48} />
                <div>
                  <small>{drop.label}</small>
                  <strong>
                    {readable(drop.type)}
                    {drop.count > 1 ? ` ×${drop.count}` : ""}
                  </strong>
                </div>
              </div>
            ))}
            <button
              className="expedition-button"
              disabled={claim.isPending}
              onClick={() => claim.mutate(reward.id)}
            >
              {claim.isPending && claim.variables === reward.id
                ? "Collecting…"
                : "Collect rewards"}
            </button>
          </div>
        ))
      )}
      {claim.error && (
        <p role="alert" className="expedition-error">
          {claim.error.message}
        </p>
      )}
    </section>
  );
}
