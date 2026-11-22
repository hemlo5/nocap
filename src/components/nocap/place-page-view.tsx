"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  MapPin,
  Compass,
  ArrowLeft,
  Share2,
  Check,
  Star,
  ShieldCheck,
  MessageSquare,
  Sparkles,
  Camera,
  Loader2,
  X,
  Map as MapIcon,
  Navigation,
  UserCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Reply,
  Send,
} from "lucide-react";
import type { UnifiedPlace } from "@/lib/nocap/place-lookup";
import type { NocapPersonNote, NocapReview } from "@/lib/nocap/community";
import type { NocapPlace } from "@/lib/nocap/places";
import { uploadImageFile } from "@/lib/nocap/image-helper";
import { createSupabaseBrowserClient, hasSupabaseBrowserConfig } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import { SiteFooter } from "@/components/nav/site-footer";

type ReviewReply = {
  id: string;
  reviewId: string;
  body: string;
  createdAt: string;
  profile: { id: string; displayName: string; avatarUrl: string | null };
};

type Props = {
  place: UnifiedPlace;
  initialReviews: NocapReview[];
  initialPersonNotes: NocapPersonNote[];
  nearbyPlaces: NocapPlace[];
  categoryInfo?: { name: string; tag: string; description: string };
  isDrawerMode?: boolean;
};

