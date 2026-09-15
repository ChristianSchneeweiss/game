import { useState } from "react";
import { SignInButton } from "@clerk/clerk-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Feedback } from "@/components/ui/status";
import { RpgEmptyState, RpgPage } from "@/components/rpg-ui";
import { queryClient, trpc } from "@/utils/trpc";
import { userStore } from "@/utils/user-store";
import { CharacterRosterCard } from "./-components/character-roster-card";
import "./characters.css";

export const Route = createFileRoute("/characters/")({
  component: CharactersComponent,
});

function CharactersComponent() {
  const user = userStore((state) => state.user);
  const [search, setSearch] = useState("");
  const creation = useMutation(
    trpc.character.createCharacter.mutationOptions({
      onSuccess: async () => {
        setSearch("");
        await queryClient.invalidateQueries(
          trpc.character.getCharacters.queryOptions(),
        );
      },
    }),
  );
  const { data: characters = [], isLoading } = useQuery(
    trpc.character.getCharacters.queryOptions(undefined, {
      enabled: !!user,
      staleTime: 60_000,
      throwOnError: true,
    }),
  );
  const visibleCharacters = characters.filter((character) =>
    character.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const unspentBuilds = characters.filter(
    (character) => character.statPointsAvailable > 0,
  ).length;
  const prefetchCharacter = (id: string) => {
    void queryClient.prefetchQuery(
      trpc.character.getCharacter.queryOptions({ id }, { staleTime: 60_000 }),
    );
  };

  return (
    <RpgPage className="character-page">
      <header className="character-page-heading">
        <div>
          <p className="character-eyebrow">The company you keep</p>
          <h1>Your characters</h1>
          <p className="character-page-intro">
            A collection of adventurers. A different way to face the dungeon.
          </p>
        </div>
        {user ? (
          <Button
            pending={creation.isPending}
            onClick={() => creation.mutate()}
          >
            <Plus aria-hidden="true" />
            {creation.isPending ? "Creating…" : "Create character"}
          </Button>
        ) : (
          <SignInButton mode="modal">
            <Button>Sign in</Button>
          </SignInButton>
        )}
      </header>
      {creation.error && <Feedback error>{creation.error.message}</Feedback>}
      {characters.length > 0 && (
        <div className="character-roster-toolbar">
          <div className="character-roster-count">
            <Users size={18} aria-hidden="true" />
            <span>
              <strong>{characters.length}</strong>{" "}
              {characters.length === 1 ? "adventurer" : "adventurers"}
            </span>
            {unspentBuilds > 0 && (
              <span className="character-roster-notice">
                {unspentBuilds} with unspent points
              </span>
            )}
          </div>
          <div className="character-search">
            <Search size={16} aria-hidden="true" />
            <Input
              aria-label="Search characters"
              placeholder="Find a character…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Clear character search"
                onClick={() => setSearch("")}
              >
                <X />
              </Button>
            )}
          </div>
        </div>
      )}
      {isLoading ? (
        <div
          className="character-roster-grid"
          role="status"
          aria-label="Loading characters"
        >
          {[0, 1, 2].map((index) => (
            <div className="character-roster-skeleton" key={index}>
              <div />
              <div />
              <div />
            </div>
          ))}
        </div>
      ) : visibleCharacters.length > 0 ? (
        <div className="character-roster-grid">
          {visibleCharacters.map((character) => (
            <CharacterRosterCard
              key={character.id}
              character={character}
              onPrefetch={() => prefetchCharacter(character.id)}
            />
          ))}
        </div>
      ) : (
        <RpgEmptyState
          icon={<Users size={32} />}
          title={
            characters.length > 0
              ? "No characters found"
              : "Your roster is empty"
          }
          copy={
            characters.length > 0
              ? "Try a different name or clear your search."
              : user
                ? "Create your first adventurer, then choose the spells and equipment that will define their build."
                : "Sign in to create your first adventurer and begin your collection."
          }
        />
      )}
    </RpgPage>
  );
}
