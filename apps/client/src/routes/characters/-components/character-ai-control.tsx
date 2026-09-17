import { useMutation, useQuery } from "@tanstack/react-query";
import { AiControlForm } from "@/components/ai-control-form";
import { queryClient, trpc } from "@/utils/trpc";
import { userStore } from "@/utils/user-store";
import { finishAccountAction } from "@/features/social/social-queries";
import { Button } from "@/components/ui/button";
import { CharacterSectionHeading } from "./character-ui";

export function CharacterAiControl({ characterId }: { characterId: string }) {
  const userId = userStore((state) => state.user?.id);
  const settings = useQuery(
    trpc.character.getAiControl.queryOptions({ characterId }),
  );
  const save = useMutation(
    trpc.character.setAiControl.mutationOptions({
      onSuccess: () =>
        finishAccountAction(
          userId,
          () =>
            queryClient.invalidateQueries(
              trpc.character.getAiControl.queryOptions({ characterId }),
            ),
          () => {},
        ),
    }),
  );
  return (
    <section
      className="character-build-panel character-commander"
      aria-label="Default Commander controls"
    >
      <CharacterSectionHeading title="Commander">
        Lead this character yourself, or let your commander follow your orders.
      </CharacterSectionHeading>
      {settings.isPending ? (
        <p role="status">Loading controls…</p>
      ) : settings.error ? (
        <p role="alert">
          Could not load Commander settings.{" "}
          <Button variant="outline" onClick={() => void settings.refetch()}>
            Retry
          </Button>
        </p>
      ) : (
        <AiControlForm
          key={`${userId}:${characterId}`}
          settings={settings.data}
          label="Control in new battles"
          collapsible={false}
          disabled={save.isPending}
          onSave={(next) => save.mutate({ characterId, settings: next })}
        />
      )}
      {save.error && <p role="alert">{save.error.message}</p>}
      <p className="character-panel-note">
        Applies to future battles. Your commander can finish a started battle
        while you're away. You can take over at any time.
      </p>
    </section>
  );
}
