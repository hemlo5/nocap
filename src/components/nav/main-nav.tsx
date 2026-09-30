"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Briefcase, Activity, Compass } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function MainNav() {
  const pathname = usePathname();

  const isOpportunities = pathname === "/";
  const isPulse = pathname.startsWith("/pulse");
  const isPainPoints = pathname.startsWith("/pain-points");

  useEffect(() => {
    if (typeof document === "undefined") return;
    const bg = isPainPoints ? "#070709" : "#F7F8FB";
    document.documentElement.style.backgroundColor = bg;
    document.body.style.backgroundColor = bg;
  }, [isPainPoints]);

  return (
    <header
      suppressHydrationWarning
      className={cn(
        "sticky top-0 z-50 w-full shrink-0 border-b backdrop-blur-md transition-colors duration-200",
        isPainPoints
          ? "border-zinc-800/80 bg-[#070709]/90 text-white"
          : "border-zinc-200/80 bg-white/90 text-zinc-900",
      )}
    >
      <div
        suppressHydrationWarning
        className="mx-auto flex h-14 max-w-screen-2xl items-center gap-2 sm:gap-4 px-3 sm:px-6"
      >
        {/* Brand */}
        <Link
          href="/"
          className={cn(
            "group flex shrink-0 items-center gap-2 font-bold tracking-tight transition-opacity hover:opacity-90 mr-1",
            isPainPoints ? "text-white" : "text-zinc-900",
          )}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#18181B] text-white shadow-2xs transition-transform group-hover:scale-105">
            <span className="text-xs font-black tracking-tight">H</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-tight leading-none">hemlo</span>
            <span className={cn("text-[10px] font-medium tracking-normal leading-none mt-0.5", isPainPoints ? "text-zinc-500" : "text-zinc-400")}>
              Bengaluru
            </span>
          </div>
        </Link>

        <div
          className={cn(
            "hidden sm:block h-4 w-px shrink-0",
            isPainPoints ? "bg-zinc-800" : "bg-zinc-200",
          )}
          aria-hidden
        />

        {/* Nav Links — Vercel segmented style */}
        <nav className="flex items-center gap-1 shrink-0" aria-label="Main navigation">
          <Link
            href="/"
            aria-current={isOpportunities ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition-all duration-150",
              isOpportunities
                ? isPainPoints
                  ? "bg-zinc-800 text-white shadow-2xs"
                  : "bg-[#18181B] text-white shadow-2xs"
                : isPainPoints
                  ? "text-zinc-400 hover:bg-zinc-800/60 hover:text-white"
                  : "text-zinc-600 hover:bg-zinc-100/70 hover:text-zinc-900",
            )}
            title="Opportunities & Map"
          >
            <Briefcase className="h-3.5 w-3.5 shrink-0 opacity-75 group-hover:opacity-100" aria-hidden />
            <span className="hidden md:inline">Opportunities</span>
            <span className="md:hidden">Jobs</span>
            {isOpportunities && (
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-400/20" />
            )}
          </Link>

          <Link
            href="/pulse"
            aria-current={isPulse ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition-all duration-150",
              isPulse
                ? isPainPoints
                  ? "bg-zinc-800 text-white shadow-2xs"
                  : "bg-[#18181B] text-white shadow-2xs"
                : isPainPoints
                  ? "text-zinc-400 hover:bg-zinc-800/60 hover:text-white"
                  : "text-zinc-600 hover:bg-zinc-100/70 hover:text-zinc-900",
            )}
            title="Startup Pulse & News"
          >
            <Activity className="h-3.5 w-3.5 shrink-0 opacity-75 group-hover:opacity-100" aria-hidden />
            <span>Pulse</span>
          </Link>

          <Link
            href="/pain-points"
            aria-current={isPainPoints ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition-all duration-150",
              isPainPoints
                ? "bg-zinc-800 text-white shadow-2xs ring-1 ring-zinc-700/60"
                : "text-zinc-600 hover:bg-zinc-100/70 hover:text-zinc-900",
            )}
            title="Market Whitespace & Gaps"
          >
            <Compass className="h-3.5 w-3.5 shrink-0 opacity-75 group-hover:opacity-100" aria-hidden />
            <span className="hidden sm:inline">Pain Points</span>
            <span className="sm:hidden">Gaps</span>
          </Link>
        </nav>

        {/* Portal slot — HemloApp injects location search here */}
        <div id="nav-search-slot" className="flex flex-1 items-center min-w-0 justify-end sm:justify-start" />
      </div>
    </header>
  );
}