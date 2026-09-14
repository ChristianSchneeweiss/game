import { Button } from "@/components/ui/button";
import { trpc } from "@/utils/trpc";
import { userStore } from "@/utils/user-store";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { cn } from "@/lib/utils";

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
    <Button
      asChild
      variant="outline"
      className={cn("h-10 px-3 text-[0.68rem]", className)}
    >
      <Link
        to="/invitations"
        aria-label={`Dungeon invitations${count ? `, ${count} pending` : ""}`}
      >
        <Mail size={16} />
        <span className="hidden xl:inline">Inbox</span>
        {count > 0 ? (
          <span className="rounded-full bg-[#bb8e3e] px-1.5 text-[#21180d]">
            {count}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}
