import type { ComponentProps } from "react";
import { Check, Circle, CircleAlert, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const icons = {
  neutral: Circle,
  success: Check,
  warning: Clock,
  danger: CircleAlert,
};
export function Status({
  tone = "neutral",
  children,
  className,
  ...props
}: ComponentProps<"span"> & { tone?: keyof typeof icons }) {
  const Icon = icons[tone];
  return (
    <span className={cn("rpg-status", className)} data-tone={tone} {...props}>
      <Icon size={14} aria-hidden="true" />
      {children}
    </span>
  );
}

export function Feedback({
  children,
  error = false,
  className,
  ...props
}: ComponentProps<"div"> & { error?: boolean }) {
  return (
    <div
      className={cn("rpg-feedback", className)}
      role={error ? "alert" : "status"}
      {...props}
    >
      {children}
    </div>
  );
}
