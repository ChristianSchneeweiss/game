import { TRPCError } from "@trpc/server";
import { drizzle } from "drizzle-orm/postgres-js";
import { createSB } from "../supabase";

export async function createContext({
  req,
  env,
}: {
  req: Request;
  env: Record<string, string>;
}) {
  const sb = createSB(env.SUPABASE_URL!, env.SUPABASE_KEY!);

  if (!sb) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create supabase client",
    });
  }

  const db = drizzle(env.DATABASE_URL!);

  if (!db) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create drizzle client",
    });
  }

  const context = {
    session: null,
    supabase: sb,
    db,
    env,
  };

  const bearerToken = req.headers.get("authorization")?.split("Bearer ").pop();
  if (!bearerToken) {
    return context;
  }

  const user = await sb.auth.getUser(bearerToken);
  return {
    ...context,
    session: user.data.user,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
