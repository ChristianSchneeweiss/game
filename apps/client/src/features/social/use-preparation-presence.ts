import { useEffect, useState } from "react";
import { userStore } from "@/utils/user-store";
import { queryClient, trpc } from "@/utils/trpc";

/** A connection means this account is attending this preparation/run only. */
export function usePreparationPresence(id: string | undefined) {
  const userId = userStore((state) => state.user?.id);
  const [connectedTo, setConnectedTo] = useState<string>();
  useEffect(() => {
    if (!id || !userId) return;
    let disposed = false;
    let socket: WebSocket | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    const identity = `${userId}:${id}`;
    const refresh = () => {
      void queryClient.invalidateQueries({
        queryKey: trpc.preparation.get.queryKey({ id }),
      });
      void queryClient.invalidateQueries({
        queryKey: trpc.dungeon.getRun.queryKey(),
      });
    };
    function connect() {
      if (disposed) return;
      setConnectedTo(undefined);
      const current = new WebSocket(
        `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/preparation/${encodeURIComponent(id!)}/presence`,
      );
      socket = current;
      current.onmessage = (event) => {
        if (disposed || socket !== current) return;
        try {
          const response: unknown = JSON.parse(event.data);
          if (
            typeof response === "object" &&
            response !== null &&
            "type" in response &&
            response.type === "connected"
          ) {
            setConnectedTo(identity);
            refresh();
            clearInterval(heartbeat);
            heartbeat = setInterval(() => {
              if (current.readyState === WebSocket.OPEN)
                current.send(JSON.stringify({ type: "ping" }));
            }, 10_000);
          }
        } catch {
          /* Only server acknowledgement establishes attendance. */
        }
      };
      current.onclose = () => {
        if (disposed || socket !== current) return;
        clearInterval(heartbeat);
        setConnectedTo(undefined);
        refresh();
        retry = setTimeout(connect, 2000);
      };
      current.onerror = () => current.close();
    }
    connect();
    return () => {
      disposed = true;
      clearTimeout(retry);
      clearInterval(heartbeat);
      socket?.close();
    };
  }, [id, userId]);
  return !!id && !!userId && connectedTo === `${userId}:${id}`;
}
