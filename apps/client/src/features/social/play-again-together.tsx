import { Button } from "@/components/ui/button";
import type { DungeonRunData } from "@/features/expedition/run-info";
import { trpc } from "@/utils/trpc";
import { userStore } from "@/utils/user-store";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { finishAccountAction, refreshSocial } from "./social-queries";

export function PlayAgainTogether({ run }: { run: DungeonRunData }) {
  const navigate = useNavigate();
  const userId = userStore((state) => state.user?.id);
  const eligible = run.shared?.canPlayAgain;
  const again = useMutation(
    trpc.preparation.playAgain.mutationOptions({
      onSuccess: ({ id }) =>
        finishAccountAction(userId, refreshSocial, () =>
          navigate({ to: "/dungeons/company/$id", params: { id } }),
        ),
    }),
  );
  return (
    <div className="space-y-3">
      <Button
        className="w-full"
        variant="relic"
        disabled={!eligible || again.isPending}
        onClick={() => again.mutate({ dungeonId: run.id })}
      >
        {again.isPending
          ? "Preparing the next chapter…"
          : "Play again together →"}
      </Button>
      <p className="expedition-muted">
        {eligible
          ? "Keep your pair and host. Choose fresh characters and ready up again; your companion can join from the expedition board."
          : "You can prepare another run together while you remain friends."}
      </p>
      {again.error ? (
        <p className="expedition-error" role="alert">
          {again.error.message}
        </p>
      ) : null}
    </div>
  );
}
