import Link from "next/link";
import { Map, Shield, Flame, Heart, Compass, Sparkles } from "lucide-react";
import { nocapPlaceCategories, categoryDetails, getAllAreas } from "@/lib/nocap/places";

export function SiteFooter() {
  const topAreas = getAllAreas().slice(0, 8);

  return (
    <footer className="border-t border-zinc-200/80 bg-white text-zinc-600 text-sm">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand info */}
          <div className="md:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2 group">
              <img
                src="/nocap-logo.png"
                alt="NoCap BLR"
                className="h-8 w-auto object-contain transition-transform group-hover:scale-105"
              />
            </Link>
            <p className="mt-4 text-sm text-zinc-600 max-w-sm leading-relaxed">
              <strong>India’s Next Big Review Network.</strong> The no-BS guide to Bengaluru places. Real people, unfiltered community opinions, and location-verified takes.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-zinc-500">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Bengaluru Local Community · Live</span>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-950">
              Categories
            </h3>
            <ul className="mt-4 space-y-2.5">
              {nocapPlaceCategories.map((cat) => (
                <li key={cat}>
                  <Link
                    href={`/categories/${cat}`}
                    className="text-xs text-zinc-600 hover:text-zinc-950 font-medium transition-colors"
                  >
                    {categoryDetails[cat]?.name ?? cat}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/map"
                  className="text-xs font-semibold text-zinc-950 hover:underline flex items-center gap-1"
                >
                  <Map className="h-3 w-3" />
                  <span>Interactive Map</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Top Neighborhoods */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-950">
              Neighborhoods
            </h3>
            <ul className="mt-4 space-y-2.5">
              {topAreas.map((area) => (
                <li key={area.slug}>
                  <Link
                    href={`/areas/${area.slug}`}
                    className="text-xs text-zinc-600 hover:text-zinc-950 font-medium transition-colors"
                  >
                    {area.name} <span className="text-zinc-400">({area.count})</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Trust & Company */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-950">
              Trust & Truth
            </h3>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link
                  href="/what-nocap"
                  className="text-xs text-zinc-600 hover:text-zinc-950 font-medium transition-colors"
                >
                  What NoCap
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-xs text-zinc-600 hover:text-zinc-950 font-medium transition-colors"
                >
                  About NoCapBLR
                </Link>
              </li>
              <li>
                <Link
                  href="/guidelines"
                  className="text-xs text-zinc-600 hover:text-zinc-950 font-medium transition-colors"
                >
                  Community Guidelines
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-xs text-zinc-600 hover:text-zinc-950 font-medium transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-xs text-zinc-600 hover:text-zinc-950 font-medium transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <a
                  href="mailto:contact@nocapblr.com"
                  className="text-xs text-zinc-600 hover:text-zinc-950 font-medium transition-colors"
                >
                  contact@nocapblr.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-zinc-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p>© {new Date().getFullYear()} NoCapBLR. All rights reserved. No paid PR, no filter.</p>
          <p className="flex items-center gap-1 font-medium">
            <span>Crafted with</span>
            <span className="text-rose-500">♥</span>
            <span>for Bengaluru</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

