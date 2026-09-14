import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { queryClient, trpc } from "@/utils/trpc";
import { userStore } from "@/utils/user-store";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { finishAccountAction } from "./social-queries";

export function AbandonRun({ id }: { id: string }) {
  const navigate = useNavigate();
  const userId = userStore((state) => state.user?.id);
  const abandon = useMutation(
    trpc.dungeon.abandon.mutationOptions({
      onSuccess: () =>
        finishAccountAction(
          userId,
          () =>
            Promise.all([
              queryClient.invalidateQueries({
                queryKey: trpc.dungeon.pathKey(),
              }),
              queryClient.invalidateQueries({
                queryKey: trpc.preparation.pathKey(),
              }),
              queryClient.invalidateQueries({
                queryKey: trpc.getMyLoot.queryKey(),
              }),
            ]),
          async () => {
            toast.success(
              "Expedition abandoned. Earned rewards remain available.",
            );
            await navigate({ to: "/dungeons/$id", params: { id } });
          },
        ),
    }),
  );
  return (
    <div className="space-y-3">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" disabled={abandon.isPending}>
            {abandon.isPending ? "Ending the expedition…" : "Abandon this run"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              End this expedition for both players?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Neither player can continue this run or its active battle. Rewards
              already earned, including unclaimed loot, and saved replays stay
              available. Your other expeditions continue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep the run</AlertDialogCancel>
            <AlertDialogAction onClick={() => abandon.mutate({ id })}>
              Abandon run
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {abandon.error ? (
        <p role="alert" className="expedition-error">
          {abandon.error.message}
        </p>
      ) : null}
    </div>
  );
}
