import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { trpc } from "@/utils/trpc";
import type { Character } from "@loot-game/game/base-entity";
import type { DungeonKey } from "@loot-game/game/dungeons/dungeon-keys";
import { useMutation, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Heart, Search, Shield, Sword, Users, Zap } from "lucide-react";
import { useState } from "react";
import { dungeonManager } from "../../../../server/src/game-usecases/dungeon-manager";

type Props = {
  dungeonKey: DungeonKey;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export const DungeonEnterDialog = ({
  dungeonKey,
  isOpen,
  onOpenChange,
}: Props) => {
  const router = useRouter();
  const [selectedCharacters, setSelectedCharacters] = useState<Set<Character>>(
    new Set(),
  );

  const { data: characters } = useSuspenseQuery(
    trpc.character.getCharacters.queryOptions(),
  );
  const { mutate: enterDungeon } = useMutation(
    trpc.dungeon.enterDungeon.mutationOptions({
      onSuccess: (data) => {
        router.navigate({ to: "/dungeons/$id", params: { id: data.id } });
        onOpenChange(false);
      },
    }),
  );

  const [searchQuery, setSearchQuery] = useState("");

  const { data: searchCharacters } = useQuery({
    ...trpc.character.searchCharacters.queryOptions({
      query: searchQuery,
    }),
    enabled: searchQuery.length > 0,
  });

  const dungeonConfig = dungeonManager.getDungeonConfig(dungeonKey);

  const toggleCharacter = (character: Character) => {
    setSelectedCharacters((prev) => {
      if (prev.has(character)) {
        prev.delete(character);
      } else if (prev.size < dungeonConfig.maxPartySize) {
        prev.add(character);
      }
      return new Set(prev);
    });
  };

  const handleEnterDungeon = () => {
    if (selectedCharacters.size === 0) return;
    enterDungeon({
      key: dungeonKey,
      characters: Array.from(selectedCharacters).map(
        (character) => character.id,
      ),
    });
  };

  const minCharacters = Array.from(
    new Set([...characters, ...selectedCharacters]),
  );

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSearchQuery("");
      setSelectedCharacters(new Set());
    }
    onOpenChange(open);
  };

  const formatEnemyName = (enemyType: string) => {
    return enemyType
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const renderCharacterCard = (character: Character) => {
    const isSelected = selectedCharacters.has(character);
    const canSelect =
      isSelected || selectedCharacters.size < dungeonConfig.maxPartySize;

    return (
      <Card
        key={character.id}
        className={`cursor-pointer p-3 transition-all duration-200 ${
          isSelected
            ? "border-green-500 bg-gradient-to-r from-green-600/30 to-green-500/30"
            : canSelect
              ? "border-slate-600 bg-slate-800/50 hover:border-blue-500 hover:bg-slate-700/50"
              : "cursor-not-allowed border-slate-700 bg-slate-800/30 opacity-50"
        }`}
        onClick={() => canSelect && toggleCharacter(character)}
      >
        <div className="flex items-center gap-2">
          <div
            className={`flex h-4 w-4 items-center justify-center rounded border-2 ${
              isSelected ? "border-green-500 bg-green-500" : "border-slate-400"
            }`}
          >
            {isSelected && <span className="text-xs text-white">✓</span>}
          </div>
          <div className="flex-1">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-sm">🧙‍♂️</span>
              <h4 className="text-sm font-bold text-white">{character.name}</h4>
              <span className="rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 px-1.5 py-0.5 text-xs font-bold text-black">
                L{character.level}
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <Heart className="h-3 w-3 text-red-300" />
                  <span className="text-red-300">{character.health}</span>
                </div>
                <div className="mr-3 flex items-center gap-1">
                  <Zap className="h-3 w-3 text-blue-300" />
                  <span className="text-blue-300">{character.mana}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-purple-300">INT</span>
                  <span className="text-purple-300">
                    {character.getAttribute("intelligence")}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-green-300">VIT</span>
                  <span className="text-green-300">
                    {character.getAttribute("vitality")}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-yellow-300">AGI</span>
                  <span className="text-yellow-300">
                    {character.getAttribute("agility")}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-orange-300">STR</span>
                  <span className="text-orange-300">
                    {character.getAttribute("strength")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl border-2 border-purple-600 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
        <DialogHeader className="pb-4">
          <DialogTitle className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-xl font-bold text-transparent">
            🏰 Enter {dungeonConfig.name} 🏰
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-300">
            {dungeonConfig.description}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Character Selection */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-blue-300">
              <Users className="h-4 w-4" />
              Select Party Members ({selectedCharacters.size}/
              {dungeonConfig.maxPartySize})
            </h3>

            {/* Search Input */}
            <div className="mb-3">
              <div className="relative">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search characters..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-slate-600 bg-slate-800/50 pl-10 text-white placeholder:text-gray-400 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="max-h-80 space-y-2 overflow-y-auto">
              {searchQuery.length > 0 ? (
                // Show search results
                <>
                  {searchCharacters && searchCharacters.length > 0 ? (
                    searchCharacters.map((character) =>
                      renderCharacterCard(character),
                    )
                  ) : (
                    <div className="p-4 text-center text-gray-400">
                      No characters found matching "{searchQuery}"
                    </div>
                  )}
                </>
              ) : (
                // Show all characters
                minCharacters.map((character) => renderCharacterCard(character))
              )}
            </div>
          </div>

          {/* Dungeon Information */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-purple-300">
              <Sword className="h-4 w-4" />
              Dungeon Stages & Enemies
            </h3>
            <div className="space-y-2">
              {dungeonConfig.availableEnemies.map((stage, stageIndex) => (
                <Card
                  key={stageIndex}
                  className="gap-1 border-slate-600 bg-slate-800/50 p-3"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Shield className="h-3 w-3 text-yellow-400" />
                    <h4 className="text-sm font-bold text-yellow-400">
                      Stage {stageIndex + 1}
                    </h4>
                  </div>
                  <div className="space-y-1">
                    {stage.map((enemyType, enemyIndex) => (
                      <div
                        key={enemyIndex}
                        className="flex items-center gap-2 text-xs"
                      >
                        <span className="text-red-400">⚔️</span>
                        <span className="text-white">
                          {formatEnemyName(enemyType)}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleEnterDungeon}
            disabled={selectedCharacters.size === 0}
            className="bg-gradient-to-r from-green-600 to-green-500 text-white hover:from-green-500 hover:to-green-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Enter Dungeon ({selectedCharacters.size} characters)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
