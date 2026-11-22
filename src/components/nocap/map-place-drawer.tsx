"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X, ExternalLink, Loader2 } from "lucide-react";
import { PlacePageView } from "@/components/nocap/place-page-view";
import type { UnifiedPlace } from "@/lib/nocap/place-lookup";
import type { NocapPersonNote, NocapReview } from "@/lib/nocap/community";
import type { NocapPlace } from "@/lib/nocap/places";

type DrawerData = {
  place: UnifiedPlace;
  reviews: NocapReview[];
  personNotes: NocapPersonNote[];
  nearbyPlaces: NocapPlace[];
};

type Props = {
  /** The slug/id to load. When null, drawer is hidden. */
  slug: string | null;
  onClose: () => void;
};

export function MapPlaceDrawer({ slug, onClose }: Props) {
  const router = useRouter();
  const [data, setData] = useState<DrawerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch place data whenever slug changes
  useEffect(() => {
    if (!slug) {
      setData(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/nocap/place-view?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.error) throw new Error(json.error);
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || "Could not load place.");
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [slug]);

  // Escape key closes
  useEffect(() => {
    if (!slug) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [slug, onClose]);

  if (!slug) return null;

  return (
    <>
      {/* Backdrop — non-blocking so the map and its suggestion dots remain fully interactive */}
      <div
        className="hidden lg:block pointer-events-none absolute inset-0 z-[190] bg-black/5"
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Place details"
        className={[
          // Mobile: full screen bottom sheet
          "absolute inset-0 z-[210] bg-[#F6F5F2] overflow-y-auto",
          // Desktop: right 50% panel
          "lg:inset-auto lg:right-0 lg:top-0 lg:bottom-0 lg:w-1/2 lg:border-l lg:border-zinc-200 lg:shadow-2xl",
          // Smooth slide-in
          "transition-transform duration-300",
        ].join(" ")}
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex items-center justify-between bg-[#F6F5F2]/95 backdrop-blur-sm border-b border-zinc-200 px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
            <span className="text-sm font-black text-zinc-950 truncate">
              {loading ? "Loading…" : (data?.place.name ?? slug)}
            </span>
          </div>

          {data && (
            <a
              href={`/places/${data.place.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.preventDefault();
                onClose();
                router.push(`/places/${data.place.slug}`);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-100 transition-colors shrink-0"
              title="Open full page"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Full Page</span>
            </a>
          )}
        </div>

        {/* Body */}
        {loading && (
          <div className="flex items-center justify-center gap-3 py-24 text-sm text-zinc-400 font-medium">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading place…
          </div>
        )}

        {error && !loading && (
          <div className="p-8 text-center">
            <p className="text-sm font-bold text-red-600 mb-3">{error}</p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100 transition-colors"
            >
              Close
            </button>
          </div>
        )}

        {!loading && !error && data && (
          <PlacePageView
            place={data.place}
            initialReviews={data.reviews}
            initialPersonNotes={data.personNotes}
            nearbyPlaces={data.nearbyPlaces}
            isDrawerMode
          />
        )}
      </div>
    </>
  );
}
