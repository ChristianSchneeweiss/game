import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./trpc";
import type { PropsWithChildren } from "react";

export function TRPCProvider({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
