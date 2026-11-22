"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, ExternalLink } from "lucide-react";
import { PlacePageView } from "@/components/nocap/place-page-view";
import type { UnifiedPlace } from "@/lib/nocap/place-lookup";
import type { NocapPersonNote, NocapReview } from "@/lib/nocap/community";
import type { NocapPlace } from "@/lib/nocap/places";

type Props = {
  place: UnifiedPlace;
  initialReviews: NocapReview[];
  initialPersonNotes: NocapPersonNote[];
  nearbyPlaces: NocapPlace[];
  categoryInfo?: { name: string; tag: string; description: string };
};

export function PlaceDrawer({
  place,
  initialReviews,
  initialPersonNotes,
  nearbyPlaces,
  categoryInfo,
}: Props) {
  const router = useRouter();
  const drawerRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  // Close on Escape key
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [handleClose]);

  // Prevent body scroll when drawer is open (desktop only)
  useEffect(() => {
    const prev = document.body.style.overflow;
    // Only lock body scroll on desktop; on mobile let drawer scroll independently
    if (window.innerWidth >= 1024) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <>
      {/* Backdrop — only visible on desktop, clicking it closes the drawer */}
      <div
        className="fixed inset-0 z-40 hidden lg:block bg-black/20 backdrop-blur-[1px]"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${place.name} — Place Details`}
        className={[
          // Mobile: full screen bottom sheet
          "fixed inset-0 z-50 bg-[#F6F5F2] overflow-y-auto",
          // Desktop: right 50% panel
          "lg:inset-auto lg:right-0 lg:top-0 lg:bottom-0 lg:w-1/2 lg:shadow-2xl lg:border-l lg:border-zinc-200",
          // Animation
          "animate-in slide-in-from-right-full lg:slide-in-from-right duration-300",
        ].join(" ")}
      >
        {/* Sticky drawer header */}
        <div className="sticky top-0 z-10 flex items-center justify-between bg-[#F6F5F2]/95 backdrop-blur-sm px-4 py-3 border-b border-zinc-200 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={handleClose}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 transition-colors"
              aria-label="Close panel"
            >
              <X className="h-4 w-4" />
            </button>
            <span className="text-sm font-black text-zinc-950 truncate">{place.name}</span>
          </div>
          <a
            href={`/places/${place.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-100 transition-colors shrink-0"
            title="Open full place page (SEO-friendly)"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Full Page</span>
          </a>
        </div>

        {/* Place content — rendered inside drawer */}
        <PlacePageView
          place={place}
          initialReviews={initialReviews}
          initialPersonNotes={initialPersonNotes}
          nearbyPlaces={nearbyPlaces}
          categoryInfo={categoryInfo}
          isDrawerMode
        />
      </div>
    </>
  );
}
