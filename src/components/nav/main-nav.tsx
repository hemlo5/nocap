"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Briefcase, Activity, Compass } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function MainNav() {
  const pathname = usePathname();
  const isPainPoints = pathname === "/pain-points" || pathname === "/pulse";

  useEffect(() => {
    document.documentElement.style.backgroundColor = isPainPoints ? "#09090b" : "#F9FAFB";
    return () => { document.documentElement.style.backgroundColor = ""; };
  }, [isPainPoints]);

  return (
    <header
      suppressHydrationWarning
      className={cn(
        "sticky top-0 z-40 w-full border-b backdrop-blur-md transition-colors duration-300",
        isPainPoints
          ? "border-zinc-800/60 bg-zinc-950/90 text-zinc-100"
          : "border-zinc-200/70 bg-white/90 text-zinc-900",
      )}
    >
      <div className="mx-auto flex h-11 max-w-[1600px] items-center gap-1 px-3 sm:gap-2 sm:px-4">

        {/* Brand */}
        <Link
          href="/"
          className={cn(
            "group flex shrink-0 items-center gap-2 font-bold tracking-tight transition-opacity hover:opacity-90 mr-1",
            isPainPoints ? "text-white" : "text-zinc-900",
          )}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#18181B] text-white shadow-sm transition-transform group-hover:scale-105">
            <span className="text-xs font-black tracking-tight select-none">H</span>
          </div>
          <div className="flex flex-col">
            <span suppressHydrationWarning className="text-sm font-black tracking-tight leading-none">
              hemlo
            </span>
            <span className={cn("text-[10px] font-medium tracking-normal leading-none mt-0.5", isPainPoints ? "text-zinc-500" : "text-zinc-400")}>
              Bengaluru
            </span>
          </div>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-0.5 sm:gap-1 ml-1" aria-label="Main navigation">
          <Link
            href="/"
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors sm:px-2.5",
              pathname === "/" || pathname === ""
                ? isPainPoints
                  ? "bg-zinc-800 text-white"
                  : "bg-[#18181B] text-white"
                : isPainPoints
                  ? "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
            )}
          >
            <Briefcase className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="hidden sm:inline">Opportunities</span>
            <span className="sm:hidden">Jobs</span>
            {pathname === "/" && (
              <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" aria-hidden />
            )}
          </Link>

          <Link
            href="/pulse"
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors sm:px-2.5",
              pathname === "/pulse"
                ? "bg-[#18181B] text-white"
                : isPainPoints
                  ? "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
            )}
          >
            <Activity className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>Pulse</span>
          </Link>

          <Link
            href="/pain-points"
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors sm:px-2.5",
              pathname === "/pain-points"
                ? "bg-[#18181B] text-white"
                : isPainPoints
                  ? "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
            )}
          >
            <Compass className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="hidden sm:inline">Pain Points</span>
            <span className="sm:hidden">Insights</span>
          </Link>
        </nav>

        {/* Portal slot — HemloApp injects location search here */}
        <div id="nav-search-slot" className="ml-auto flex items-center" />
      </div>
    </header>
  );
}
