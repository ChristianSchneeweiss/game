import { useUser } from "@clerk/clerk-react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./trpc";
import { useEffect, type PropsWithChildren } from "react";
import Loader from "../components/loader";
import { userStore } from "./user-store";

/** Lives outside route boundaries so authentication also updates on error pages. */
export function TRPCProvider({ children }: PropsWithChildren) {
  const { user: clerkUser, isLoaded } = useUser();
  const user = userStore((state) => state.user);
  const setUser = userStore((state) => state.setUser);
  const userId = clerkUser?.id;
  const email = clerkUser?.primaryEmailAddress?.emailAddress;

  useEffect(() => {
    if (isLoaded) setUser(userId ? { id: userId, email } : null);
  }, [isLoaded, userId, email, setUser]);

  // Remove the previous identity's observers immediately. setUser clears their
  // cache before publishing the identity that allows the new subtree to mount.
  if (!isLoaded || user?.id !== userId) return <Loader />;

  return (
    <QueryClientProvider key={userId ?? "signed-out"} client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
