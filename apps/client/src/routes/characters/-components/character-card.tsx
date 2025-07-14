import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/utils/trpc";
import type { Character } from "@loot-game/game/base-entity";
import { xpNeededForLevelUp } from "@loot-game/game/xp-curve";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { XIcon } from "lucide-react";

export const CharacterCard = ({ character }: { character: Character }) => {
  const { mutateAsync: _unequipSpell } = useMutation(
    trpc.unequipSpell.mutationOptions(),
  );
  const queryClient = useQueryClient();
  const xpNeeded = xpNeededForLevelUp(character.level);

  const unequipSpell = async (spellId: string) => {
    await _unequipSpell({ spellId });
    queryClient.invalidateQueries(
      trpc.getCharacter.queryOptions({ id: character.id }),
    );
  };

  return (
    <Card className="w-[480px]">
      <CardHeader>
        <div className="flex flex-col gap-1">
          <CardTitle>{character.name}</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">
              Level {character.level}
            </span>
            <div className="relative h-3 w-32 rounded bg-gray-800">
              <div
                className="absolute top-0 left-0 h-3 rounded bg-green-500"
                style={{
                  width: `${Math.min(
                    100,
                    ((character.xp ?? 0) / xpNeeded) * 100,
                  )}%`,
                }}
              />
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-white">
                {character.xp ?? 0}/{100 * (character.level ?? 1)}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <h4 className="mb-2 text-xl">Attributes</h4>
        <div className="grid grid-cols-2 gap-1">
          <p>Health: {character.health}</p>
          <p>Mana: {character.mana}</p>
          <p>Intelligence: {character.baseAttributes.intelligence}</p>
          <p>Vitality: {character.baseAttributes.vitality}</p>
          <p>Agility: {character.baseAttributes.agility}</p>
          <p>Strength: {character.baseAttributes.strength}</p>
        </div>
        <div className="mt-4">
          <h4 className="mb-2 text-xl">Equipped Spells</h4>
          <div className="flex flex-wrap gap-2">
            {character.spells.map((spell) => (
              <div
                className="flex w-fit items-center gap-2 rounded-md bg-gray-700 px-2 capitalize"
                key={spell.config.id}
              >
                {spell.config.name}{" "}
                <span className="text-xs font-light">
                  {spell.config.id.slice(0, 3)}
                </span>
                {spell.config.type !== "autoattack" && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => unequipSpell(spell.config.id)}
                  >
                    <XIcon className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
