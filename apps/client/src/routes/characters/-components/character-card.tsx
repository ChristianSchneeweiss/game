import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/utils/trpc";
import type { Character } from "@loot-game/game/base-entity";
import type { EntityAttributes } from "@loot-game/game/types";
import { xpNeededForLevelUp } from "@loot-game/game/xp-curve";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon, XIcon } from "lucide-react";
import { useState } from "react";

export const CharacterCard = ({ character }: { character: Character }) => {
  const { mutateAsync: unequipSpell } = useMutation(
    trpc.character.unequipSpell.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(
          trpc.character.getCharacter.queryOptions({ id: character.id }),
        );
      },
    }),
  );

  const { mutateAsync: applyStatIncrease } = useMutation(
    trpc.character.applyStatIncrease.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(
          trpc.character.getCharacter.queryOptions({ id: character.id }),
        );
      },
    }),
  );
  const queryClient = useQueryClient();
  const xpNeeded = xpNeededForLevelUp(character.level);
  const [statToAdd, setStatToAdd] = useState<(keyof EntityAttributes)[]>([]);

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
        <div className="grid grid-cols-2 gap-2 rounded-md bg-gray-800/40 p-4">
          <div className="flex flex-col">
            <span className="text-xs text-gray-400">Health</span>
            <span className="text-lg font-semibold text-green-400">
              {character.health}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-400">Mana</span>
            <span className="text-lg font-semibold text-blue-400">
              {character.mana}
            </span>
          </div>
          <div className="col-span-2 mt-2 flex flex-col">
            <span className="text-xs text-gray-400">Stat Points Available</span>
            <span className="font-semibold text-yellow-400">
              {character.statPointsAvailable - statToAdd.length}
            </span>
          </div>
          {["intelligence", "vitality", "agility", "strength"].map((attr) => (
            <div className="flex flex-col" key={attr}>
              <span className="text-xs text-gray-400">
                {attr.charAt(0).toUpperCase() + attr.slice(1)}
              </span>
              <div className="flex items-center gap-1 font-semibold">
                {character.baseAttributes[attr as keyof EntityAttributes]}
                {character.statPointsAvailable > 0 && (
                  <div className="flex items-center gap-1">
                    <button
                      className="ml-1 cursor-pointer rounded bg-yellow-500 px-1 text-sm text-black hover:bg-yellow-400"
                      onClick={() => {
                        if (
                          character.statPointsAvailable - statToAdd.length >
                          0
                        ) {
                          // @ts-ignore
                          setStatToAdd((prev) => [...prev, attr]);
                        }
                      }}
                      type="button"
                    >
                      <PlusIcon className="h-4 w-4" />
                    </button>
                    {statToAdd.filter((s) => s === attr).length > 0 && (
                      <span className="ml-1 rounded px-1 text-xs font-bold">
                        +{statToAdd.filter((s) => s === attr).length}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {statToAdd.length > 0 && (
            <Button
              size="sm"
              className="col-span-2"
              onClick={async () => {
                await applyStatIncrease({
                  characterId: character.id,
                  stats: statToAdd,
                });
                setStatToAdd([]);
              }}
            >
              Apply
            </Button>
          )}
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
                    onClick={() => unequipSpell({ spellId: spell.config.id })}
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
