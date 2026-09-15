import {
  cloneElement,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserCircle } from "lucide-react";

export const account =
  new URLSearchParams(location.search).get("account") ?? "owner";
export const ownerId = account === "guest" ? "fixture-guest" : "fixture-owner";
const user =
  account === "signed-out"
    ? null
    : {
        id: ownerId,
        primaryEmailAddress: { emailAddress: "preview@example.invalid" },
      };
export function useUser() {
  return { user, isLoaded: true, isSignedIn: Boolean(user) };
}
export function SignedIn({ children }: { children: ReactNode }) {
  return user ? children : null;
}
export function SignedOut({ children }: { children: ReactNode }) {
  return user ? null : children;
}
export function SignInButton({
  children,
}: {
  children: ReactElement<{ onClick?: () => void }>;
  mode?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {cloneElement(children, { onClick: () => setOpen(true) })}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Account entry</DialogTitle>
          <DialogDescription>
            This development fixture replaces Clerk at the authentication
            boundary. Production opens the existing Clerk flow.
          </DialogDescription>
          <Button onClick={() => setOpen(false)}>Return to preview</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
export const SignUpButton = SignInButton;
export function UserButton() {
  return (
    <SignInButton>
      <Button aria-label="Account" variant="ghost" size="icon">
        <UserCircle />
      </Button>
    </SignInButton>
  );
}
