import { Button } from "@/components/ui/button";
import { trpc } from "@/utils/trpc";
import type { DungeonKey } from "@loot-game/game/dungeons/dungeon-keys";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { CheckCircle, Clock, Hash, MapPin, Play, Sword } from "lucide-react";
import { useMemo, useState } from "react";
import { DungeonEnterDialog } from "./-dungeon-enter.dialog";

dayjs.extend(relativeTime);

export const Route = createFileRoute("/dungeons/")({
  component: RouteComponent,
});

function RouteComponent() {
  const [selectedDungeon, setSelectedDungeon] = useState<string | null>(null);

  const { data: dungeons } = useSuspenseQuery(
    trpc.dungeon.allDungeons.queryOptions(),
  );

  const inBattleDungeons = useMemo(() => {
    return dungeons.filter((dungeon) => dungeon.activeBattle === true);
  }, [dungeons]);

  const activeDungeons = useMemo(() => {
    return dungeons.filter((dungeon) => dungeon.cleared === false);
  }, [dungeons]);

  const clearedDungeons = useMemo(() => {
    return dungeons.filter((dungeon) => dungeon.cleared === true);
  }, [dungeons]);

  const DungeonCard = ({ dungeon }: { dungeon: (typeof dungeons)[number] }) => {
    return (
      <Link
        key={dungeon.id}
        to="/dungeons/$id"
        params={{ id: dungeon.id }}
        className="group relative rounded-xl border-2 bg-gradient-to-br from-slate-800/90 to-slate-900/90 p-6 shadow-2xl backdrop-blur-sm transition-all duration-300 hover:scale-105"
      >
        {/* Dungeon Header */}
        <div className="mb-4 flex items-center gap-3">
          <span className="text-3xl">🏰</span>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white capitalize">
              {dungeon.key.replace("-", " ")}
            </h3>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-gradient-to-r from-green-400 to-green-500 px-3 py-1 text-sm font-bold text-black">
                IN PROGRESS
              </span>
              {dungeon.guest && (
                <span className="rounded-full bg-gradient-to-r from-blue-400 to-blue-500 px-3 py-1 text-sm font-bold text-black">
                  GUEST
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Dungeon Status */}
        <div className="mb-4">
          {dungeon.cleared ? (
            <div className="rounded-lg border border-yellow-600 bg-yellow-800/30 p-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-yellow-300">🏆</span>
                <span className="font-bold text-yellow-300">CLEARED</span>
              </div>
              <div className="text-sm text-yellow-200">Dungeon completed</div>
            </div>
          ) : dungeon.activeBattle ? (
            <div className="rounded-lg border border-red-600 bg-red-800/30 p-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-red-300">⚔️</span>
                <span className="font-bold text-red-300">IN BATTLE</span>
              </div>
              <div className="text-sm text-red-200">Battle in progress</div>
            </div>
          ) : (
            <div className="rounded-lg border border-green-600 bg-green-800/30 p-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-green-300">⚔️</span>
                <span className="font-bold text-green-300">
                  ADVENTURE AWAITS
                </span>
              </div>
              <div className="text-sm text-green-200">Continue your quest</div>
            </div>
          )}
        </div>

        {/* Dungeon Info */}
        <div className="mb-4 flex flex-row gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Started: {dayjs(dungeon.createdAt).fromNow()}</span>
          </div>
          <div className="flex items-center gap-1">
            <Hash className="h-3 w-3" />
            <span>Round: {dungeon.round + 1}</span>
          </div>
        </div>

        {/* Dungeon ID */}
        <div className="text-xs text-gray-400">
          Dungeon ID: {dungeon.id.slice(0, 8)}...
        </div>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      {/* Header Section */}
      <div className="mb-8 text-center">
        <h1 className="mb-2 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-4xl font-bold text-transparent">
          🏰 DUNGEON REALM 🏰
        </h1>
        <div className="mx-auto h-1 w-32 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500"></div>
      </div>

      <div className="mx-auto max-w-6xl">
        {/* In Battle Dungeons Section */}
        {inBattleDungeons.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-red-300">
              <Sword className="h-6 w-6" />
              IN BATTLE DUNGEONS
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {inBattleDungeons.map((dungeon) => (
                <DungeonCard key={dungeon.id} dungeon={dungeon} />
              ))}
            </div>
          </div>
        )}

        {/* Enter Dungeons Section */}
        <div className="mb-8">
          <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-blue-300">
            <Sword className="h-6 w-6" />
            ENTER NEW DUNGEONS
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Button
              onClick={() => setSelectedDungeon("dungeon1")}
              className="bg-gradient-to-r from-red-600 to-red-500 px-6 py-4 text-lg font-bold text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:from-red-500 hover:to-red-400"
            >
              <Play className="mr-2 h-5 w-5" />
              Enter Dungeon 1
            </Button>
            <Button
              onClick={() => setSelectedDungeon("crypt-of-forgotten-echoes")}
              className="bg-gradient-to-r from-purple-600 to-purple-500 px-6 py-4 text-lg font-bold text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:from-purple-500 hover:to-purple-400"
            >
              <Play className="mr-2 h-5 w-5" />
              Enter Crypt of Forgotten Echoes
            </Button>
            <Button
              onClick={() => setSelectedDungeon("trial-of-the-ashen")}
              className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4 text-lg font-bold text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:from-blue-500 hover:to-blue-400"
            >
              <Play className="mr-2 h-5 w-5" />
              Enter Trial of the Ashen
            </Button>
            <Button
              onClick={() => setSelectedDungeon("trial-of-the-nature")}
              className="bg-gradient-to-r from-green-600 to-green-500 px-6 py-4 text-lg font-bold text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:from-green-500 hover:to-green-400"
            >
              <Play className="mr-2 h-5 w-5" />
              Enter Trial of the Nature
            </Button>
            <Button
              onClick={() => setSelectedDungeon("trial-of-the-storm")}
              className="bg-gradient-to-r from-red-600 to-red-500 px-6 py-4 text-lg font-bold text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:from-red-500 hover:to-red-400"
            >
              <Play className="mr-2 h-5 w-5" />
              Enter Trial of the Storm
            </Button>
            <Button
              onClick={() => setSelectedDungeon("trial-of-the-tides")}
              className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4 text-lg font-bold text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:from-blue-500 hover:to-blue-400"
            >
              <Play className="mr-2 h-5 w-5" />
              Enter Trial of the Tides
            </Button>
          </div>
        </div>

        {/* Active Dungeons Section */}
        <div className="mb-8">
          <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-green-300">
            <MapPin className="h-6 w-6" />
            ACTIVE DUNGEONS
          </h2>
          {activeDungeons.length === 0 ? (
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-slate-800 to-slate-900">
                <span className="text-6xl">🗺️</span>
              </div>
              <h3 className="mb-2 text-2xl font-bold text-white">
                No Active Dungeons
              </h3>
              <p className="text-gray-400">
                Enter a dungeon to begin your adventure!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {activeDungeons.map((dungeon) => (
                <DungeonCard key={dungeon.id} dungeon={dungeon} />
              ))}
            </div>
          )}
        </div>

        {/* Cleared Dungeons Section */}
        <div className="mb-6">
          <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-gray-300">
            <CheckCircle className="h-6 w-6" />
            CLEARED DUNGEONS
          </h2>
          {clearedDungeons.length === 0 ? (
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-slate-800 to-slate-900">
                <span className="text-6xl">🏆</span>
              </div>
              <h3 className="mb-2 text-2xl font-bold text-white">
                No Cleared Dungeons
              </h3>
              <p className="text-gray-400">
                Complete dungeons to see them here!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {clearedDungeons.map((dungeon) => (
                <DungeonCard key={dungeon.id} dungeon={dungeon} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dungeon Enter Dialog */}
      {selectedDungeon && (
        <DungeonEnterDialog
          dungeonKey={selectedDungeon as DungeonKey}
          isOpen={!!selectedDungeon}
          onOpenChange={(open) => !open && setSelectedDungeon(null)}
        />
      )}
    </div>
  );
}
