import type { ComponentProps, CSSProperties } from "react";
import { cn } from "@/lib/utils";

/** Native range semantics retain touch, Home/End and arrow-key support. */
export function Slider({
  min = 0,
  max = 100,
  value,
  className,
  style,
  ...props
}: Omit<
  ComponentProps<"input">,
  "type" | "min" | "max" | "value" | "defaultValue"
> & {
  min?: number;
  max?: number;
  value: number;
}) {
  const progress =
    max > min
      ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
      : 0;
  return (
    <input
      {...props}
      type="range"
      min={min}
      max={max}
      value={value}
      className={cn("rpg-slider", className)}
      style={{ "--slider-progress": `${progress}%`, ...style } as CSSProperties}
    />
  );
}
