"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/20 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-zinc-900 text-white shadow-xs hover:bg-zinc-800 active:bg-black dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white",
        secondary:
          "border border-zinc-200 bg-white text-zinc-900 shadow-2xs hover:bg-zinc-50 hover:border-zinc-300 active:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800",
        ghost:
          "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80 active:bg-zinc-200/60 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800/80",
        accent:
          "bg-[#18181B] text-white shadow-xs hover:bg-zinc-800 active:bg-zinc-900 focus-visible:ring-zinc-900/20",
        dark:
          "bg-zinc-950 text-zinc-100 border border-zinc-800 shadow-xs hover:bg-zinc-900 hover:border-zinc-700",
      },
      size: {
        sm: "h-8 px-2.5 text-xs rounded-md",
        md: "h-9 px-3.5 text-xs rounded-lg",
        lg: "h-10 px-4 text-sm rounded-lg",
        icon: "h-8 w-8 px-0 rounded-md",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Component = asChild ? Slot : "button";
    return (
      <Component
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";