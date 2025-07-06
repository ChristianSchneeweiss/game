import { z } from "zod";

export const envSchema = z.object({
  UPSTASH_REDIS_REST_URL: z.string(),
  UPSTASH_REDIS_REST_TOKEN: z.string(),
  SUPABASE_URL: z.string(),
  SUPABASE_KEY: z.string(),
  DATABASE_URL: z.string(),
});
