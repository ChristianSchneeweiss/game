import { Button } from "@/components/ui/button";
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
import {
  Heart,
  Search,
  Shield,
  Sword,
  Users,
  X,
  Zap,
} from "lucide-react";
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
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<Set<string>>(
    new Set(),
  );

  const { data: characters } = useSuspenseQuery(
    trpc.character.getCharacters.queryOptions(),
  );
  const { mutate: enterDungeon, isPending } = useMutation(
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
    setSelectedCharacterIds((prev) => {
      const next = new Set(prev);
      if (next.has(character.id)) {
        next.delete(character.id);
      } else if (next.size < dungeonConfig.maxPartySize) {
        next.add(character.id);
      }
      return next;
    });
  };

  const handleEnterDungeon = () => {
    if (selectedCharacterIds.size === 0) return;
    enterDungeon({
      key: dungeonKey,
      characters: Array.from(selectedCharacterIds),
    });
  };

  const characterById = new Map(characters.map((character) => [character.id, character]));
  const selectedCharacters = Array.from(selectedCharacterIds)
    .map((id) => characterById.get(id))
    .filter((character): character is Character => Boolean(character));

  const visibleCharacters = Array.from(
    new Map(
      [...characters, ...(searchCharacters ?? [])].map((character) => [
        character.id,
        character,
      ]),
    ).values(),
  );

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSearchQuery("");
      setSelectedCharacterIds(new Set());
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
    const isSelected = selectedCharacterIds.has(character.id);
    const canSelect =
      isSelected || selectedCharacterIds.size < dungeonConfig.maxPartySize;

    return (
      <button
        type="button"
        key={character.id}
        className={`w-full rounded-3xl border p-4 text-left transition-all duration-200 ${
          isSelected
            ? "border-emerald-300/20 bg-emerald-300/10"
            : canSelect
              ? "border-white/8 bg-white/4 hover:border-blue-300/18 hover:bg-white/6"
              : "cursor-not-allowed border-white/6 bg-white/3 opacity-50"
        }`}
        onClick={() => canSelect && toggleCharacter(character)}
      >
        <div className="flex items-center gap-2">
          <div
            className={`flex h-4 w-4 items-center justify-center rounded border ${
              isSelected
                ? "border-emerald-300 bg-emerald-300 text-slate-950"
                : "border-stone-500"
            }`}
          >
            {isSelected && <span className="text-[10px] font-bold">✓</span>}
          </div>
          <div className="flex-1">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-sm">🧙‍♂️</span>
              <h4 className="text-sm font-bold text-white">{character.name}</h4>
              <span className="rounded-full border border-amber-300/20 bg-amber-300/12 px-1.5 py-0.5 text-xs font-bold text-amber-100">
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
      </button>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,1))] text-white shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
        <DialogHeader className="pb-4">
          <DialogTitle className="font-['Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Palatino,Georgia,serif] text-3xl text-stone-50">
            Enter {dungeonConfig.name}
          </DialogTitle>
          <DialogDescription className="text-sm leading-7 text-stone-400">
            {dungeonConfig.description}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-blue-200">
              <Users className="h-4 w-4" />
              Select Party Members ({selectedCharacterIds.size}/
              {dungeonConfig.maxPartySize})
            </h3>

            {selectedCharacters.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {selectedCharacters.map((character) => (
                  <button
                    key={character.id}
                    type="button"
                    onClick={() => toggleCharacter(character)}
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-300/18 bg-emerald-300/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100"
                  >
                    {character.name}
                    <X className="h-3 w-3" />
                  </button>
                ))}
              </div>
            )}

            <div className="mb-3">
              <div className="relative">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-stone-500" />
                <Input
                  placeholder="Search characters..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 rounded-2xl border-white/10 bg-white/5 pl-10 text-white placeholder:text-stone-500 focus:border-blue-300/18"
                />
              </div>
            </div>

            <div className="max-h-80 space-y-2 overflow-y-auto">
              {searchQuery.length > 0 ? (
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
                visibleCharacters.map((character) => renderCharacterCard(character))
              )}
            </div>
          </div>

          <div>
            <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-purple-200">
              <Sword className="h-4 w-4" />
              Dungeon Stages & Enemies
            </h3>
            <div className="space-y-2">
              {dungeonConfig.availableEnemies.map((stage, stageIndex) => (
                <div
                  key={stageIndex}
                  className="rounded-3xl border border-white/8 bg-white/4 p-4"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Shield className="h-3 w-3 text-amber-200" />
                    <h4 className="text-sm font-bold text-amber-200">
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
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="h-11 rounded-full border-white/10 bg-white/5 text-stone-200 hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleEnterDungeon}
            disabled={selectedCharacterIds.size === 0 || isPending}
            className="h-11 rounded-full border border-emerald-300/20 bg-emerald-300 text-slate-950 hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Enter Dungeon ({selectedCharacterIds.size} characters)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
