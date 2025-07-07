import { AuthForm } from "@/components/auth-form";
import { Button } from "@/components/ui/button";
import { trpc } from "@/utils/trpc";
import { userStore } from "@/utils/user-store";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { SwordIcon } from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  const { user } = userStore();
  const { mutate: createCharacter } = useMutation(
    trpc.createCharacter.mutationOptions(),
  );
  const { mutateAsync: createSpell } = useMutation(
    trpc.createSpell.mutationOptions(),
  );
  const { mutateAsync: equipSpell } = useMutation(
    trpc.equipSpell.mutationOptions(),
  );
  const { data: spells, refetch: refetchSpells } = useQuery(
    trpc.getMySpells.queryOptions(undefined, {
      enabled: !!user,
    }),
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
            refetchSpells();
          }}
        >
          Create Character
        </Button>
        <Button
          onClick={async () => {
            await createSpell({ type: "fireball" });
            refetchSpells();
            refetchCharacters();
          }}
        >
          Create Fireball
        </Button>
      </div>
      {characters &&
        characters.map((character) => (
          <div className="mt-4 rounded-lg bg-gray-800 p-4">
            <h4 className="mb-2 text-xl">Player: {character.name}</h4>
            <div className="grid grid-cols-2 gap-2">
              <p>Health: {character.health}</p>
              <p>Mana: {character.mana}</p>
              <p>Intelligence: {character.baseAttributes.intelligence}</p>
              <p>Vitality: {character.baseAttributes.vitality}</p>
              <p>Agility: {character.baseAttributes.agility}</p>
              <p>Strength: {character.baseAttributes.strength}</p>
            </div>
            <div className="mt-4">
              <h4 className="mb-2 text-xl">Spells</h4>
              <div className="grid grid-cols-2 gap-3">
                {spells?.map((spell) => (
                  <div
                    key={`open-${spell.id}`}
                    className="rounded-md bg-gray-700 p-2 shadow-sm"
                  >
                    <p className="font-medium capitalize">
                      {spell.type}{" "}
                      <span className="text-xs font-light">
                        {spell.id.slice(0, 3)}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={async () => {
                          await equipSpell({
                            characterId: character.id,
                            spellId: spell.id,
                          });
                          refetchCharacters();
                        }}
                      >
                        <SwordIcon className="h-3 w-3" />
                      </Button>
                    </p>
                  </div>
                ))}
              </div>
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

      {user ? <p>User is logged in</p> : <AuthForm />}
    </div>
  );
}
