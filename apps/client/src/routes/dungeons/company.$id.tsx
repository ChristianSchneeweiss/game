import { PartyCard } from "@/features/expedition/run-ui";
import { InviteFriends } from "@/features/social/invite-friends";
import {
  PreparationCompany,
  type PreparationData,
} from "@/features/social/preparation-company";
import {
  LeavePreparation,
  PreparationDungeon,
  StartPreparation,
} from "@/features/social/preparation-actions";
import {
  PreparationBuild,
  type OwnedCharacter,
} from "@/features/social/preparation-build";
import { refreshSocial } from "@/features/social/social-queries";
import { usePreparationPresence } from "@/features/social/use-preparation-presence";
import { trpc } from "@/utils/trpc";
import { userStore } from "@/utils/user-store";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import "@/features/expedition/expedition.css";

export const Route = createFileRoute("/dungeons/company/$id")({
  component: SharedPreparation,
});

function SharedPreparation() {
  const { id } = Route.useParams();
  const userId = userStore((state) => state.user?.id);
  const preparationQuery = useQuery(
    trpc.preparation.get.queryOptions(
      { id },
      {
        refetchInterval: (query) =>
          query.state.error?.data?.code === "FORBIDDEN" ||
          query.state.error?.data?.code === "NOT_FOUND" ||
          query.state.data?.closedAt
            ? false
            : 2000,
        retry: false,
      },
    ),
  );
  const characterQuery = useQuery(trpc.character.getCharacters.queryOptions());
  const preparation = preparationQuery.data;
  const characters = characterQuery.data;
  const error = preparationQuery.error ?? characterQuery.error;
  if (error)
    return (
      <main id="main-content" tabIndex={-1} className="expedition">
        <div className="expedition-shell">
          <section className="expedition-departure" role="alert">
            <h1>Preparation unavailable</h1>
            <p>
              {error.data?.code === "FORBIDDEN" ||
              error.data?.code === "NOT_FOUND"
                ? "You are no longer part of this preparation. Your other expeditions and earned rewards remain available."
                : "We couldn't synchronize this preparation. Readiness is paused until you reconnect."}
            </p>
            <Link
              className="rpg-button rpg-button-primary expedition-button"
              to="/dungeons"
            >
              Return to expeditions →
            </Link>
            <button
              className="expedition-text-link"
              onClick={() => {
                void preparationQuery.refetch();
                void characterQuery.refetch();
              }}
            >
              Check again
            </button>
          </section>
        </div>
      </main>
    );
  if (!preparation || !characters)
    return (
      <main id="main-content" tabIndex={-1} className="expedition">
        <div className="expedition-shell" role="status">
          Loading shared preparation…
        </div>
      </main>
    );
  const host = preparation.hostUserId === userId;
  return (
    <main id="main-content" tabIndex={-1} className="expedition">
      <div className="expedition-shell">
        <Link className="expedition-back" to="/dungeons">
          ← All expeditions
        </Link>
        <header className="expedition-title">
          <div>
            <p className="expedition-eyebrow">
              Shared preparation /{" "}
              {host ? "You are the host" : "Your host leads the expedition"}
            </p>
            <h1>{preparation.name}</h1>
            <p>
              Choose one of your characters. Both owners control their own
              turns, keep their own rewards, and agree before each encounter.
            </p>
          </div>
          <span className="expedition-seal" aria-hidden="true">
            2<small>PLAYERS</small>
          </span>
        </header>
        {preparation.closedAt ? (
          <section className="expedition-departure">
            <h2>This preparation is closed.</h2>
            <p>
              Its invitations are no longer available. Your other expeditions
              are still waiting.
            </p>
            <Link
              className="rpg-button rpg-button-primary expedition-button"
              to="/dungeons"
            >
              Return to expeditions →
            </Link>
          </section>
        ) : preparation.dungeonId ? (
          <section className="expedition-departure">
            <h2>Your expedition has started.</h2>
            <p>
              Your two characters are fixed for this run. Rejoin the company to
              continue.
            </p>
            <Link
              className="rpg-button rpg-button-primary expedition-button"
              to="/dungeons/$id"
              params={{ id: preparation.dungeonId }}
            >
              Open shared run →
            </Link>
          </section>
        ) : (
          <PreparationForm
            key={id}
            preparation={preparation}
            characters={characters}
          />
        )}
      </div>
    </main>
  );
}

function PreparationForm({
  preparation,
  characters,
}: {
  preparation: PreparationData;
  characters: OwnedCharacter[];
}) {
  const userId = userStore((state) => state.user?.id);
  const connected = usePreparationPresence(preparation.id);
  const host = preparation.hostUserId === userId;
  const self = preparation.participants.find(
    (participant) => participant.userId === userId,
  );
  const selected = characters.find(
    (character) => character.id === self?.characterId,
  );
  const select = useMutation(
    trpc.preparation.selectCharacter.mutationOptions({
      onSuccess: refreshSocial,
    }),
  );
  return (
    <div className="expedition-layout">
      <section className="space-y-6">
        {host ? (
          <PreparationDungeon preparation={preparation} />
        ) : (
          <p className="expedition-muted">
            Only the host changes the dungeon and starts encounters.
          </p>
        )}
        <div className="expedition-section-heading">
          <div>
            <small>Your character</small>
            <h2>Choose your adventurer</h2>
          </div>
          <span>One owned character</span>
        </div>
        {characters.length === 0 ? (
          <p>
            Create an adventurer in{" "}
            <Link className="expedition-text-link" to="/characters">
              your roster
            </Link>{" "}
            to join.
          </p>
        ) : (
          <div className="expedition-roster">
            {characters.map((character) => (
              <PartyCard
                key={character.id}
                character={character}
                selected={selected?.id === character.id}
                onSelect={
                  select.isPending
                    ? undefined
                    : () =>
                        select.mutate({
                          id: preparation.id,
                          characterId: character.id,
                        })
                }
              />
            ))}
          </div>
        )}
        {select.error ? (
          <p className="expedition-error" role="alert">
            {select.error.message}
          </p>
        ) : null}
        {host && !preparation.guestUserId ? (
          <InviteFriends lobbyId={preparation.id} />
        ) : null}
        <LeavePreparation id={preparation.id} host={host} />
      </section>
      <aside className="expedition-prep-side space-y-5">
        <PreparationCompany
          id={preparation.id}
          revision={preparation.revision}
          participants={preparation.participants}
          connected={connected}
        />
        {host ? (
          <StartPreparation preparation={preparation} connected={connected} />
        ) : (
          <p className="expedition-muted" role="status">
            The host starts once you're both connected and ready.
          </p>
        )}
        {selected ? <PreparationBuild character={selected} /> : null}
      </aside>
    </div>
  );
}
