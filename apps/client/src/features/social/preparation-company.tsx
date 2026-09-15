import { Button } from "@/components/ui/button";
import { Status } from "@/components/ui/status";
import { queryClient, trpc, type trpcClient } from "@/utils/trpc";
import { userStore } from "@/utils/user-store";
import { useIsMutating, useMutation } from "@tanstack/react-query";
import { Crown } from "lucide-react";

export type PreparationData = Awaited<
  ReturnType<typeof trpcClient.preparation.get.query>
>;
type Props = {
  id: string;
  revision: number;
  participants: PreparationData["participants"];
  connected: boolean;
  disabled?: boolean;
};

export function PreparationCompany({
  id,
  revision,
  participants,
  connected,
  disabled,
}: Props) {
  const userId = userStore((state) => state.user?.id);
  const self = participants.find(
    (participant) => participant.userId === userId,
  );
  const updatingBuild =
    useIsMutating({ mutationKey: trpc.character.pathKey() }) > 0;
  const ready = useMutation(
    trpc.preparation.ready.mutationOptions({
      onSettled: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: trpc.preparation.get.queryKey({ id }),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.dungeon.getRun.queryKey(),
          }),
        ]);
      },
    }),
  );
  return (
    <section
      className="expedition-departure space-y-4"
      aria-label="Party readiness"
    >
      <small>Your company</small>
      <h2>Two players. One expedition.</h2>
      <div className="space-y-3">
        {participants.map((participant) => (
          <div className="rpg-stone p-4" key={participant.userId}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="flex items-center gap-2">
                {participant.isHost ? <Crown size={16} /> : null}
                {participant.username}
                {participant.userId === userId ? " (you)" : ""}
              </strong>
              <span className="text-xs tracking-wider uppercase">
                {participant.isHost ? "Host" : "Guest"}
              </span>
            </div>
            <p className="mt-2">
              {participant.characterName ?? "Choosing a character"}
            </p>
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              <Status tone={participant.connected ? "success" : "warning"}>
                {participant.connected ? "Connected" : "Away"}
              </Status>
              <Status tone={participant.ready ? "success" : "neutral"}>
                {participant.ready ? "Ready" : "Not ready"}
              </Status>
            </div>
          </div>
        ))}
      </div>
      {participants.length < 2 ? (
        <p className="expedition-muted">
          Waiting for a friend to accept an invitation.
        </p>
      ) : null}
      {!disabled ? (
        <>
          <p className="expedition-muted">
            Ready up before every encounter. Changing a character, build or path
            clears readiness. Leaving this run's page disconnects you; you can
            return at any time.
          </p>
          <Button
            variant={self?.ready ? "outline" : "relic"}
            disabled={
              !connected ||
              !self?.characterId ||
              updatingBuild ||
              ready.isPending
            }
            onClick={() =>
              ready.mutate({
                id,
                ready: !self?.ready,
                expectedRevision: revision,
                expectedBuildRevision: self?.buildRevision ?? null,
              })
            }
          >
            {!connected
              ? "Connecting to this expedition…"
              : ready.isPending
                ? "Saving readiness…"
                : self?.ready
                  ? "Not ready"
                  : "I'm ready"}
          </Button>
        </>
      ) : null}
      {ready.error ? (
        <p className="expedition-error" role="alert">
          {ready.error.message}
        </p>
      ) : null}
    </section>
  );
}
