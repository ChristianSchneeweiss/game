import { AuthForm } from "@/components/auth-form";
import { trpc } from "@/utils/trpc";
import { userStore } from "@/utils/user-store";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  const { user } = userStore();
  const { data } = useQuery(
    trpc.getPlayer.queryOptions(undefined, {
      enabled: !!user,
    }),
  );

  return (
    <div className="flex w-[600px] flex-col items-center justify-center p-2 text-white">
      <Link to="/dashboard">Go to Dashboard</Link>
      {data && (
        <div className="mt-4 rounded-lg bg-gray-800 p-4">
          <h4 className="mb-2 text-xl">Player: {data.name}</h4>
          <div className="grid grid-cols-2 gap-2">
            <p>Health: {data.health}</p>
            <p>Mana: {data.mana}</p>
            <p>Intelligence: {data.intelligence}</p>
            <p>Vitality: {data.vitality}</p>
            <p>Agility: {data.agility}</p>
            <p>Strength: {data.strength}</p>
          </div>
        </div>
      )}

      {user ? <p>User is logged in</p> : <AuthForm />}
    </div>
  );
}
