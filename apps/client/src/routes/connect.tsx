import { createFileRoute, redirect } from "@tanstack/react-router";

// Preserve old bookmarks from the wallet experiment.
export const Route = createFileRoute("/connect")({
  beforeLoad: () => { throw redirect({ to: "/characters" }); },
});
