import { Button } from "@/components/ui/button";
import { trpc } from "@/utils/trpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { refreshSocial } from "./social-queries";

export function InviteFriends({ lobbyId }: { lobbyId: string }) {
  const friends = useQuery(trpc.social.getFriends.queryOptions());
  const invitations = useQuery(
    trpc.social.getInvitations.queryOptions(undefined, {
      refetchInterval: 10_000,
    }),
  );
  const invite = useMutation(
    trpc.social.invite.mutationOptions({ onSuccess: refreshSocial }),
  );
  const cancel = useMutation(
    trpc.social.cancelInvitation.mutationOptions({ onSuccess: refreshSocial }),
  );
  const pending =
    invitations.data?.filter(
      (invitation) =>
        invitation.lobbyId === lobbyId && invitation.status === "pending",
    ) ?? [];
  const invited = new Set(pending.map((invitation) => invitation.recipient.id));
  return (
    <section
      className="expedition-departure space-y-4"
      aria-label="Invite friends"
    >
      <small>One guest place</small>
      <h2>Invite a friend.</h2>
      <p>
        Invite several companions. The first to accept joins this preparation.
        Your camp stays open while you're away.
      </p>
      {friends.isPending ? <p role="status">Loading friends…</p> : null}
      {friends.data?.friends.length === 0 ? (
        <p>
          <Link className="expedition-text-link" to="/friends">
            Add your first friend →
          </Link>
        </p>
      ) : null}
      {friends.data?.friends.map((friend) => (
        <div
          className="flex flex-wrap items-center justify-between gap-3"
          key={friend.id}
        >
          <span>{friend.username}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={invited.has(friend.id) || invite.isPending}
            onClick={() => invite.mutate({ lobbyId, userId: friend.id })}
          >
            {invited.has(friend.id) ? "Invited" : "Invite friend"}
          </Button>
        </div>
      ))}
      {pending.map((invitation) => (
        <div
          className="flex items-center justify-between gap-3 text-sm"
          key={invitation.id}
        >
          <span>{invitation.recipient.username} · Awaiting reply</span>
          <Button
            variant="ghostRelic"
            size="sm"
            disabled={cancel.isPending}
            onClick={() => cancel.mutate({ invitationId: invitation.id })}
          >
            Cancel invitation
          </Button>
        </div>
      ))}
      {invite.error || cancel.error || friends.error || invitations.error ? (
        <p className="expedition-error" role="alert">
          {
            (invite.error ?? cancel.error ?? friends.error ?? invitations.error)
              ?.message
          }
        </p>
      ) : null}
    </section>
  );
}
