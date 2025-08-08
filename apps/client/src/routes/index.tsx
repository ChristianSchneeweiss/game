import { AuthForm } from "@/components/auth-form";
import { userStore } from "@/utils/user-store";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import type z from "zod";
import type {
  messageSchema,
  ResponseMessage,
} from "../../../server/src/battle-ws";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  const accessToken = userStore((s) => s.user?.access_token);
  const { sendMessage, lastMessage, readyState } = useWebSocket(
    `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/battle/test?access_token=${accessToken}`,
    {
      onMessage: (event) => {
        const response = JSON.parse(event.data) as ResponseMessage;
        console.log("data", response.data);
      },
    },
  );

  useEffect(() => {
    if (readyState === ReadyState.OPEN) {
      const msg = {
        type: "castSpell",
        data: {
          entityId: "e91c0w6lphxo",
          spellId: "e91c0w6lphxo",
          targetIds: ["goblin"],
        },
      } satisfies z.infer<typeof messageSchema>;
      sendMessage(JSON.stringify(msg));
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
