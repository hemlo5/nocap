"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  MapPin,
  Share2,
  Sparkles,
  X,
  ZoomIn,
  Check,
} from "lucide-react";
import { POSTERS_DATA, type PosterItem } from "@/lib/nocap/posters";

const THEME_FILTERS = [
  { id: "all", label: "All Posters (9)" },
  { id: "civic", label: "Civic & Roads" },
  { id: "work", label: "Startups & Work" },
  { id: "campus", label: "Campus & Food" },
  { id: "nightlife", label: "Pubs & Nightlife" },
  { id: "safety", label: "Neighborhood Safety" },
] as const;

export function PostersGallery() {
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [activePosterIndex, setActivePosterIndex] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const filteredPosters =
    selectedFilter === "all"
      ? POSTERS_DATA
      : POSTERS_DATA.filter((p) => p.theme === selectedFilter);

  const activePoster =
    activePosterIndex !== null ? POSTERS_DATA[activePosterIndex] : null;

  // Handle keyboard navigation for modal lightbox
  useEffect(() => {
    if (activePosterIndex === null) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setActivePosterIndex(null);
      } else if (e.key === "ArrowLeft") {
        setActivePosterIndex((prev) =>
          prev !== null ? (prev === 0 ? POSTERS_DATA.length - 1 : prev - 1) : null
        );
      } else if (e.key === "ArrowRight") {
        setActivePosterIndex((prev) =>
          prev !== null ? (prev === POSTERS_DATA.length - 1 ? 0 : prev + 1) : null
        );
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePosterIndex]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (activePosterIndex !== null) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [activePosterIndex]);

  async function handleShare(poster: PosterItem) {
    const shareUrl = `${window.location.origin}/posters#poster-${poster.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `NoCapBLR Street Poster #${poster.id}: ${poster.headline}`,
          text: `${poster.headline} - Original NoCapBLR guerrilla campaign poster from Bengaluru streets.`,
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    await navigator.clipboard.writeText(shareUrl);
    setCopiedId(poster.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div>
      {/* ── Category Filters ── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-300 pb-6">
        <span className="mr-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
          Filter by topic:
        </span>
        {THEME_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setSelectedFilter(f.id)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
              selectedFilter === f.id
                ? "bg-zinc-950 text-white shadow-xs"
                : "border border-zinc-300 bg-white text-zinc-600 hover:border-zinc-400 hover:text-zinc-950"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Poster Grid ── */}
      <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {filteredPosters.map((poster) => {
          const globalIndex = POSTERS_DATA.findIndex((p) => p.id === poster.id);
          return (
            <article
              key={poster.id}
              id={`poster-${poster.id}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-zinc-400 hover:shadow-xl"
            >
              {/* Poster image container with standard 4:5 ratio */}
              <div
                onClick={() => setActivePosterIndex(globalIndex)}
                className="relative aspect-[4/5] w-full cursor-pointer overflow-hidden bg-zinc-900"
              >
                <Image
                  src={poster.src}
                  alt={`NoCapBLR Poster #${poster.id}: ${poster.headline}`}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/10" />

                {/* Hover overlay hint */}
                <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-zinc-950/85 px-3 py-1.5 text-[11px] font-bold text-white shadow-md backdrop-blur-sm opacity-90 transition-opacity group-hover:opacity-100">
                  <ZoomIn className="h-3.5 w-3.5" />
                  <span>View full</span>
                </div>

                <div className="absolute top-3 left-3 rounded-full bg-black/75 px-2.5 py-1 text-[10px] font-extrabold tracking-wider text-white backdrop-blur-xs">
                  POSTER #{poster.id}
                </div>
              </div>

              {/* Poster details & metadata */}
              <div className="flex flex-1 flex-col justify-between p-5">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-700">
                      {poster.themeLabel}
                    </span>
                    <span className="text-[10px] font-semibold text-zinc-400">
                      Bengaluru Launch
                    </span>
                  </div>

                  <h3 className="mt-2.5 text-base font-black leading-snug tracking-tight text-zinc-950 group-hover:text-red-700 transition-colors">
                    &ldquo;{poster.headline}&rdquo;
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-zinc-600 line-clamp-3">
                    {poster.description}
                  </p>
                </div>

                {/* Target locations & quick actions */}
                <div className="mt-4 pt-4 border-t border-zinc-100">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500">
                    <MapPin className="h-3 w-3 shrink-0 text-red-600" />
                    <span className="truncate">
                      {poster.targetLocations.join(" · ")}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActivePosterIndex(globalIndex)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-zinc-950 py-2 text-xs font-bold text-white hover:bg-zinc-800 transition-colors"
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                      Inspect poster
                    </button>
                    <a
                      href={poster.src}
                      download={`nocapblr-poster-${poster.id}.png`}
                      title="Download high-resolution poster"
                      className="grid h-8 w-8 place-items-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleShare(poster)}
                      title="Share link to poster"
                      className="grid h-8 w-8 place-items-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 transition-colors"
                    >
                      {copiedId === poster.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Share2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* ── Fullscreen Lightbox Modal ── */}
      {activePoster && activePosterIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in duration-200"
        >
          {/* Backdrop close click */}
          <div
            onClick={() => setActivePosterIndex(null)}
            className="absolute inset-0"
          />

          {/* Close button */}
          <button
            type="button"
            onClick={() => setActivePosterIndex(null)}
            className="absolute top-4 right-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            title="Close modal (Esc)"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Prev / Next controls */}
          <button
            type="button"
            onClick={() =>
              setActivePosterIndex((prev) =>
                prev !== null ? (prev === 0 ? POSTERS_DATA.length - 1 : prev - 1) : null
              )
            }
            className="hidden sm:grid absolute left-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/25 transition-colors"
            title="Previous poster (Arrow Left)"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <button
            type="button"
            onClick={() =>
              setActivePosterIndex((prev) =>
                prev !== null ? (prev === POSTERS_DATA.length - 1 ? 0 : prev + 1) : null
              )
            }
            className="hidden sm:grid absolute right-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/25 transition-colors"
            title="Next poster (Arrow Right)"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Modal content dialog card */}
          <div className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl lg:flex-row">
            {/* Poster image container */}
            <div className="relative flex min-h-[340px] items-center justify-center bg-black p-4 lg:min-h-[580px] lg:w-3/5">
              <div className="relative aspect-[4/5] h-full max-h-[560px] w-full max-w-[440px]">
                <Image
                  src={activePoster.src}
                  alt={`NoCapBLR Poster #${activePoster.id}: ${activePoster.headline}`}
                  fill
                  priority
                  className="object-contain"
                />
              </div>
            </div>

            {/* Sidebar info */}
            <div className="flex flex-1 flex-col justify-between p-6 sm:p-8 bg-[#FDFDFD] overflow-y-auto">
              <div>
                <div className="flex items-center justify-between gap-2 border-b border-zinc-200 pb-3">
                  <span className="rounded-full bg-zinc-950 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-white">
                    POSTER #{activePoster.id} of {POSTERS_DATA.length}
                  </span>
                  <span className="text-xs font-semibold text-zinc-500">
                    {activePoster.themeLabel}
                  </span>
                </div>

                <h2 className="mt-4 text-2xl font-black leading-tight tracking-tight text-zinc-950 sm:text-3xl">
                  {activePoster.headline}
                </h2>

                <p className="mt-2 text-xs font-bold uppercase tracking-wider text-red-700">
                  {activePoster.tagline}
                </p>

                <div className="mt-5 space-y-3 text-sm leading-6 text-zinc-600">
                  <p>{activePoster.description}</p>
                </div>

                <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-950">
                    <MapPin className="h-3.5 w-3.5 text-red-600" />
                    <span>Targeted Street Locations</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {activePoster.targetLocations.map((loc) => (
                      <span
                        key={loc}
                        className="rounded-md bg-white border border-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700"
                      >
                        {loc}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/50 p-3.5 text-xs text-amber-900 leading-5">
                  <span className="font-bold flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                    Street Campaign Origin
                  </span>
                  Pasted across Bengaluru leading up to the October 25, 2026 launch.
                  Scanning the QR code on the poster immediately opened NoCapBLR for
                  candid, anonymous place reviews.
                </div>
              </div>

              {/* Bottom action buttons */}
              <div className="mt-6 pt-4 border-t border-zinc-200 flex flex-wrap items-center gap-3">
                <a
                  href={activePoster.src}
                  download={`nocapblr-poster-${activePoster.id}.png`}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 py-2.5 text-xs font-bold text-white hover:bg-zinc-800 transition-colors shadow-xs"
                >
                  <Download className="h-4 w-4" />
                  Download Poster
                </a>
                <button
                  type="button"
                  onClick={() => handleShare(activePoster)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-xs font-bold text-zinc-800 hover:bg-zinc-50 hover:border-zinc-400 transition-colors"
                >
                  {copiedId === activePoster.id ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="h-4 w-4" />
                      <span>Share</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

