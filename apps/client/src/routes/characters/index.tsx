import { Button } from "@/components/ui/button";
import { trpc } from "@/utils/trpc";
import { userStore } from "@/utils/user-store";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/characters/")({
  component: CharactersComponent,
});

function CharactersComponent() {
  const { user } = userStore();
  const { mutate: createCharacter } = useMutation(
    trpc.createCharacter.mutationOptions(),
  );
  const { data: characters, refetch: refetchCharacters } = useQuery(
    trpc.getCharacters.queryOptions(undefined, {
      enabled: !!user,
    }),
  );

  return (
    <div className="flex w-[600px] flex-col items-center justify-center p-2 text-white">
      <div className="mb-4 flex gap-2">
        <Button
          onClick={async () => {
            createCharacter();
            refetchCharacters();
          }}
        >
          Create Character
        </Button>
      </div>
      {characters &&
        characters.map((character) => (
          <div className="group mt-4 rounded-lg bg-gray-800 p-4">
            <Link
              className="group-hover:underline"
              to="/characters/$character-id"
              params={{ "character-id": character.id }}
            >
              <h4 className="mb-2 text-xl">Character: {character.name}</h4>
            </Link>
            <div className="grid grid-cols-2 gap-2">
              <p>Health: {character.health}</p>
              <p>Mana: {character.mana}</p>
              <p>Intelligence: {character.baseAttributes.intelligence}</p>
              <p>Vitality: {character.baseAttributes.vitality}</p>
              <p>Agility: {character.baseAttributes.agility}</p>
              <p>Strength: {character.baseAttributes.strength}</p>
            </div>
            <div className="mt-4">
              <h4 className="mb-2 text-xl">Equipped Spells</h4>
              <div className="grid grid-cols-2 gap-3">
                {character.spells.map((spell) => (
                  <div
                    key={`equipped-${spell.config.id}`}
                    className="rounded-md bg-gray-700 p-2 shadow-sm"
                  >
                    <p className="font-medium capitalize">
                      {spell.config.name}{" "}
                      <span className="text-xs font-light">
                        {spell.config.id.slice(0, 3)}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}
