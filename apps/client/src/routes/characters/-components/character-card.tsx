import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";
import type { Character } from "@loot-game/game/base-entity";
import type { EntityAttributes } from "@loot-game/game/types";
import { xpNeededForLevelUp } from "@loot-game/game/xp-curve";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, PlusIcon, Shield, Sparkles, XIcon, Zap } from "lucide-react";
import { useState } from "react";
import { RenameDialog } from "./rename-dialog";

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
    <div className="relative w-[480px] rounded-xl border-2 bg-gradient-to-br from-slate-800/90 to-slate-900/90 p-6 shadow-2xl backdrop-blur-sm transition-all duration-300">
      {/* Character Header */}
      <div className="mb-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="text-3xl">🧙‍♂️</span>
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <h2 className="text-2xl font-bold text-white">
                {character.name}
              </h2>
              <RenameDialog character={character} />
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 px-3 py-1 text-sm font-bold text-black">
                Level {character.level}
              </span>
            </div>
          </div>
        </div>

        {/* XP Bar */}
        <div className="mb-2">
          <div className="mb-2 flex justify-between text-sm">
            <span className="flex items-center gap-1 text-yellow-300">
              <Sparkles className="h-4 w-4" />
              Experience
            </span>
            <span className="font-mono text-white">
              {character.xp ?? 0}/{xpNeeded}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full border border-slate-600 bg-slate-700">
            <div
              className="h-full bg-gradient-to-r from-yellow-500 to-orange-400 transition-all duration-500 ease-out"
              style={{
                width: `${Math.min(100, ((character.xp ?? 0) / xpNeeded) * 100)}%`,
              }}
            />
          </div>
        </div>
      </div>
      {/* Attributes Section */}
      <div className="mb-6">
        <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-blue-300">
          <Shield className="h-5 w-5" />
          ATTRIBUTES
        </h3>

        {/* Health & Mana */}
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-600 bg-slate-800/50 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm">
              <Heart className="h-4 w-4 text-red-300" />
              <span className="text-red-300">Health</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {character.health}
            </div>
          </div>
          <div className="rounded-lg border border-slate-600 bg-slate-800/50 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4 text-blue-300" />
              <span className="text-blue-300">Mana</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {character.mana}
            </div>
          </div>
        </div>

        {/* Stat Points */}
        <div className="mb-4 rounded-lg border border-slate-600 bg-slate-800/50 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-yellow-300" />
            <span className="text-yellow-300">Stat Points Available</span>
          </div>
          <div className="text-xl font-bold text-white">
            {character.statPointsAvailable - statToAdd.length}
          </div>
        </div>

        {/* Core Stats */}
        <div className="grid grid-cols-2 gap-3">
          {["intelligence", "vitality", "agility", "strength"].map((attr) => (
            <div
              className="rounded-lg border border-slate-600 bg-slate-800/50 p-3"
              key={attr}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-300">
                  {attr.charAt(0).toUpperCase() + attr.slice(1)}
                </span>
                {character.statPointsAvailable > 0 && (
                  <button
                    className={cn(
                      "rounded-full p-1 transition-all duration-200",
                      character.statPointsAvailable - statToAdd.length > 0
                        ? "bg-yellow-500 text-black hover:bg-yellow-400"
                        : "cursor-not-allowed bg-slate-600 text-slate-400",
                    )}
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
                    disabled={
                      character.statPointsAvailable - statToAdd.length <= 0
                    }
                  >
                    <PlusIcon className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white">
                  {character.baseAttributes[attr as keyof EntityAttributes]}
                </span>
                {statToAdd.filter((s) => s === attr).length > 0 && (
                  <span className="rounded-full bg-green-600/20 px-2 py-1 text-xs font-bold text-green-300">
                    +{statToAdd.filter((s) => s === attr).length}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {statToAdd.length > 0 && (
          <Button
            size="sm"
            className="mt-4 w-full bg-gradient-to-r from-green-600 to-green-500 text-white hover:from-green-500 hover:to-green-400"
            onClick={async () => {
              await applyStatIncrease({
                characterId: character.id,
                stats: statToAdd,
              });
              setStatToAdd([]);
            }}
          >
            Apply Stat Changes
          </Button>
        )}
      </div>
      {/* Spells Section */}
      <div>
        <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-purple-300">
          <Sparkles className="h-5 w-5" />
          EQUIPPED SPELLS
        </h3>
        <div className="space-y-2">
          {character.spells.map((spell) => (
            <div
              className="flex items-center justify-between rounded-lg border border-slate-600 bg-slate-800/50 p-3 transition-all duration-200"
              key={spell.config.id}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">⚡</span>
                <div>
                  <span className="font-medium text-white capitalize">
                    {spell.config.name}
                  </span>
                  <div className="font-mono text-xs text-gray-400">
                    {spell.config.id.slice(0, 8)}...
                  </div>
                </div>
              </div>
              {spell.config.type !== "autoattack" && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-full bg-red-600/20 text-red-300 hover:bg-red-600/30 hover:text-red-200"
                  onClick={() => unequipSpell({ spellId: spell.config.id })}
                >
                  <XIcon className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
