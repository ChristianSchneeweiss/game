import { Loader2 } from "lucide-react";

export default function Loader() {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-30 z-40 flex justify-center">
      <div className="rpg-badge bg-[#2c241b]/96 text-[#eedeb6] shadow-[0_12px_28px_rgba(0,0,0,0.28)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Scribing the next chamber
      </div>
    </div>
  );
}
