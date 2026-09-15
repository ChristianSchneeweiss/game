import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Native selection keeps platform keyboard and touch behavior. */
export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn("rpg-input", className)} {...props} />;
}
