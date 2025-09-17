import { trpc } from "@/utils/trpc";
import { SignedIn, SignedOut, SignInButton } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: battles } = useQuery(
    trpc.activeBattles.queryOptions(undefined, {
      refetchInterval: 60_000,
    }),
  );

  return (
    <div>
      <SignedOut>
        <SignInButton mode="modal" />
      </SignedOut>
      <SignedIn>
        <p>User is logged in</p>
      </SignedIn>

      {battles && battles.length > 0 && (
        <div className="mx-4 my-8 rounded-xl bg-slate-800/80 p-6 shadow-lg">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-blue-300">
            <span>⚔️</span> Active Battles
          </h2>
          <ul className="space-y-3">
            {battles.map((battle) => (
              <li key={battle.battleId}>
                <Link
                  to="/battle/$id"
                  params={{ id: battle.battleId }}
                  className="inline-block rounded-lg bg-blue-900/60 px-4 py-2 font-mono text-blue-200 transition hover:bg-blue-800 hover:text-yellow-300"
                >
                  Battle ID:{" "}
                  <span className="font-semibold">
                    {battle.battleId.slice(0, 8)}...
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
