"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Sparkles, Star } from "lucide-react";

const GOOGLE_PREFERRED_SOURCE_URL =
  "https://www.google.com/preferences/source?q=nocapblr.com";

export function PreferredSourceBadge({
  variant = "card",
  className = "",
}: {
  variant?: "card" | "compact" | "banner";
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (variant === "compact") {
    return (
      <a
        href={GOOGLE_PREFERRED_SOURCE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`group flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-3 text-left shadow-2xs hover:border-zinc-400 hover:shadow-xs transition-all ${className}`}
        title="Add NoCapBLR as a Preferred Source on Google"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-zinc-950 text-amber-400">
            <Star className="h-3.5 w-3.5 fill-amber-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-zinc-900 group-hover:text-red-700 transition-colors">
                Preferred on Google
              </span>
              <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[9px] font-black text-amber-900">
                AI Overviews
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 truncate">
              Pin honest Bengaluru reviews
            </p>
          </div>
        </div>
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-zinc-400 group-hover:text-zinc-900 transition-colors" />
      </a>
    );
  }

  if (variant === "banner") {
    return (
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-xs ${className}`}
      >
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-zinc-950 text-white shadow-2xs">
            <GoogleLogo className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-zinc-950">
                Follow NoCapBLR on Google Search
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                <Sparkles className="h-3 w-3 text-emerald-600" />
                Preferred Source
              </span>
            </div>
            <p className="text-xs text-zinc-600 mt-0.5">
              Get candid Bengaluru place takes directly in your Google AI Overviews and Search results.
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          {/* Official Google Button container */}
          {mounted && <div google-add-preferred-source-btn data-theme="light" />}
          {/* Direct link fallback / action button */}
          <a
            href={GOOGLE_PREFERRED_SOURCE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-3.5 py-2 text-xs font-bold text-white hover:bg-zinc-800 transition-colors shadow-2xs"
          >
            <span>Pin on Google</span>
            <ExternalLink className="h-3 w-3 text-zinc-400" />
          </a>
        </div>
      </div>
    );
  }

  // Default "card" variant (ideal for SiteFooter)
  return (
    <div
      className={`rounded-2xl border border-zinc-200/90 bg-zinc-50/70 p-4 sm:p-5 shadow-2xs ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white border border-zinc-200 shadow-2xs">
          <GoogleLogo className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black uppercase tracking-wider text-zinc-900">
              Google Preferred Source
            </span>
            <span className="rounded-full bg-amber-100 border border-amber-200 px-2 py-0.2 text-[9px] font-black text-amber-900">
              AI Overviews
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-zinc-600">
            Designate <strong>NoCapBLR</strong> as your preferred source to see unfiltered Bengaluru place reviews directly in Google Search results and AI Overviews.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {mounted && <div google-add-preferred-source-btn data-theme="light" />}
            <a
              href={GOOGLE_PREFERRED_SOURCE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-bold text-white hover:bg-zinc-800 transition-colors"
            >
              <span>+ Add to Google Sources</span>
              <ExternalLink className="h-3 w-3 text-zinc-400" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleLogo({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}
