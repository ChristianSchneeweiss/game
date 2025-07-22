import { Button } from "@/components/ui/button";
import { trpc } from "@/utils/trpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Wand2Icon } from "lucide-react";
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
  const { mutateAsync: _equipSpell } = useMutation(
    trpc.character.equipSpell.mutationOptions(),
  );
  const { mutateAsync: _addLowHpActionHook } = useMutation(
    trpc.character.addLowHpActionHook.mutationOptions({
      onSuccess: () => {
        refetchCharacter();
      },
    }),
  );

  const equipSpell = async (spellId: string) => {
    await _equipSpell({ characterId, spellId });
    refetchCharacter();
    refetchSpells();
  };

  return (
    <div className="m-6">
      {character && <CharacterCard character={character} />}
      {spells && (
        <div className="mt-4">
          <h4 className="mb-2 text-xl">Spells</h4>
          <div className="flex flex-wrap gap-2">
            {spells
              .filter((spell) => spell.equippedBy === null)
              .map((spell) => (
                <div
                  className="flex w-fit items-center gap-2 rounded-md bg-gray-700 px-2 capitalize"
                  key={spell.id}
                >
                  {spell.type}{" "}
                  <span className="text-xs font-light">{spell.id}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => equipSpell(spell.id)}
                  >
                    <Wand2Icon className="h-3 w-3" />
                  </Button>
                </div>
              ))}
          </div>
        </div>
      )}
      <div className="mt-4">
        <h4 className="mb-2 text-xl">Add Low HP Action Hook</h4>
        <Button
          onClick={() =>
            _addLowHpActionHook({
              characterId,
              hpPercentage: 0.5,
              spellId: character?.spells[0]?.config.id!,
            })
          }
        >
          Add Hook
        </Button>
      </div>
    </div>
  );
}
