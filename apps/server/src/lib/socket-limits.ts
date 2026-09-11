// The room limit is deliberately above the six-actor desktop case, allowing
// several devices per owner plus spectators. Staging load tests must qualify it.
export const socketLimits = {
  roomConnections: 32,
  userConnections: 4,
  battleFrameBytes: 16 * 1024,
  chatMessageBytes: 1024,
  chatHistory: 50,
  chatHistoryBytes: 64 * 1024,
  battleBurst: 30,
  chatBurst: 5,
  windowMs: 10_000,
} as const;

export function textWithinBytes(
  value: unknown,
  maximum: number,
): value is string {
  return (
    typeof value === "string" &&
    value.length <= maximum &&
    new TextEncoder().encode(value).byteLength <= maximum
  );
}

/** Per-object ingress budget; bound maps by the accepted socket count. */
export class SocketBudget {
  private windows = new Map<WebSocket, { started: number; count: number }>();

  take(ws: WebSocket, maximum: number, now = Date.now()) {
    let window = this.windows.get(ws);
    const attachment: unknown = ws.deserializeAttachment?.();
    if (
      !window &&
      attachment &&
      typeof attachment === "object" &&
      "ingress" in attachment
    ) {
      const saved = attachment.ingress;
      if (
        saved &&
        typeof saved === "object" &&
        "started" in saved &&
        "count" in saved &&
        typeof saved.started === "number" &&
        Number.isFinite(saved.started) &&
        typeof saved.count === "number" &&
        Number.isInteger(saved.count) &&
        saved.count >= 0
      )
        window = { started: saved.started, count: saved.count };
    }
    if (!window || now - window.started >= socketLimits.windowMs) {
      window = { started: now, count: 0 };
    }
    this.windows.set(ws, window);
    window.count++;
    // Hibernation preserves this budget with the authenticated identity.
    if (attachment && typeof attachment === "object")
      ws.serializeAttachment?.({ ...attachment, ingress: window });
    return window.count <= maximum;
  }

  delete(ws: WebSocket) {
    this.windows.delete(ws);
  }
}

export function canConnect(
  sessions: Map<WebSocket, { id: string }>,
  userId: string,
) {
  return (
    sessions.size < socketLimits.roomConnections &&
    [...sessions.values()].filter((session) => session.id === userId).length <
      socketLimits.userConnections
  );
}
