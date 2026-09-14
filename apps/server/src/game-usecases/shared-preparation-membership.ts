import { TRPCError } from "@trpc/server";
import { and, eq, isNull, or } from "drizzle-orm";
import type { Database } from "../db/schema";
import {
  TB_preparation,
  TB_preparationConnection,
} from "../db/shared-preparation-schema";

export type Preparation = typeof TB_preparation.$inferSelect;

export async function lockPreparation(id: string, tx: Database) {
  const [preparation] = await tx
    .select()
    .from(TB_preparation)
    .where(eq(TB_preparation.id, id))
    .for("update");
  if (!preparation)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Preparation not found",
    });
  return preparation;
}

export function requirePreparationMember(
  preparation: Preparation,
  userId: string,
) {
  if (userId !== preparation.hostUserId && userId !== preparation.guestUserId)
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This preparation belongs to another party",
    });
}

export function requireOpenPreparation(preparation: Preparation) {
  if (preparation.closedAt)
    throw new TRPCError({
      code: "CONFLICT",
      message: "This preparation has closed",
    });
}

/** Commands carry the preparation the owner actually saw, never implicit
 * consent for a newer encounter or connection generation at delivery time. */
export function requirePreparationRevision(
  preparation: Preparation,
  expectedRevision: number | undefined,
) {
  if (preparation.revision !== expectedRevision)
    throw new TRPCError({
      code: "CONFLICT",
      message:
        "Preparation changed. Review it before readying or starting again.",
    });
}

/** Social commands hold sorted account locks before taking the lobby lock. */
export async function admitPreparationGuest(
  id: string,
  guestUserId: string,
  tx: Database,
) {
  const preparation = await lockPreparation(id, tx);
  requireOpenPreparation(preparation);
  if (
    preparation.dungeonId ||
    preparation.hostUserId === guestUserId ||
    (preparation.guestUserId && preparation.guestUserId !== guestUserId)
  )
    throw new TRPCError({
      code: "CONFLICT",
      message: "This preparation no longer has an available guest place",
    });
  if (preparation.guestUserId === guestUserId) return preparation;
  const [updated] = await tx
    .update(TB_preparation)
    .set({
      guestUserId,
      guestCharacterId: null,
      guestReadyRevision: null,
      hostReadyRevision: null,
      revision: preparation.revision + 1,
    })
    .where(eq(TB_preparation.id, id))
    .returning();
  return updated!;
}

export async function clearPreparationGuest(
  preparation: Preparation,
  tx: Database,
) {
  await tx
    .update(TB_preparation)
    .set({
      guestUserId: null,
      guestCharacterId: null,
      guestReadyRevision: null,
      hostReadyRevision: null,
      revision: preparation.revision + 1,
    })
    .where(eq(TB_preparation.id, preparation.id));
  if (preparation.guestUserId)
    await tx
      .delete(TB_preparationConnection)
      .where(
        and(
          eq(TB_preparationConnection.preparationId, preparation.id),
          eq(TB_preparationConnection.userId, preparation.guestUserId),
        ),
      );
}

export async function separatePreparations(a: string, b: string, tx: Database) {
  const preparations = await tx
    .select()
    .from(TB_preparation)
    .where(
      and(
        isNull(TB_preparation.dungeonId),
        isNull(TB_preparation.closedAt),
        or(
          and(
            eq(TB_preparation.hostUserId, a),
            eq(TB_preparation.guestUserId, b),
          ),
          and(
            eq(TB_preparation.hostUserId, b),
            eq(TB_preparation.guestUserId, a),
          ),
        ),
      ),
    )
    .orderBy(TB_preparation.id)
    .for("update");
  for (const preparation of preparations)
    await clearPreparationGuest(preparation, tx);
}
