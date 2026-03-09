import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[0.85rem] border-2 px-4 py-2 text-[0.72rem] font-semibold tracking-[0.16em] uppercase transition-all duration-200 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 before:pointer-events-none before:absolute before:inset-[3px] before:rounded-[0.55rem] before:border before:opacity-60 before:content-['']",
  {
    variants: {
      variant: {
        default:
          "border-[#8a7753] bg-[linear-gradient(180deg,#c9a45d_0%,#a57d3f_48%,#6f4d25_100%)] text-[#23150a] shadow-[inset_0_1px_0_rgba(255,240,205,0.36),0_10px_26px_rgba(0,0,0,0.28)] before:border-[#f3d79a]/35 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:brightness-95",
        destructive:
          "border-[#8e4038] bg-[linear-gradient(180deg,#8f342a_0%,#6d211a_52%,#3f120f_100%)] text-[#f5e9e4] shadow-[inset_0_1px_0_rgba(255,222,222,0.18),0_10px_26px_rgba(0,0,0,0.28)] before:border-[#d88677]/20 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:brightness-95",
        outline:
          "border-[#7d6a49] bg-[linear-gradient(180deg,rgba(51,43,32,0.96),rgba(31,25,19,0.98))] text-[#e2d3b0] shadow-[inset_0_1px_0_rgba(255,238,206,0.06),0_8px_18px_rgba(0,0,0,0.22)] before:border-[#d8bf88]/16 hover:border-[#b89656] hover:bg-[linear-gradient(180deg,rgba(62,52,39,0.96),rgba(37,30,22,0.98))] hover:text-[#f4e4bf]",
        secondary:
          "border-[#74654a] bg-[linear-gradient(180deg,rgba(61,53,40,0.95),rgba(39,33,25,0.98))] text-[#f0e0bb] shadow-[inset_0_1px_0_rgba(255,240,204,0.06)] before:border-[#cfb580]/14 hover:brightness-105",
        ghost:
          "border-transparent bg-transparent text-[#d9caa7] before:border-transparent hover:border-[#7b694a]/35 hover:bg-[#2e261b]/60 hover:text-[#f2e2ba]",
        ghostRelic:
          "border-[#6f6045]/35 bg-[#2b241b]/72 text-[#d7c8a4] shadow-[inset_0_1px_0_rgba(255,239,202,0.04)] before:border-[#bda270]/12 hover:border-[#b08f56]/45 hover:bg-[#372d21]/90 hover:text-[#f0dfb8]",
        relic:
          "border-[#8a7753] bg-[linear-gradient(180deg,#c9a45d_0%,#a57d3f_48%,#6f4d25_100%)] text-[#23150a] shadow-[inset_0_1px_0_rgba(255,240,205,0.36),0_10px_26px_rgba(0,0,0,0.28)] before:border-[#f3d79a]/35 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:brightness-95",
        spell:
          "border-[#63513a] bg-[linear-gradient(180deg,rgba(60,51,37,0.96),rgba(28,25,20,0.98))] text-[#eadaba] shadow-[inset_0_1px_0_rgba(255,238,206,0.04),0_8px_18px_rgba(0,0,0,0.22)] before:border-[#c3aa7a]/14 hover:border-[#c8ac75]/35 hover:bg-[linear-gradient(180deg,rgba(70,60,43,0.96),rgba(33,29,23,0.98))]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 text-[0.66rem]",
        lg: "h-11 px-6 text-[0.76rem]",
        icon: "h-10 w-10 px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
