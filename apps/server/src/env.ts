import { z } from "zod";

export const envSchema = z.object({
  CLERK_SECRET_KEY: z.string(),
  CLERK_PUBLISHABLE_KEY: z.string(),
  DATABASE_URL: z.string(),
});
