"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map, Briefcase, Info, HelpCircle, Flame } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function HemloNav() {
  const pathname = usePathname();
  const isMap = pathname.startsWith("/map") || pathname.startsWith("/nocap");
  const isOpportunities = pathname.startsWith("/opportunities");
  const isWhyNocap = pathname.startsWith("/why-nocap") || pathname.startsWith("/what-is-nocap");
  const isAbout = pathname.startsWith("/about");

  return (
    <header
      className={cn(
        "hidden lg:block sticky top-0 z-50 w-full shrink-0 border-b backdrop-blur-md",
        "border-zinc-200/80 bg-white/90 text-zinc-900",
      )}
    >
      <div suppressHydrationWarning className="mx-auto flex h-14 max-w-screen-2xl items-center gap-2 sm:gap-4 px-3 sm:px-6">
        {/* Brand */}
        <Link
          href="/"
          className="group flex shrink-0 items-center transition-opacity hover:opacity-90 mr-1"
        >
          <img
            src="/nocap-logo.png"
            alt="NoCap BLR"
            className="h-7 w-auto object-contain transition-transform group-hover:scale-105"
          />
        </Link>

        <div
          suppressHydrationWarning
          className="hidden sm:block h-4 w-px shrink-0 bg-zinc-200"
          aria-hidden
        />

        {/* Left Nav Links */}
        <nav className="flex items-center gap-1 shrink-0" aria-label="Main navigation">
          <Link
            href="/map"
            aria-current={isMap ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition-all duration-150",
              isMap
                ? "bg-[#18181B] text-white shadow-2xs"
                : "text-zinc-600 hover:bg-zinc-100/70 hover:text-zinc-900",
            )}
            title="Interactive Map"
          >
            <Map className="h-3.5 w-3.5 shrink-0 opacity-75 group-hover:opacity-100" aria-hidden />
            <span>Map</span>
          </Link>

          <Link
            href="/opportunities"
            aria-current={isOpportunities ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition-all duration-150",
              isOpportunities
                ? "bg-[#18181B] text-white shadow-2xs"
                : "text-zinc-600 hover:bg-zinc-100/70 hover:text-zinc-900",
            )}
            title="Job opportunities"
          >
            <Briefcase className="h-3.5 w-3.5 shrink-0 opacity-75 group-hover:opacity-100" aria-hidden />
            <span>Opportunities</span>
          </Link>
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right Most Navigation & Account Slot */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Link
            href="/why-nocap"
            aria-current={isWhyNocap ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition-all duration-150",
              isWhyNocap
                ? "bg-[#18181B] text-white shadow-2xs"
                : "text-zinc-600 hover:bg-zinc-100/70 hover:text-zinc-900",
            )}
            title="What is NoCap & Why NoCap"
          >
            <HelpCircle className="h-3.5 w-3.5 shrink-0 opacity-75 group-hover:opacity-100 text-amber-500" aria-hidden />
            <span>Why NoCap</span>
          </Link>

          <Link
            href="/about"
            aria-current={isAbout ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition-all duration-150",
              isAbout
                ? "bg-[#18181B] text-white shadow-2xs"
                : "text-zinc-600 hover:bg-zinc-100/70 hover:text-zinc-900",
            )}
            title="About NoCapBLR"
          >
            <Info className="h-3.5 w-3.5 shrink-0 opacity-75 group-hover:opacity-100" aria-hidden />
            <span>About</span>
          </Link>

          {/* Portal slot — AccountButton and Profile injected here */}
          <div suppressHydrationWarning id="nav-search-slot" className="flex items-center gap-2 pl-1" />
        </div>
      </div>
    </header>
  );
}

export { HemloNav as MainNav };
