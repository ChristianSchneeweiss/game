import { AuthForm } from "@/components/auth-form";
import { userStore } from "@/utils/user-store";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  const accessToken = userStore((s) => s.user?.access_token);
  const { sendMessage, lastMessage, readyState } = useWebSocket(
    `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/battle/test?access_token=${accessToken}`,
    {
      onMessage: (event) => {
        console.log("message", event.data);
      },
    },
  );

  useEffect(() => {
    if (readyState === ReadyState.OPEN) {
      sendMessage("hello from client");
    }
  }, [readyState]);

  const { user } = userStore();
  if (!user) return <AuthForm />;
  if (readyState !== ReadyState.OPEN) return <p>Connecting...</p>;
  return (
    <div>
      <p>User is logged in</p>
    </div>
  );
}
