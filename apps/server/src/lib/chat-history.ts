import z from "zod";
import { socketLimits, textWithinBytes } from "./socket-limits";

const chatMessageSchema = z.object({ user: z.string(), message: z.string() });
export type ChatMessage = z.infer<typeof chatMessageSchema>;

/** Also repairs history from older objects that accepted binary/oversized data. */
export function retainedChatHistory(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  const messages = value.slice(-socketLimits.chatHistory).flatMap((entry) => {
    const parsed = chatMessageSchema.safeParse(entry);
    return parsed.success &&
      textWithinBytes(parsed.data.user, 128) &&
      textWithinBytes(parsed.data.message, socketLimits.chatMessageBytes)
      ? [parsed.data]
      : [];
  });
  while (
    new TextEncoder().encode(JSON.stringify(messages)).byteLength >
    socketLimits.chatHistoryBytes
  )
    messages.shift();
  return messages;
}
