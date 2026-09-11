import type { getAuth } from "@hono/clerk-auth";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import type z from "zod";
import { createClerk } from "../clerk";
import { TB_user } from "../db/schema";
import type { envSchema } from "../env";
import { createSpell } from "../game-usecases/spell-factory";

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

  const db = drizzle(env.DATABASE_URL);

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

  const [existing] = await db
    .select({ id: TB_user.id })
    .from(TB_user)
    .where(eq(TB_user.id, user.id))
    .limit(1);
  if (!existing)
    await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(TB_user)
        .values({
          id: user.id,
          email:
            user.primaryEmailAddress?.emailAddress ??
            user.emailAddresses[0]?.emailAddress,
        })
        .onConflictDoNothing({ target: TB_user.id })
        .returning({ id: TB_user.id });
      if (!created) return;
      await createSpell(user.id, "cinder-wisp", tx);
      await createSpell(user.id, "aqua-wave", tx);
      await createSpell(user.id, "battle-roar", tx);
    });

  return {
    ...context,
    session: user,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
