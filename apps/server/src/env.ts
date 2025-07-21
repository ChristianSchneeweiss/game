import { z } from "zod";

export const envSchema = z.object({
  SUPABASE_URL: z.string(),
  SUPABASE_KEY: z.string(),
  DATABASE_URL: z.string(),
});
