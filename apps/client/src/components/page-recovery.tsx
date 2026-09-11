import { SignInButton, SignedIn, SignedOut } from "@clerk/clerk-react";
import {
  Link,
  useRouter,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { Button } from "./ui/button";
import { queryClient } from "@/utils/trpc";

export function PageError({ reset }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <main className="expedition">
      <section className="expedition-shell" aria-labelledby="page-error-title">
        <p className="expedition-eyebrow">The trail is interrupted</p>
        <h1 id="page-error-title">We couldn't open this page.</h1>
        <SignedOut>
          <p>Sign in to return to your party and expeditions.</p>
          <SignInButton mode="modal">
            <Button>Sign in</Button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <p>
            This page may be unavailable, or it may belong to another party.
          </p>
          <Button
            onClick={() => {
              void queryClient.resetQueries();
              reset();
              void router.invalidate();
            }}
          >
            Try again
          </Button>
        </SignedIn>
        <Link className="expedition-text-link" to="/dungeons">
          Return to expeditions →
        </Link>
        <Link className="expedition-text-link" to="/characters">
          Create or manage characters →
        </Link>
      </section>
    </main>
  );
}

export function PageNotFound() {
  return (
    <main className="expedition">
      <section className="expedition-shell">
        <h1>This path doesn't exist.</h1>
        <p>Return to the expedition catalogue to choose your next journey.</p>
        <Link className="expedition-button" to="/dungeons">
          All expeditions →
        </Link>
      </section>
    </main>
  );
}
