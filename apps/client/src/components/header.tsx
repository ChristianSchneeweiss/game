import { trpc } from "@/utils/trpc";
import { UserButton } from "@clerk/clerk-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { GiftIcon } from "lucide-react";
import { ModeToggle } from "./mode-toggle";
import { Button } from "./ui/button";

export default function Header() {
  const { data: loot } = useQuery(
    trpc.getMyLoot.queryOptions(undefined, {
      staleTime: 10_000,
      refetchInterval: 10_000,
    }),
  );
  const { mutate: claimLoot } = useMutation(trpc.claimLoot.mutationOptions());

  const lootCount = loot?.length ?? 0;

  return (
    <div>
      <div className="flex flex-row items-center justify-between px-2 py-1">
        <div className="flex gap-4 text-lg">
          <Link
            to="/"
            activeProps={{
              className: "font-bold",
            }}
            activeOptions={{ exact: true }}
          >
            Home
          </Link>
          <Link
            to="/characters"
            activeProps={{
              className: "font-bold",
            }}
          >
            Characters
          </Link>
          <Link
            to="/spells"
            activeProps={{
              className: "font-bold",
            }}
          >
            Spells
          </Link>
          <Link
            to="/dungeons"
            activeProps={{
              className: "font-bold",
            }}
            activeOptions={{ exact: true }}
          >
            Dungeons
          </Link>
        </div>
        <div className="flex flex-row items-center gap-2">
          <ModeToggle />
          {lootCount > 0 && (
            <Link to="/loot">
              <Button className="flex flex-row items-center gap-2">
                {lootCount} <GiftIcon />
              </Button>
            </Link>
          )}
          <UserButton />
        </div>
      </div>
      <hr />
    </div>
  );
}
