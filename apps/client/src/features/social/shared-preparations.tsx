import { RpgPanel } from "@/components/rpg-ui";
import { trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

export function SharedPreparations() {
  const { data, error } = useQuery(
    trpc.preparation.list.queryOptions(undefined, { refetchInterval: 5000 }),
  );
  if (error)
    return (
      <p className="expedition-error" role="alert">
        {error.message}
      </p>
    );
  const waiting =
    data?.filter(
      (preparation) => !preparation.closedAt && !preparation.dungeonId,
    ) ?? [];
  if (!waiting.length) return null;
  return (
    <section className="space-y-5">
      <div>
        <p className="rpg-title text-xs text-[#cfbf97]">Camps on the trail</p>
        <h2 className="rpg-heading mt-2 text-3xl">Shared preparations</h2>
        <p className="rpg-copy mt-3">
          Each camp waits independently. You can play other dungeons with the
          same characters while your companion is away.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {waiting.map((preparation) => (
          <RpgPanel key={preparation.id} contentClassName="space-y-3 p-5">
            <h3 className="rpg-heading text-2xl">{preparation.name}</h3>
            <p className="rpg-copy">
              {preparation.participants
                .map(
                  (participant) =>
                    `${participant.username}${participant.isHost ? " · Host" : ""}`,
                )
                .join(" & ")}
            </p>
            <Link
              className="expedition-text-link"
              to="/dungeons/company/$id"
              params={{ id: preparation.id }}
            >
              Return to preparation →
            </Link>
          </RpgPanel>
        ))}
      </div>
    </section>
  );
}