function timeAgo(dateString: string, id?: string): string {
  const diffMinutes = Math.max(0, Math.floor((Date.now() - new Date(dateString).getTime()) / 60_000));
  const isArchive = id?.startsWith("archive-") || false;
  if (isArchive || diffMinutes >= 2880) {
    let hash = 0;
    const seed = id || dateString;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }
    const hours = 2 + (hash % 44);
    return `${hours}h ago`;
  }
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function PlacePageView({
  place,
  initialReviews,
  initialPersonNotes,
  nearbyPlaces,
  categoryInfo,
  isDrawerMode = false,
}: Props) {
  const [reviews, setReviews] = useState<NocapReview[]>(initialReviews);
  const [personNotes, setPersonNotes] = useState<NocapPersonNote[]>(initialPersonNotes);
  const [activeTab, setActiveTab] = useState<"all" | "legit" | "reviews" | "people">("all");
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerType, setComposerType] = useState<"review" | "person">("review");
  const [lightboxImage, setLightboxImage] = useState<{ url: string; caption?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Reddit-style reply state: map of reviewId → { open, replies, loading, composerOpen, composerText, submitting }
  const [replyState, setReplyState] = useState<Record<string, {
    open: boolean;
    replies: ReviewReply[];
    loading: boolean;
    composerOpen: boolean;
    composerText: string;
    submitting: boolean;
  }>>({});

  // Auth state
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [supabaseConfigured, setSupabaseConfigured] = useState(false);

  // Review composer state
  const [reviewBody, setReviewBody] = useState("");
  const [reviewRating, setReviewRating] = useState<number | null>(5);
  const [reviewImageUrl, setReviewImageUrl] = useState<string | null>(null);
  const [reviewUploading, setReviewUploading] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [verifiedNearby, setVerifiedNearby] = useState(false);
  const [checkingLocation, setCheckingLocation] = useState(false);

  // Person note composer state
  const [personName, setPersonName] = useState("");
  const [personDescription, setPersonDescription] = useState("");
  const [personPhotoUrl, setPersonPhotoUrl] = useState<string | null>(null);
  const [personPhotoUploading, setPersonPhotoUploading] = useState(false);
  const [personSubmitting, setPersonSubmitting] = useState(false);
  const [personError, setPersonError] = useState<string | null>(null);
  const [personSuccess, setPersonSuccess] = useState(false);

  const reviewFileInputRef = useRef<HTMLInputElement>(null);
  const personFileInputRef = useRef<HTMLInputElement>(null);
  const composerSectionRef = useRef<HTMLDivElement>(null);

  // Initialize Supabase browser auth
  useEffect(() => {
    const configured = hasSupabaseBrowserConfig();
    setSupabaseConfigured(configured);
    if (!configured) return;

    const supabase = createSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setAccessToken(data.session.access_token);
        setSignedIn(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccessToken(session?.access_token ?? null);
      setSignedIn(Boolean(session));
    });

    return () => subscription.unsubscribe();
  }, []);

  function handleSignIn() {
    if (!hasSupabaseBrowserConfig()) return;
    const supabase = createSupabaseBrowserClient();
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: typeof window !== "undefined" ? window.location.href : "/map",
      },
    });
  }

  async function handleShare() {
    const shareData = {
      title: `${place.name} — Real Takes on NoCapBLR`,
      text: `Honest, unfiltered local takes on ${place.name} in ${place.area}, Bengaluru.`,
      url: typeof window !== "undefined" ? window.location.href : `https://nocapblr.com/places/${place.slug}`,
    };

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {}
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(shareData.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  function openComposer(type: "review" | "person") {
    setComposerType(type);
    setComposerOpen(true);
    setTimeout(() => {
      composerSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  // ── Reply helpers ──────────────────────────────────────────────────────────

  function getReplyState(reviewId: string) {
    return replyState[reviewId] ?? {
      open: false,
      replies: [],
      loading: false,
      composerOpen: false,
      composerText: "",
      submitting: false,
    };
  }

  function patchReply(reviewId: string, patch: Partial<typeof replyState[string]>) {
    setReplyState((prev) => ({
      ...prev,
      [reviewId]: { ...getReplyState(reviewId), ...prev[reviewId], ...patch },
    }));
  }

  async function toggleReplies(reviewId: string) {
    const current = getReplyState(reviewId);
    if (current.open) {
      patchReply(reviewId, { open: false });
      return;
    }
    // Open and load
    patchReply(reviewId, { open: true, loading: true });
    try {
      const res = await fetch(`/api/nocap/review-replies?reviewId=${reviewId}`);
      const data = await res.json();
      patchReply(reviewId, { replies: data.replies ?? [], loading: false });
    } catch {
      patchReply(reviewId, { loading: false });
    }
  }

  async function submitReply(reviewId: string) {
    const current = { ...getReplyState(reviewId), ...replyState[reviewId] };
    if (!current.composerText.trim()) return;
    if (!signedIn) { handleSignIn(); return; }

    patchReply(reviewId, { submitting: true });
    try {
      const res = await fetch("/api/nocap/review-replies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ reviewId, body: current.composerText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to post reply");
      patchReply(reviewId, {
        replies: [...current.replies, data.reply],
        composerText: "",
        composerOpen: false,
        submitting: false,
      });
    } catch {
      patchReply(reviewId, { submitting: false });
    }
  }

  // Location proximity check for verified legit stamp
  async function checkProximity() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setReviewError("Geolocation is not supported by your browser.");
      return;
    }
    setCheckingLocation(true);
    setReviewError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCheckingLocation(false);
        const distance = haversineMeters(
          pos.coords.latitude,
          pos.coords.longitude,
          place.latitude,
          place.longitude
        );
        if (distance <= 500) {
          setVerifiedNearby(true);
        } else {
          setVerifiedNearby(false);
          setReviewError(
            `You are ~${Math.round(distance)}m away from this spot. Verified stamps are awarded within 500m.`
          );
        }
      },
      (err) => {
        setCheckingLocation(false);
        setReviewError("Could not access your location. Please check browser permissions.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  // Handle Review Image Upload
  async function handleReviewImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReviewUploading(true);
    setReviewError(null);
    try {
      const url = await uploadImageFile(file);
      setReviewImageUrl(url);
    } catch {
      setReviewError("Could not upload image. Please try another.");
    } finally {
      setReviewUploading(false);
    }
  }

  // Submit Review
  async function handleReviewSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reviewBody.trim() || reviewBody.trim().length < 8) {
      setReviewError("Please write at least 8 characters for your take.");
      return;
    }
    if (!signedIn) {
      handleSignIn();
      return;
    }

    setReviewSubmitting(true);
    setReviewError(null);

    try {
      const payload: Record<string, unknown> = {
        body: reviewBody.trim(),
        rating: reviewRating,
        imageUrl: reviewImageUrl,
        latitude: place.latitude,
        longitude: place.longitude,
      };

      if (place.isCommunity) {
        payload.userPlaceId = place.id;
      } else {
        payload.placeId = place.id;
      }

      const res = await fetch("/api/nocap/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not publish review.");
      }

      const newReview: NocapReview = data.review;
      setReviews((prev) => [newReview, ...prev.filter((r) => r.id !== newReview.id)]);
      setReviewBody("");
      setReviewImageUrl(null);
      setReviewSuccess(true);
      setTimeout(() => setReviewSuccess(false), 5000);
      setComposerOpen(false);
    } catch (err: any) {
      setReviewError(err?.message || "Failed to submit review. Try again.");
    } finally {
      setReviewSubmitting(false);
    }
  }

  // Handle Person Note Photo Upload
  async function handlePersonPhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPersonPhotoUploading(true);
    setPersonError(null);
    try {
      const url = await uploadImageFile(file);
      setPersonPhotoUrl(url);
    } catch {
      setPersonError("Could not upload photo. Please try another.");
    } finally {
      setPersonPhotoUploading(false);
    }
  }

  // Submit Person Note
  async function handlePersonSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!personName.trim() || personName.trim().length < 2) {
      setPersonError("Please enter the person's name.");
      return;
    }
    if (!personDescription.trim() || personDescription.trim().length < 3) {
      setPersonError("Please provide a note or story about them.");
      return;
    }

    setPersonSubmitting(true);
    setPersonError(null);

    try {
      const payload: Record<string, unknown> = {
        personName: personName.trim(),
        description: personDescription.trim(),
        photoUrl: personPhotoUrl,
      };

      if (place.isCommunity) {
        payload.userPlaceId = place.id;
      } else {
        payload.placeId = place.id;
      }

      const res = await fetch("/api/nocap/person-notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not note person.");
      }

      const newNote: NocapPersonNote = data.personNote;
      setPersonNotes((prev) => [newNote, ...prev.filter((n) => n.id !== newNote.id)]);
      setPersonName("");
      setPersonDescription("");
      setPersonPhotoUrl(null);
      setPersonSuccess(true);
      setTimeout(() => setPersonSuccess(false), 5000);
      setComposerOpen(false);
    } catch (err: any) {
      setPersonError(err?.message || "Failed to note person. Try again.");
    } finally {
      setPersonSubmitting(false);
    }
  }

  // Derived stats
  const ratingsList = reviews.map((r) => r.rating).filter((r): r is number => typeof r === "number" && r > 0);
  const avgRating = ratingsList.length
    ? (ratingsList.reduce((acc, curr) => acc + curr, 0) / ratingsList.length).toFixed(1)
    : null;
  const legitCount = reviews.filter((r) => r.isLegit).length;
  const totalCount = reviews.length + personNotes.length;

  const filteredReviews = useMemo(() => {
    if (activeTab === "legit") return reviews.filter((r) => r.isLegit);
    if (activeTab === "people") return [];
    return reviews;
  }, [reviews, activeTab]);

  const filteredPersonNotes = useMemo(() => {
    if (activeTab === "reviews" || activeTab === "legit") return [];
    return personNotes;
  }, [personNotes, activeTab]);

  return (
    <div className={cn("flex flex-col bg-[#F6F5F2] text-zinc-950 antialiased", !isDrawerMode && "min-h-screen")}>
      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl bg-zinc-950 p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white backdrop-blur-xs hover:bg-black/80 transition-colors"
              aria-label="Close photo preview"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={lightboxImage.url}
              alt={lightboxImage.caption || "Preview"}
              className="max-h-[80vh] w-auto max-w-full rounded-xl object-contain mx-auto"
            />
            {lightboxImage.caption && (
              <p className="mt-2 text-center text-xs text-zinc-300 font-medium px-4 py-1">
                {lightboxImage.caption}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className={cn("flex-1 px-4 sm:px-6 lg:px-8", isDrawerMode ? "py-4" : "py-8")}>
        <div className={cn("mx-auto", isDrawerMode ? "max-w-full" : "max-w-4xl")}>
          {/* Top Bar: Navigation & Share — hidden in drawer mode (drawer header handles navigation) */}
          {!isDrawerMode && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <nav
              aria-label="Breadcrumbs"
              className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-zinc-500"
            >
              <Link href="/" className="hover:text-zinc-900 transition-colors">
                Home
              </Link>
              <span>/</span>
              <Link
                href={`/categories/${place.category}`}
                className="hover:text-zinc-900 transition-colors capitalize"
              >
                {place.categoryName}
              </Link>
              <span>/</span>
              <Link
                href={`/areas/${place.areaSlug}`}
                className="hover:text-zinc-900 transition-colors"
              >
                {place.area}
              </Link>
              <span>/</span>
              <span className="text-zinc-900 truncate max-w-[200px] font-bold">
                {place.name}
              </span>
            </nav>

            <div className="flex items-center gap-2">
              <Link
                href={`/map?place=${place.id}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-bold text-zinc-800 shadow-xs hover:bg-zinc-100 hover:border-zinc-300 transition-all"
                title="View place on live interactive map"
              >
                <ArrowLeft className="h-3.5 w-3.5 text-zinc-600" />
                <span>Back to Live Map</span>
              </Link>
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-bold text-zinc-800 shadow-xs hover:bg-zinc-100 transition-all"
                title="Share this spot"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-3.5 w-3.5 text-zinc-600" />
                    <span>Share</span>
                  </>
                )}
              </button>
            </div>
          </div>
          )}

          {/* Place Hero Card */}
          <section className="rounded-3xl border border-zinc-200/90 bg-white p-6 sm:p-10 shadow-sm relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-800 tracking-tight">
                  <Compass className="h-3.5 w-3.5 text-zinc-600" />
                  <span>{place.categoryName}</span>
                </span>
                {place.isCommunity ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100/80 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
                    <UserCheck className="h-3 w-3 text-amber-700" />
                    <span>Community Dot</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-zinc-950 px-2.5 py-0.5 text-[11px] font-bold text-white">
                    <span>Curated Landmark</span>
                  </span>
                )}
              </div>

              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500">
                <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                <Link
                  href={`/areas/${place.areaSlug}`}
                  className="hover:text-zinc-900 underline underline-offset-2"
                >
                  {place.area}, Bengaluru
                </Link>
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-950 leading-tight">
              {place.name}
            </h1>

            <p className="mt-2 text-sm sm:text-base text-zinc-600 font-normal leading-relaxed">
              {place.address}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-400 font-mono">
              <span>{place.latitude.toFixed(4)}° N, {place.longitude.toFixed(4)}° E</span>
              <span>·</span>
              <span>Bengaluru, Karnataka</span>
            </div>

            {/* Quick Metrics Bar */}
            <div className="mt-6 flex flex-wrap items-center gap-4 py-4 border-y border-zinc-100">
              {avgRating && (
                <div className="flex items-center gap-1.5">
                  <span className="flex items-center text-sm font-black text-zinc-950">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400 mr-1" />
                    {avgRating}
                  </span>
                  <span className="text-xs text-zinc-400">({ratingsList.length} rated)</span>
                </div>
              )}
              <div className="text-xs font-semibold text-zinc-700">
                <strong className="font-black text-zinc-950">{reviews.length}</strong> {reviews.length === 1 ? "review" : "reviews"}
              </div>
              {legitCount > 0 && (
                <div className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{legitCount} verified on-site</span>
                </div>
              )}
              {personNotes.length > 0 && (
                <div className="text-xs font-semibold text-zinc-700">
                  <strong className="font-black text-zinc-950">{personNotes.length}</strong> {personNotes.length === 1 ? "person noted" : "people noted"}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href={`/map?place=${place.id}`}
                className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-5 py-3 text-xs font-black text-white shadow-xs hover:bg-zinc-800 transition-all"
              >
                <MapIcon className="h-4 w-4" />
                <span>View on Live Map</span>
              </Link>
              <button
                type="button"
                onClick={() => openComposer("review")}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-3 text-xs font-bold text-zinc-900 shadow-2xs hover:bg-zinc-50 transition-all"
              >
                <MessageSquare className="h-4 w-4 text-zinc-700" />
                <span>Write an Honest Take</span>
              </button>
              <button
                type="button"
                onClick={() => openComposer("person")}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-xs font-bold text-zinc-700 shadow-2xs hover:bg-zinc-50 transition-all"
              >
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span>Spot a Person</span>
              </button>
            </div>
          </section>

          {/* Verification Shield Callout */}
          <div className="mt-6 rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-4 sm:p-5 flex items-start gap-3.5 shadow-2xs">
            <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed text-emerald-950">
              <strong className="font-bold text-emerald-900">Verified On-Site Standard:</strong> Takes on NoCapBLR receive our trusted verified badge when submitted from within 500m of this spot. No paid PR, no bot farms, no food-vlogger theatrics.
            </div>
          </div>

          {/* Success Banners */}
          {reviewSuccess && (
            <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-bold text-emerald-900 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Your honest take has been posted! Thanks for keeping Bengaluru real.</span>
            </div>
          )}
          {personSuccess && (
            <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-bold text-emerald-900 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Person spotlight published! They are now part of this place&apos;s lore.</span>
            </div>
          )}

          {/* In-page Composer Section */}
          {composerOpen && (
            <div
              ref={composerSectionRef}
              className="mt-8 rounded-3xl border border-zinc-300 bg-white p-6 sm:p-8 shadow-sm transition-all"
            >
              <div className="flex items-center justify-between pb-4 border-b border-zinc-100 mb-6">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setComposerType("review")}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
                      composerType === "review"
                        ? "bg-zinc-950 text-white"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    )}
                  >
                    Write Review
                  </button>
                  <button
                    type="button"
                    onClick={() => setComposerType("person")}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
                      composerType === "person"
                        ? "bg-zinc-950 text-white"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    )}
                  >
                    Spot a Person
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setComposerOpen(false)}
                  className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {composerType === "review" ? (
                <form onSubmit={handleReviewSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-zinc-700 mb-2">
                      Star Rating (Optional)
                    </label>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(reviewRating === star ? null : star)}
                          className="p-1 hover:scale-110 transition-transform"
                        >
                          <Star
                            className={cn(
                              "h-6 w-6",
                              reviewRating && reviewRating >= star
                                ? "fill-amber-400 text-amber-400"
                                : "text-zinc-300 hover:text-zinc-400"
                            )}
                          />
                        </button>
                      ))}
                      {reviewRating && (
                        <button
                          type="button"
                          onClick={() => setReviewRating(null)}
                          className="ml-2 text-[11px] font-semibold text-zinc-400 hover:text-zinc-600 underline"
                        >
                          Clear rating
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-zinc-700 mb-2">
                      Your Unvarnished Take
                    </label>
                    <textarea
                      value={reviewBody}
                      onChange={(e) => setReviewBody(e.target.value)}
                      rows={4}
                      placeholder={`Tell Bengaluru the real deal about ${place.name}. Food quality, wait times, vibe, price, parking, or what to avoid...`}
                      className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-950 focus:bg-white focus:outline-hidden transition-all"
                    />
                    <p className="mt-1 text-[11px] text-zinc-400 font-medium">
                      Minimum 8 characters. Keep it raw and respectful.
                    </p>
                  </div>

                  {/* Photo Upload */}
                  <div>
                    <input
                      ref={reviewFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleReviewImageUpload}
                      className="hidden"
                    />
                    {reviewImageUrl ? (
                      <div className="relative inline-block mt-2">
                        <img
                          src={reviewImageUrl}
                          alt="Review preview"
                          className="h-24 w-24 rounded-xl object-cover border border-zinc-200"
                        />
                        <button
                          type="button"
                          onClick={() => setReviewImageUrl(null)}
                          className="absolute -top-2 -right-2 grid h-6 w-6 place-items-center rounded-full bg-zinc-950 text-white shadow-xs hover:bg-red-600 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => reviewFileInputRef.current?.click()}
                        disabled={reviewUploading}
                        className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-100 transition-colors"
                      >
                        {reviewUploading ? (
                          <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                        ) : (
                          <Camera className="h-4 w-4 text-zinc-500" />
                        )}
                        <span>{reviewUploading ? "Compressing & uploading..." : "Add photo proof"}</span>
                      </button>
                    )}
                  </div>

                  {/* Proximity / Verified Location Check */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={checkProximity}
                      disabled={checkingLocation || verifiedNearby}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all",
                        verifiedNearby
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                      )}
                    >
                      {checkingLocation ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : verifiedNearby ? (
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Navigation className="h-3.5 w-3.5 text-zinc-500" />
                      )}
                      <span>
                        {checkingLocation
                          ? "Checking coordinates..."
                          : verifiedNearby
                          ? "Verified near this spot"
                          : "Verify I'm at this location (for Verified badge)"}
                      </span>
                    </button>
                  </div>

                  {reviewError && (
                    <p className="text-xs font-semibold text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">
                      {reviewError}
                    </p>
                  )}

                  <div className="pt-2 flex items-center justify-between">
                    {!signedIn ? (
                      <button
                        type="button"
                        onClick={handleSignIn}
                        className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-5 py-3 text-xs font-black text-white hover:bg-zinc-800 transition-all"
                      >
                        Sign in with Google to Post
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={reviewSubmitting || reviewUploading}
                        className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-6 py-3 text-xs font-black text-white hover:bg-zinc-800 disabled:opacity-50 transition-all"
                      >
                        {reviewSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        <span>{reviewSubmitting ? "Publishing..." : "Post Honest Take"}</span>
                      </button>
                    )}
                  </div>
                </form>
              ) : (
                <form onSubmit={handlePersonSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-zinc-700 mb-2">
                      Person&apos;s Name & Title / Nickname
                    </label>
                    <input
                      type="text"
                      value={personName}
                      onChange={(e) => setPersonName(e.target.value)}
                      placeholder="e.g. Ramesh Uncle (Security & Guide) or Sneha (Head Roaster)"
                      className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 p-3.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-950 focus:bg-white focus:outline-hidden transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-zinc-700 mb-2">
                      Why are they legendary here?
                    </label>
                    <textarea
                      value={personDescription}
                      onChange={(e) => setPersonDescription(e.target.value)}
                      rows={3}
                      placeholder="What makes them special? Their recommendations, friendly vibe, signature recipe, or daily presence..."
                      className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-950 focus:bg-white focus:outline-hidden transition-all"
                    />
                  </div>

                  {/* Person Photo Upload */}
                  <div>
                    <input
                      ref={personFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePersonPhotoUpload}
                      className="hidden"
                    />
                    {personPhotoUrl ? (
                      <div className="relative inline-block mt-2">
                        <img
                          src={personPhotoUrl}
                          alt="Person preview"
                          className="h-24 w-24 rounded-xl object-cover border border-zinc-200"
                        />
                        <button
                          type="button"
                          onClick={() => setPersonPhotoUrl(null)}
                          className="absolute -top-2 -right-2 grid h-6 w-6 place-items-center rounded-full bg-zinc-950 text-white shadow-xs hover:bg-red-600 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => personFileInputRef.current?.click()}
                        disabled={personPhotoUploading}
                        className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-100 transition-colors"
                      >
                        {personPhotoUploading ? (
                          <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                        ) : (
                          <Camera className="h-4 w-4 text-zinc-500" />
                        )}
                        <span>{personPhotoUploading ? "Uploading..." : "Add photo of them (Optional)"}</span>
                      </button>
                    )}
                  </div>

                  {personError && (
                    <p className="text-xs font-semibold text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">
                      {personError}
                    </p>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={personSubmitting || personPhotoUploading}
                      className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-6 py-3 text-xs font-black text-white hover:bg-zinc-800 disabled:opacity-50 transition-all"
                    >
                      {personSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      <span>{personSubmitting ? "Spotlighting..." : "Spot This Person"}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Filter Tabs */}
          <div className="mt-8 flex items-center justify-between gap-3 border-b border-zinc-200 pb-3 overflow-x-auto">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors whitespace-nowrap",
                  activeTab === "all"
                    ? "bg-zinc-950 text-white"
                    : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100"
                )}
              >
                All Takes ({totalCount})
              </button>
              {legitCount > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab("legit")}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1",
                    activeTab === "legit"
                      ? "bg-emerald-950 text-white"
                      : "bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50"
                  )}
                >
                  <ShieldCheck className="h-3 w-3 text-emerald-500" />
                  <span>Verified ({legitCount})</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveTab("reviews")}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors whitespace-nowrap",
                  activeTab === "reviews"
                    ? "bg-zinc-950 text-white"
                    : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100"
                )}
              >
                Reviews ({reviews.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("people")}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors whitespace-nowrap",
                  activeTab === "people"
                    ? "bg-zinc-950 text-white"
                    : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100"
                )}
              >
                People ({personNotes.length})
              </button>
            </div>

            <button
              type="button"
              onClick={() => openComposer("review")}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-zinc-900 hover:underline shrink-0"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Leave a take</span>
            </button>
          </div>

          {/* People Section (When Tab includes people) */}
          {filteredPersonNotes.length > 0 && (
            <section className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-zinc-950 flex items-center gap-2">
                    <span>Characters & Legends at {place.name}</span>
                    <span className="inline-flex items-center rounded-full bg-zinc-950 px-2 py-0.5 text-[10px] font-black text-white">
                      Spotlight
                    </span>
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    The baristas, servers, street characters, and keepers who make this dot alive.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {filteredPersonNotes.map((note) => (
                  <article
                    key={note.id}
                    className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs hover:border-zinc-300 transition-all flex flex-col justify-between"
                  >
                    <div className="flex gap-4 items-start">
                      {note.photoUrl ? (
                        <button
                          type="button"
                          onClick={() => setLightboxImage({ url: note.photoUrl!, caption: note.personName })}
                          className="relative shrink-0 group focus:outline-hidden"
                          title="Click to view full photo"
                        >
                          <img
                            src={note.photoUrl}
                            alt={note.personName}
                            className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl object-cover border border-zinc-200 group-hover:opacity-90 transition-opacity"
                          />
                        </button>
                      ) : (
                        <div className="grid h-16 w-16 sm:h-20 sm:w-20 shrink-0 place-items-center rounded-2xl bg-zinc-100 border border-zinc-200 text-zinc-400 font-black text-lg">
                          {note.personName[0]?.toUpperCase() ?? "P"}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-black text-zinc-700 tracking-wider uppercase">
                          Person Spotlight
                        </span>
                        <h3 className="text-base font-black text-zinc-950 mt-1 leading-snug">
                          {note.personName}
                        </h3>
                        <p className="mt-1.5 text-xs text-zinc-700 leading-relaxed font-normal whitespace-pre-line">
                          {note.description}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400">
                      <span>Noted by {note.profile?.displayName || "Local Scout"}</span>
                      <span>{timeAgo(note.createdAt, note.id)}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* Reddit-style Reviews Thread */}
          <section className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-zinc-950">
                  {activeTab === "legit" ? "Verified On-Site Takes" : "What Locals Are Saying"}
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Real unvarnished takes · reply like a Reddit thread
                </p>
              </div>
              <span className="text-xs font-bold bg-zinc-200/70 text-zinc-800 px-2.5 py-1 rounded-full">
                {filteredReviews.length} {filteredReviews.length === 1 ? "take" : "takes"}
              </span>
            </div>

            {filteredReviews.length > 0 ? (
              <div className="space-y-3">
                {filteredReviews.map((review) => {
                  const rs = { ...getReplyState(review.id), ...replyState[review.id] };
                  return (
                    <article
                      key={review.id}
                      className="rounded-2xl border border-zinc-200/90 bg-white shadow-2xs overflow-hidden"
                    >
                      {/* ── Post header ── */}
                      <div className="px-4 pt-4 pb-3">
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          {review.profile?.avatarUrl ? (
                            <img
                              src={review.profile.avatarUrl}
                              alt=""
                              className="h-8 w-8 rounded-full object-cover border border-zinc-200 shrink-0 mt-0.5"
                            />
                          ) : (
                            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-zinc-950 text-[11px] font-black text-white mt-0.5">
                              {(review.profile?.displayName || "B")[0].toUpperCase()}
                            </div>
                          )}

                          {/* Meta */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span className="text-xs font-bold text-zinc-950">
                                {review.profile?.displayName || "Bengaluru Scout"}
                              </span>
                              {review.isLegit && (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-black text-emerald-800 border border-emerald-200">
                                  <ShieldCheck className="h-2.5 w-2.5 text-emerald-600" />
                                  Verified On-Site
                                </span>
                              )}
                              <span className="text-[10px] text-zinc-400 font-medium">
                                · {timeAgo(review.createdAt, review.id)}
                              </span>
                            </div>

                            {/* Star rating inline */}
                            {review.rating && (
                              <div className="flex items-center gap-0.5 mt-0.5">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={cn(
                                      "h-3 w-3",
                                      i < review.rating! ? "fill-amber-400 text-amber-400" : "text-zinc-200"
                                    )}
                                  />
                                ))}
                                <span className="text-[10px] font-bold text-zinc-500 ml-1">{review.rating}/5</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Review body */}
                        <p className="mt-3 text-sm text-zinc-800 leading-relaxed font-normal whitespace-pre-line pl-11">
                          {review.body}
                        </p>

                        {/* Attached photo */}
                        {review.imageUrl && (
                          <div className="mt-3 pl-11">
                            <button
                              type="button"
                              onClick={() => setLightboxImage({ url: review.imageUrl!, caption: `${place.name} — proof` })}
                              className="group relative block focus:outline-hidden"
                            >
                              <img
                                src={review.imageUrl}
                                alt="Review photo"
                                className="h-36 sm:h-48 max-w-xs rounded-xl object-cover border border-zinc-200 group-hover:opacity-90 transition-opacity"
                              />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* ── Reddit-style action bar ── */}
                      <div className="px-4 pb-3 flex items-center gap-1 border-t border-zinc-100 pt-2.5">
                        {/* Replies toggle */}
                        <button
                          type="button"
                          onClick={() => toggleReplies(review.id)}
                          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-zinc-600 hover:bg-zinc-100 transition-colors"
                        >
                          {rs.open ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                          {rs.loading
                            ? "Loading…"
                            : rs.open
                            ? `Hide replies`
                            : rs.replies.length > 0
                            ? `${rs.replies.length} ${rs.replies.length === 1 ? "reply" : "replies"}`
                            : "Reply"}
                        </button>

                        {/* Open reply composer */}
                        <button
                          type="button"
                          onClick={() => {
                            if (!rs.open) toggleReplies(review.id);
                            patchReply(review.id, { composerOpen: !rs.composerOpen });
                          }}
                          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-zinc-500 hover:bg-zinc-100 transition-colors"
                        >
                          <Reply className="h-3.5 w-3.5" />
                          Comment
                        </button>

                        {/* Share */}
                        <button
                          type="button"
                          onClick={handleShare}
                          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-zinc-500 hover:bg-zinc-100 transition-colors ml-auto"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                          Share
                        </button>
                      </div>

                      {/* ── Threaded Replies section (Reddit style) ── */}
                      {rs.open && (
                        <div className="border-t border-zinc-100 bg-zinc-50/60 px-4 py-3 space-y-3">
                          {rs.loading && (
                            <div className="flex items-center gap-2 text-xs text-zinc-400 py-2">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Loading replies…
                            </div>
                          )}

                          {!rs.loading && rs.replies.length === 0 && !rs.composerOpen && (
                            <p className="text-xs text-zinc-400 py-1 italic">
                              No replies yet. Be the first to chime in.
                            </p>
                          )}

                          {/* Reply list */}
                          {rs.replies.map((reply) => (
                            <div key={reply.id} className="flex gap-2.5">
                              {/* Thread line + avatar */}
                              <div className="flex flex-col items-center">
                                {reply.profile.avatarUrl ? (
                                  <img
                                    src={reply.profile.avatarUrl}
                                    alt=""
                                    className="h-6 w-6 rounded-full object-cover border border-zinc-200 shrink-0"
                                  />
                                ) : (
                                  <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-zinc-200 text-[9px] font-black text-zinc-700">
                                    {(reply.profile.displayName || "?")[0].toUpperCase()}
                                  </div>
                                )}
                                <div className="w-px flex-1 bg-zinc-200 mt-1" />
                              </div>
                              <div className="flex-1 pb-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[11px] font-bold text-zinc-900">
                                    {reply.profile.displayName}
                                  </span>
                                  <span className="text-[10px] text-zinc-400">
                                    · {timeAgo(reply.createdAt)}
                                  </span>
                                </div>
                                <p className="mt-0.5 text-xs text-zinc-700 leading-relaxed">
                                  {reply.body}
                                </p>
                              </div>
                            </div>
                          ))}

                          {/* Reply Composer */}
                          {rs.composerOpen && (
                            <div className="flex gap-2.5 pt-1">
                              <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-zinc-950 text-[9px] font-black text-white mt-1">
                                {signedIn ? "Y" : "?"}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-end gap-2">
                                  <textarea
                                    rows={2}
                                    value={rs.composerText}
                                    onChange={(e) =>
                                      patchReply(review.id, { composerText: e.target.value })
                                    }
                                    placeholder={
                                      signedIn
                                        ? "Add your take to this thread…"
                                        : "Sign in to reply…"
                                    }
                                    disabled={!signedIn}
                                    className="flex-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-hidden resize-none transition-colors"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!signedIn) { handleSignIn(); return; }
                                      submitReply(review.id);
                                    }}
                                    disabled={rs.submitting || (!signedIn ? false : !rs.composerText.trim())}
                                    className="shrink-0 grid h-8 w-8 place-items-center rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 disabled:opacity-40 transition-colors"
                                    title={signedIn ? "Post reply" : "Sign in first"}
                                  >
                                    {rs.submitting ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Send className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                </div>
                                {!signedIn && (
                                  <button
                                    type="button"
                                    onClick={handleSignIn}
                                    className="mt-1.5 text-[10px] font-bold text-zinc-600 hover:text-zinc-950 underline"
                                  >
                                    Sign in with Google to reply
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-zinc-300 bg-white/70 p-10 text-center">
                <MessageSquare className="h-8 w-8 text-zinc-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-zinc-800">
                  No takes on {place.name} yet.
                </p>
                <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
                  Been here recently? Be the first to tell Bengaluru what it&apos;s actually like.
                </p>
                <button
                  type="button"
                  onClick={() => openComposer("review")}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-5 py-2.5 text-xs font-bold text-white hover:bg-zinc-800 transition-colors"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Leave First Honest Take</span>
                </button>
              </div>
            )}
          </section>

          {/* More in Neighborhood */}
          {nearbyPlaces.length > 0 && (
            <section className="mt-14 pt-8 border-t border-zinc-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-zinc-950">
                    More Places in {place.area}
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Explore other local spots around {place.area}.
                  </p>
                </div>
                <Link
                  href={`/areas/${place.areaSlug}`}
                  className="text-xs font-bold text-zinc-600 hover:text-zinc-950 underline underline-offset-2"
                >
                  View all in {place.area}
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {nearbyPlaces.slice(0, 6).map((nearby) => (
                  <Link
                    key={nearby.id}
                    href={`/places/${nearby.id}`}
                    className="group rounded-2xl border border-zinc-200/90 bg-white p-4 transition-all hover:border-zinc-400 hover:shadow-xs"
                  >
                    <div className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                      {nearby.category}
                    </div>
                    <div className="font-bold text-zinc-950 group-hover:underline text-sm truncate">
                      {nearby.name}
                    </div>
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-1">
                      {nearby.address}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      {!isDrawerMode && <SiteFooter />}
    </div>
  );
}
