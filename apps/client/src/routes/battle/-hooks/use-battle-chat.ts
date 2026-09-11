import { useState } from "react";
import useWebSocket from "react-use-websocket";
import type { ResponseMessage } from "../../../../../server/src/durable-objects/battle-chat.do";
import { retainedChatHistory } from "../../../../../server/src/lib/chat-history";

export const useChat = (id: string) => {
  const [messages, setMessages] = useState<{ user: string; message: string }[]>(
    [],
  );

  const { sendMessage, readyState } = useWebSocket(
    `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/battle/${id}/chat`,
    {
      onMessage: (event) => {
        try {
          const response = JSON.parse(event.data) as ResponseMessage;
          if (response.type === "message")
            setMessages((prev) =>
              retainedChatHistory([...prev, response.data]),
            );
        } catch {
          // A malformed transport frame must not break the battle controls.
        }
      },
    },
  );

  return {
    messages,
    sendMessage,
    readyState,
  };
};
