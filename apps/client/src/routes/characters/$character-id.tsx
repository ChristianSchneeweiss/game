import { Button } from "@/components/ui/button";
import { trpc } from "@/utils/trpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Sparkles, Wand2Icon } from "lucide-react";
import { toast } from "sonner";
import { CharacterCard } from "./-components/character-card";

export const Route = createFileRoute("/characters/$character-id")({
  component: RouteComponent,
});

function RouteComponent() {
  const { "character-id": characterId } = Route.useParams();
  const { data: character, refetch: refetchCharacter } = useQuery(
    trpc.character.getCharacter.queryOptions({ id: characterId }),
  );
  const { data: spells, refetch: refetchSpells } = useQuery(
    trpc.getMySpells.queryOptions(),
  );
  const { mutateAsync: equipSpell } = useMutation(
    trpc.character.equipSpell.mutationOptions({
      onSuccess: () => {
        refetchCharacter();
        refetchSpells();
      },
    }),
  );

  const availableSpells =
    spells?.filter((spell) => spell.equippedBy === null) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/characters"
          className="mb-4 inline-flex items-center gap-2 text-blue-300 transition-colors hover:text-blue-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Characters
        </Link>

        <div className="text-center">
          <h1 className="mb-2 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-4xl font-bold text-transparent">
            ⚔️ CHARACTER DETAILS ⚔️
          </h1>
          <div className="mx-auto h-1 w-32 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500"></div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Character Card */}
          <div>{character && <CharacterCard character={character} />}</div>

          {/* Available Spells */}
          <div>
            <div className="rounded-xl border-2 bg-gradient-to-br from-slate-800/90 to-slate-900/90 p-6 shadow-2xl backdrop-blur-sm">
              <h3 className="mb-6 flex items-center gap-2 text-2xl font-bold text-purple-300">
                <Sparkles className="h-6 w-6" />
                AVAILABLE SPELLS
              </h3>

              {availableSpells.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="mb-4 text-6xl">📚</div>
                  <p className="text-lg text-gray-400">
                    No spells available to equip
                  </p>
                  <p className="mt-2 text-sm text-gray-500">
                    Visit the spells page to acquire new spells
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {availableSpells.map((spell) => (
                    <div
                      key={spell.id}
                      className="flex items-center justify-between rounded-lg border border-slate-600 bg-slate-800/50 p-4 transition-all duration-200 hover:border-slate-500 hover:bg-slate-700/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">⚡</span>
                        <div>
                          <span className="font-medium text-white capitalize">
                            {spell.type}
                          </span>
                          <div className="font-mono text-xs text-gray-400">
                            {spell.id}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-green-600 to-green-500 text-white hover:from-green-500 hover:to-green-400"
                        onClick={() => {
                          equipSpell({ characterId, spellId: spell.id });
                          toast.success(`Equipped ${spell.type}!`);
                        }}
                      >
                        <Wand2Icon className="mr-2 h-4 w-4" />
                        Equip
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
