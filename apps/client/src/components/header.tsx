import { trpc } from "@/utils/trpc";
import { UserButton } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Crown, Home, MapPin, Sparkles, Users } from "lucide-react";
import { Button } from "./ui/button";

export default function Header() {
  const { data: loot } = useQuery(
    trpc.getMyLoot.queryOptions(undefined, {
      staleTime: 60_000,
      refetchInterval: 60_000,
    }),
  );

  const lootCount = loot?.length ?? 0;

  return (
    <div className="border-b-2 border-purple-600/30 bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 shadow-2xl">
      <div className="flex flex-row items-center justify-between px-6 py-4">
        {/* Navigation Links */}
        <div className="flex gap-6">
          <Link
            to="/"
            activeProps={{
              className: "text-yellow-400 font-bold",
            }}
            activeOptions={{ exact: true }}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-white transition-colors duration-300 hover:bg-slate-800/50 hover:text-yellow-400"
          >
            <Home className="h-4 w-4" />
            <span className="font-medium">🏰 Home</span>
          </Link>
          <Link
            to="/characters"
            activeProps={{
              className: "text-yellow-400 font-bold",
            }}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-white transition-colors duration-300 hover:bg-slate-800/50 hover:text-yellow-400"
          >
            <Users className="h-4 w-4" />
            <span className="font-medium">🧙‍♂️ Characters</span>
          </Link>
          <Link
            to="/spells"
            activeProps={{
              className: "text-yellow-400 font-bold",
            }}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-white transition-colors duration-300 hover:bg-slate-800/50 hover:text-yellow-400"
          >
            <Sparkles className="h-4 w-4" />
            <span className="font-medium">🔮 Spells</span>
          </Link>
          <Link
            to="/dungeons"
            activeProps={{
              className: "text-yellow-400 font-bold",
            }}
            activeOptions={{ exact: true }}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-white transition-colors duration-300 hover:bg-slate-800/50 hover:text-yellow-400"
          >
            <MapPin className="h-4 w-4" />
            <span className="font-medium">🗡️ Dungeons</span>
          </Link>
        </div>

        {/* Right Side Controls */}
        <div className="flex flex-row items-center gap-3">
          {lootCount > 0 && (
            <Link to="/loot">
              <Button className="flex flex-row items-center gap-2 bg-gradient-to-r from-yellow-600 to-orange-500 font-bold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:from-yellow-500 hover:to-orange-400">
                <Crown className="h-4 w-4" />
                {lootCount} Loot
              </Button>
            </Link>
          )}
          <div className="rounded-lg bg-slate-800/50 p-1">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8",
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
