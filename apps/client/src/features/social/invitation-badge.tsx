import { Button } from "@/components/ui/button";
import { trpc } from "@/utils/trpc";
import { userStore } from "@/utils/user-store";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Mail } from "lucide-react";

export function InvitationBadge({ className }: { className?: string }) {
  const userId = userStore((state) => state.user?.id);
  const { data } = useQuery(
    trpc.social.getInvitations.queryOptions(undefined, {
      enabled: !!userId,
      staleTime: 10_000,
      refetchInterval: 15_000,
    }),
  );
  const count =
    data?.filter(
      (invitation) =>
        invitation.recipient.id === userId && invitation.status === "pending",
    ).length ?? 0;
  return (
    <Button asChild variant="outline" className={className}>
      <Link
        to="/invitations"
        aria-label={`Dungeon invitations${count ? `, ${count} pending` : ""}`}
        title={`Dungeon invitations${count ? `, ${count} pending` : ""}`}
      >
        <Mail size={16} />
        <span className="game-header-action-label">Inbox</span>
        {count > 0 ? (
          <span className="game-header-action-count">{count}</span>
        ) : null}
      </Link>
    </Button>
  );
}
