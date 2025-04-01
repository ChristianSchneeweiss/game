import { AuthForm } from "@/components/auth-form";
import { trpc } from "@/utils/trpc";
import { userStore } from "@/utils/user-store";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  const healthCheck = useQuery(trpc.healthCheck.queryOptions());
  const { user } = userStore();
  const { data } = useQuery(
    trpc.protected.queryOptions(undefined, {
      enabled: !!user,
    }),
  );

  return (
    <div className="flex w-[600px] flex-col items-center justify-center p-2 text-white">
      <h3>Welcome Home!</h3>
      <Link to="/dashboard">Go to Dashboard</Link>
      <p>healthCheck: {healthCheck.data}</p>
      <p>protected: {data?.email}</p>
      {user ? <p>User is logged in</p> : <AuthForm />}
    </div>
  );
}
