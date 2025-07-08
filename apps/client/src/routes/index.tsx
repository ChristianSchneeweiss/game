import { AuthForm } from "@/components/auth-form";
import { userStore } from "@/utils/user-store";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { user } = userStore();
  return <div>{user ? <p>User is logged in</p> : <AuthForm />}</div>;
}
