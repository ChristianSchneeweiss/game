import type { getAuth } from "@hono/clerk-auth";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import type z from "zod";
import { createClerk } from "../clerk";
import { TB_user } from "../db/schema";
import type { envSchema } from "../env";

export async function createContext({
  req,
  env,
  cfEnv,
  auth,
}: {
  req: Request;
  env: z.infer<typeof envSchema>;
  cfEnv: Env;
  auth: ReturnType<typeof getAuth>;
}) {
  const clerk = createClerk(env.CLERK_SECRET_KEY);
  if (!clerk) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create clerk client",
    });
  }

  const db = drizzle(cfEnv.HYPERDRIVE.connectionString);

  if (!db) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create drizzle client",
    });
  }

  const context = {
    session: null,
    clerk: clerk,
    db,
    env,
    cfEnv,
  };
  if (!auth?.userId) return context;

  const user = await clerk.users.getUser(auth.userId);

  // this is kinda bad because we do it a lot
  const [dbUser] = await db
    .select()
    .from(TB_user)
    .where(eq(TB_user.id, auth.userId));
  if (!dbUser) {
    await db.insert(TB_user).values({
      id: auth.userId,
      email: user.emailAddresses[0].emailAddress,
    });
  }

  return {
    ...context,
    session: user,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
