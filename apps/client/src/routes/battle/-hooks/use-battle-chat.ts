import { useState } from "react";
import useWebSocket from "react-use-websocket";
import type { ResponseMessage } from "../../../../../server/src/durable-objects/battle-chat.do";

export const useChat = (id: string) => {
  const [messages, setMessages] = useState<{ user: string; message: string }[]>(
    [],
  );

  const { sendMessage, readyState } = useWebSocket(
    `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/battle/${id}/chat`,
    {
      onMessage: (event) => {
        const response = JSON.parse(event.data) as ResponseMessage;
        setMessages((prev) => [...prev, response.data]);
      },
    },
  );

  return {
    messages,
    sendMessage,
    readyState,
  };
};
