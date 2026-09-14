import { DungeonKeySchema } from "@loot-game/game/dungeons/dungeon-keys";
import z from "zod";
import { protectedProcedure, router } from "../lib/trpc";
import {
  getPreparation,
  listPreparations,
} from "../game-usecases/shared-preparation-read";
import {
  createPreparation,
  leavePreparation,
  playAgainTogether,
  readyPreparation,
  selectPreparationCharacter,
  setPreparationDungeon,
  startPreparation,
} from "../game-usecases/shared-preparation";

const identity = z.object({ id: z.string().min(1) });
const dungeon = z.object({
  key: DungeonKeySchema,
  branching: z.boolean().default(true),
});
export const preparationRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    listPreparations(ctx.session.id, ctx.db),
  ),
  get: protectedProcedure
    .input(identity)
    .query(({ ctx, input }) =>
      getPreparation(input.id, ctx.session.id, ctx.db),
    ),
  create: protectedProcedure
    .input(dungeon)
    .mutation(({ ctx, input }) =>
      createPreparation(ctx.session.id, input.key, input.branching, ctx.db),
    ),
  selectCharacter: protectedProcedure
    .input(identity.extend({ characterId: z.string().min(1) }))
    .mutation(({ ctx, input }) =>
      selectPreparationCharacter(
        input.id,
        ctx.session.id,
        input.characterId,
        ctx.db,
      ),
    ),
  setDungeon: protectedProcedure
    .input(identity.merge(dungeon))
    .mutation(({ ctx, input }) =>
      setPreparationDungeon(
        input.id,
        ctx.session.id,
        input.key,
        input.branching,
        ctx.db,
      ),
    ),
  ready: protectedProcedure
    .input(
      identity.extend({
        ready: z.boolean(),
        expectedRevision: z.number().int().nonnegative(),
        expectedBuildRevision: z.number().int().nonnegative().nullable(),
      }),
    )
    .mutation(({ ctx, input }) =>
      readyPreparation(
        input.id,
        ctx.session.id,
        input.ready,
        ctx.db,
        input.expectedRevision,
        input.expectedBuildRevision,
      ),
    ),
  start: protectedProcedure
    .input(
      identity.extend({ expectedRevision: z.number().int().nonnegative() }),
    )
    .mutation(({ ctx, input }) =>
      startPreparation(
        input.id,
        ctx.session.id,
        ctx.db,
        input.expectedRevision,
      ),
    ),
  leave: protectedProcedure
    .input(identity)
    .mutation(({ ctx, input }) =>
      leavePreparation(input.id, ctx.session.id, ctx.db),
    ),
  playAgain: protectedProcedure
    .input(z.object({ dungeonId: z.string().min(1) }))
    .mutation(({ ctx, input }) =>
      playAgainTogether(input.dungeonId, ctx.session.id, ctx.db),
    ),
});
