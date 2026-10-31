"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Compass, HelpCircle, Info, Map, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const linkBase = "group flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors";

export function HemloNav() {
  const pathname = usePathname();
  const isMap = pathname.startsWith("/map") || pathname.startsWith("/nocap");
  const isOpportunities = pathname.startsWith("/opportunities");
  const isWhatNocap = pathname.startsWith("/what-nocap") || pathname.startsWith("/why-nocap") || pathname.startsWith("/what-is-nocap") || pathname.startsWith("/how-it-works");
  const isAbout = pathname.startsWith("/about") || pathname.startsWith("/founder") || pathname.startsWith("/campaigns") || pathname.startsWith("/posters");
  const state = (active: boolean) => cn(linkBase, active ? "bg-zinc-950 text-white" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950");

  return (
    <header className="hidden lg:block sticky top-0 z-50 w-full shrink-0 border-b border-zinc-200/80 bg-white/90 text-zinc-900 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center gap-2 px-3 sm:gap-4 sm:px-6">
        <Link href="/" className="group mr-1 flex shrink-0 items-center transition-opacity hover:opacity-90">
          <img src="/nocap-logo.png" alt="NoCapBLR" className="h-7 w-auto object-contain transition-transform group-hover:scale-105" />
        </Link>
        <div className="hidden h-4 w-px shrink-0 bg-zinc-200 sm:block" aria-hidden />
        <nav className="flex min-w-0 items-center gap-1 overflow-x-auto whitespace-nowrap" aria-label="Main navigation">
          <Link href="/map" aria-current={isMap ? "page" : undefined} className={state(isMap)}><Map className="h-3.5 w-3.5" aria-hidden /><span>Map</span></Link>
          <Link href="/opportunities" aria-current={isOpportunities ? "page" : undefined} className={state(isOpportunities)}><Briefcase className="h-3.5 w-3.5" aria-hidden /><span>Opportunities</span></Link>
          <Link href="/guides" className="hidden sm:flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950"><Compass className="h-3.5 w-3.5" aria-hidden /><span>Guides</span></Link>
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Link href="/how-it-works" aria-current={isWhatNocap ? "page" : undefined} className={cn(state(isWhatNocap), "hidden md:flex")}><HelpCircle className="h-3.5 w-3.5" aria-hidden /><span>How it works</span></Link>
          <Link href="/about" aria-current={isAbout ? "page" : undefined} className={cn(state(isAbout), "hidden lg:flex")}><Info className="h-3.5 w-3.5" aria-hidden /><span>About</span></Link>
          <Link href="/newsroom" className="hidden xl:flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950"><Newspaper className="h-3.5 w-3.5" aria-hidden /><span>News</span></Link>
          <div suppressHydrationWarning id="nav-search-slot" className="flex items-center gap-2 pl-1" />
        </div>
      </div>
    </header>
  );
}

export { HemloNav as MainNav };
