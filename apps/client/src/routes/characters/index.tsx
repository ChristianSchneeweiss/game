import { Button } from "@/components/ui/button";
import { queryClient, trpc } from "@/utils/trpc";
import { userStore } from "@/utils/user-store";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, PlusIcon, Shield, Sparkles, Zap } from "lucide-react";

export const Route = createFileRoute("/characters/")({
  component: CharactersComponent,
});

function CharactersComponent() {
  const { user } = userStore();
  const { mutate: createCharacter } = useMutation(
    trpc.character.createCharacter.mutationOptions(),
  );
  const { data: characters, refetch: refetchCharacters } = useQuery(
    trpc.character.getCharacters.queryOptions(undefined, {
      enabled: !!user,
      staleTime: 60_000,
    }),
  );

  const ensureCharacterDetail = (id: string) => {
    queryClient.ensureQueryData(
      trpc.character.getCharacter.queryOptions(
        { id },
        {
          staleTime: 60_000,
        },
      ),
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      {/* Header Section */}
      <div className="mb-8 text-center">
        <h1 className="mb-2 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-4xl font-bold text-transparent">
          🧙‍♂️ CHARACTER HALL 🧙‍♂️
        </h1>
        <div className="mx-auto h-1 w-32 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500"></div>
      </div>

      <div className="mx-auto max-w-6xl">
        {/* Create Character Section */}
        <div className="mb-8 flex justify-center">
          <Button
            size="lg"
            className="bg-gradient-to-r from-green-600 to-green-500 px-8 py-3 text-lg font-bold text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:from-green-500 hover:to-green-400"
            onClick={async () => {
              createCharacter();
              refetchCharacters();
            }}
          >
            <PlusIcon className="mr-2 h-5 w-5" />
            Create New Character
          </Button>
        </div>

        {/* Characters Grid */}
        {characters && characters.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-blue-300">
              <Shield className="h-6 w-6" />
              YOUR CHARACTERS
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {characters.map((character) => (
                <div
                  onMouseEnter={() => ensureCharacterDetail(character.id)}
                  key={character.id}
                  className="group hover:shadow-3xl relative rounded-xl border-2 bg-gradient-to-br from-slate-800/90 to-slate-900/90 p-6 shadow-2xl backdrop-blur-sm transition-all duration-300 hover:scale-105"
                >
                  {/* Character Header */}
                  <div className="mb-4 flex items-center gap-3">
                    <span className="text-3xl">🧙‍♂️</span>
                    <div className="flex-1">
                      <Link
                        className="group-hover:underline"
                        to="/characters/$character-id"
                        params={{ "character-id": character.id }}
                      >
                        <h3 className="text-xl font-bold text-white">
                          {character.name}
                        </h3>
                      </Link>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 px-3 py-1 text-sm font-bold text-black">
                          Level {character.level}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Health & Mana */}
                  <div className="mb-4 grid grid-cols-2 gap-4">
                    <div className="rounded-lg border border-slate-600 bg-slate-800/50 p-3">
                      <div className="mb-1 flex items-center gap-2 text-sm">
                        <Heart className="h-4 w-4 text-red-300" />
                        <span className="text-red-300">Health</span>
                      </div>
                      <div className="text-lg font-bold text-white">
                        {character.health}
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-600 bg-slate-800/50 p-3">
                      <div className="mb-1 flex items-center gap-2 text-sm">
                        <Zap className="h-4 w-4 text-blue-300" />
                        <span className="text-blue-300">Mana</span>
                      </div>
                      <div className="text-lg font-bold text-white">
                        {character.mana}
                      </div>
                    </div>
                  </div>

                  {/* Core Stats */}
                  <div className="mb-4">
                    <h4 className="mb-2 flex items-center gap-1 text-sm font-bold text-blue-300">
                      <Shield className="h-4 w-4" />
                      Attributes
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {["intelligence", "vitality", "agility", "strength"].map(
                        (attr) => (
                          <div
                            key={attr}
                            className="rounded border border-slate-600 bg-slate-800/50 p-2"
                          >
                            <div className="text-xs text-gray-400">
                              {attr.charAt(0).toUpperCase() + attr.slice(1)}
                            </div>
                            <div className="text-sm font-bold text-white">
                              {
                                character.baseAttributes[
                                  attr as keyof typeof character.baseAttributes
                                ]
                              }
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>

                  {/* Equipped Spells */}
                  <div>
                    <h4 className="mb-2 flex items-center gap-1 text-sm font-bold text-purple-300">
                      <Sparkles className="h-4 w-4" />
                      Equipped Spells
                    </h4>
                    <div className="space-y-1">
                      {character.spells.slice(0, 3).map((spell) => (
                        <div
                          key={`equipped-${spell.config.id}`}
                          className="flex items-center gap-2 rounded border border-slate-600 bg-slate-800/50 p-2"
                        >
                          <span className="text-sm">⚡</span>
                          <span className="text-sm font-medium text-white capitalize">
                            {spell.config.name}
                          </span>
                        </div>
                      ))}
                      {character.spells.length > 3 && (
                        <div className="text-xs text-gray-400">
                          +{character.spells.length - 3} more spells
                        </div>
                      )}
                    </div>
                  </div>

                  {/* View Character Link */}
                  <div className="mt-4">
                    <Link
                      to="/characters/$character-id"
                      params={{ "character-id": character.id }}
                    >
                      <Button
                        size="sm"
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-500 hover:to-blue-400"
                      >
                        View Character
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {characters && characters.length === 0 && (
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-slate-800 to-slate-900">
              <span className="text-6xl">🧙‍♂️</span>
            </div>
            <h3 className="mb-2 text-2xl font-bold text-white">
              No Characters Yet
            </h3>
            <p className="mb-6 text-gray-400">
              Create your first character to begin your adventure!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
