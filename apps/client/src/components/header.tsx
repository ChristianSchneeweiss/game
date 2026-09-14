import { Button } from "@/components/ui/button";
import { HeaderFrame } from "@/components/header-frame";
import { trpc } from "@/utils/trpc";
import { InvitationBadge } from "@/features/social/invitation-badge";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Crown } from "lucide-react";

export default function Header() {
  const { data: loot } = useQuery(
    trpc.getMyLoot.queryOptions(undefined, {
      staleTime: 60_000,
      refetchInterval: 60_000,
    }),
  );
  const lootCount = loot?.length ?? 0;
  return (
    <HeaderFrame>
      <SignedIn>
        <InvitationBadge className="game-header-action" />
        {lootCount > 0 ? (
          <Button asChild variant="outline" className="game-header-action">
            <Link to="/loot">
              <Crown aria-hidden="true" />
              {lootCount} Loot
            </Link>
          </Button>
        ) : null}
        <div className="game-header-account">
          <UserButton appearance={{ elements: { avatarBox: "h-7 w-7" } }} />
        </div>
      </SignedIn>
      <SignedOut>
        <SignInButton mode="modal">
          <Button variant="outline" className="game-header-action">
            Sign in
          </Button>
        </SignInButton>
        <SignUpButton mode="modal">
          <Button variant="relic" className="game-header-action">
            Start run
          </Button>
        </SignUpButton>
      </SignedOut>
    </HeaderFrame>
  );
}
