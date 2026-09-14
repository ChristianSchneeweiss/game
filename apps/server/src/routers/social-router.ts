import { z } from "zod";
import { protectedProcedure, router } from "../lib/trpc";
import {
  blockPlayer,
  getFriends,
  lookupFriendCode,
  removeFriend,
  respondFriendRequest,
  sendFriendRequest,
  unblockPlayer,
} from "../game-usecases/social-relations";
import {
  cancelDungeonInvitation,
  getInvitations,
  inviteToDungeon,
  respondDungeonInvitation,
} from "../game-usecases/social-invitations";

const user = z.object({ userId: z.string().min(1).max(128) });
const invitationId = z.string().min(1).max(128);

export const socialRouter = router({
  getFriends: protectedProcedure.query(({ ctx }) =>
    getFriends(ctx.session.id, ctx.db),
  ),
  lookupCode: protectedProcedure
    .input(z.object({ code: z.string().trim().min(1).max(40) }))
    .query(({ ctx, input }) =>
      lookupFriendCode(input.code, ctx.session.id, ctx.db),
    ),
  sendRequest: protectedProcedure
    .input(user)
    .mutation(({ ctx, input }) =>
      sendFriendRequest(ctx.session.id, input.userId, ctx.db),
    ),
  respondRequest: protectedProcedure
    .input(z.object({ requestId: invitationId, accept: z.boolean() }))
    .mutation(({ ctx, input }) =>
      respondFriendRequest(
        input.requestId,
        input.accept,
        ctx.session.id,
        ctx.db,
      ),
    ),
  removeFriend: protectedProcedure
    .input(user)
    .mutation(({ ctx, input }) =>
      removeFriend(ctx.session.id, input.userId, ctx.db),
    ),
  block: protectedProcedure
    .input(user)
    .mutation(({ ctx, input }) =>
      blockPlayer(ctx.session.id, input.userId, ctx.db),
    ),
  unblock: protectedProcedure
    .input(user)
    .mutation(({ ctx, input }) =>
      unblockPlayer(ctx.session.id, input.userId, ctx.db),
    ),
  getInvitations: protectedProcedure.query(({ ctx }) =>
    getInvitations(ctx.session.id, ctx.db),
  ),
  invite: protectedProcedure
    .input(user.extend({ lobbyId: z.string().min(1).max(128) }))
    .mutation(({ ctx, input }) =>
      inviteToDungeon(input.lobbyId, input.userId, ctx.session.id, ctx.db),
    ),
  respondInvitation: protectedProcedure
    .input(z.object({ invitationId, accept: z.boolean() }))
    .mutation(({ ctx, input }) =>
      respondDungeonInvitation(
        input.invitationId,
        input.accept,
        ctx.session.id,
        ctx.db,
      ),
    ),
  cancelInvitation: protectedProcedure
    .input(z.object({ invitationId }))
    .mutation(({ ctx, input }) =>
      cancelDungeonInvitation(input.invitationId, ctx.session.id, ctx.db),
    ),
});
