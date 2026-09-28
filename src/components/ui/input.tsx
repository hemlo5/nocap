"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-8 w-full rounded-md border border-zinc-200 bg-white px-2.5 text-xs text-zinc-900 shadow-2xs outline-none transition-all duration-150 placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-950/10",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";