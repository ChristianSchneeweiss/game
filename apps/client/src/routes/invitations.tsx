import { RpgHero, RpgPage, RpgPanel } from "@/components/rpg-ui";
import { Button } from "@/components/ui/button";
import {
  dungeonName,
  finishAccountAction,
  refreshSocial,
} from "@/features/social/social-queries";
import { trpc } from "@/utils/trpc";
import { userStore } from "@/utils/user-store";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Mail } from "lucide-react";

export const Route = createFileRoute("/invitations")({
  component: InvitationsPage,
});

function InvitationsPage() {
  const userId = userStore((state) => state.user?.id);
  const navigate = useNavigate();
  const { data } = useSuspenseQuery(
    trpc.social.getInvitations.queryOptions(undefined, {
      refetchInterval: 10_000,
    }),
  );
  const respond = useMutation(
    trpc.social.respondInvitation.mutationOptions({
      onSuccess: (result) =>
        finishAccountAction(userId, refreshSocial, async () => {
          if (result.status === "accepted")
            await navigate({
              to: "/dungeons/company/$id",
              params: { id: result.lobbyId },
            });
        }),
      onError: refreshSocial,
    }),
  );
  const invitations = data.filter(
    (invitation) => invitation.recipient.id === userId,
  );
  return (
    <RpgPage>
      <div className="space-y-7">
        <RpgHero
          eyebrow="Messages from the trail"
          title="Dungeon invitations"
          description="A place at a friend's camp. Invitations last 24 hours, even while either player is away. The first friend to accept takes the guest place."
        />
        {respond.error ? (
          <p role="alert" className="expedition-error">
            {respond.error.message}
          </p>
        ) : null}
        {invitations.length === 0 ? (
          <RpgPanel contentClassName="p-8 text-center">
            <Mail className="mx-auto mb-3 text-[#c4aa77]" size={32} />
            <h2 className="rpg-heading text-3xl">No invitations yet</h2>
            <p className="rpg-copy mt-3">
              Your invitations will be waiting here when a friend calls.
            </p>
            <Button asChild variant="outline" className="mt-5">
              <Link to="/friends">Your friends</Link>
            </Button>
          </RpgPanel>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {invitations.map((invitation) => (
              <RpgPanel key={invitation.id} contentClassName="space-y-4 p-6">
                <p className="rpg-title text-xs text-(--rpg-text-faint)">
                  {invitation.sender.username} invites you
                </p>
                <h2 className="rpg-heading text-3xl">
                  {dungeonName(invitation.dungeonKey)}
                </h2>
                <p className="rpg-copy text-sm">
                  {invitation.status === "pending"
                    ? `Available until ${new Date(invitation.expiresAt).toLocaleString()}`
                    : invitation.status === "accepted"
                      ? "Accepted · Your preparation is saved."
                      : `Invitation ${invitation.status}. This invitation is no longer available.`}
                </p>
                {invitation.status === "pending" ? (
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="relic"
                      disabled={respond.isPending}
                      onClick={() =>
                        respond.mutate({
                          invitationId: invitation.id,
                          accept: true,
                        })
                      }
                    >
                      Accept invitation
                    </Button>
                    <Button
                      variant="outline"
                      disabled={respond.isPending}
                      onClick={() =>
                        respond.mutate({
                          invitationId: invitation.id,
                          accept: false,
                        })
                      }
                    >
                      Decline
                    </Button>
                  </div>
                ) : invitation.status === "accepted" ? (
                  <Button asChild variant="outline">
                    <Link
                      to="/dungeons/company/$id"
                      params={{ id: invitation.lobbyId }}
                    >
                      Open preparation →
                    </Link>
                  </Button>
                ) : null}
              </RpgPanel>
            ))}
          </div>
        )}
      </div>
    </RpgPage>
  );
}
