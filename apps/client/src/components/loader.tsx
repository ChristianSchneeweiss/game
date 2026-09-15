import { Loader2 } from "lucide-react";

export default function Loader() {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-30 z-40 flex justify-center">
      <div role="status" className="rpg-badge bg-background shadow-lg">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    </div>
  );
}
