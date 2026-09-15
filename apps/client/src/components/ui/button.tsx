import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva("rpg-button", {
  variants: {
    variant: {
      default: "rpg-button-primary",
      relic: "rpg-button-primary",
      destructive: "rpg-button-destructive",
      outline: "rpg-button-outline",
      secondary: "rpg-button-secondary",
      ghost: "rpg-button-ghost",
      ghostRelic: "rpg-button-secondary",
      spell: "rpg-button-secondary",
      link: "rpg-button-link",
    },
    size: {
      default: "",
      sm: "rpg-button-sm",
      lg: "rpg-button-lg",
      icon: "rpg-button-icon",
    },
  },
  defaultVariants: { variant: "default", size: "default" },
});
export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  pending?: boolean;
}
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, pending, disabled, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        aria-busy={pending || undefined}
        disabled={disabled || pending}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
export { Button, buttonVariants };
