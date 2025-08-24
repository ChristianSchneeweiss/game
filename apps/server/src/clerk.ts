import { createClerkClient } from "@clerk/backend";

export const createClerk = (key: string) =>
  createClerkClient({ secretKey: key });
