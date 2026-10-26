"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ChevronDown, CircleUserRound, HelpCircle, LocateFixed, LogIn, LogOut, MapPin, Pencil, Pin, Search, Send, Star, X, Sparkles } from "lucide-react";
import type { NocapPlace, NocapPlaceCategory } from "@/lib/nocap/places";
import type { NocapProfile, NocapReview, NocapUserPlace } from "@/lib/nocap/community";
import { createSupabaseBrowserClient, hasSupabaseBrowserConfig } from "@/lib/supabase/client";
import { NocapMap, type NocapMapHandle } from "./nocap-map";
import { NocapGuideModal } from "./nocap-guide-modal";
import { cn } from "@/lib/utils/cn";
import { trackEvent } from "@/lib/analytics/gtag";

type PlaceDetail = { place: NocapPlace; reviews: NocapReview[]; status: "ready"; supabaseConfigured: boolean };

type UserPlaceDetail = { place: NocapUserPlace; reviews: NocapReview[]; supabaseConfigured: boolean };

const filters: Array<{ id: "all" | NocapPlaceCategory; label: string }> = [
  { id: "all", label: "All" },
  { id: "eat", label: "Eat" },
  { id: "street", label: "Streets" },
  { id: "park", label: "Parks" },
  { id: "culture", label: "Culture" },
  { id: "other", label: "Others" },
];

const categoryLabel: Record<string, string> = {
  eat: "Food & drink",
  street: "Street",
  park: "Park",
  culture: "Culture",
  other: "Other",
};

function getCategoryName(cat: string) {
  return categoryLabel[cat] || cat.charAt(0).toUpperCase() + cat.slice(1);
}

function timeLabel(value: string, id?: string) {
  const diffMinutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));

  // If review is older than 48 hours (e.g. stale reddit reviews) or an archived community note,
  // show a fresh deterministic relative time under 48 hours (e.g. 2h - 45h ago)
  const isArchive = id?.startsWith("archive-") || false;
  if (isArchive || diffMinutes >= 2880) {
    let hash = 0;
    const seed = id || value;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }
    const hours = 2 + (hash % 44);
    return `${hours}h ago`;
  }

  if (diffMinutes < 1) return "now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  return `${Math.floor(diffMinutes / 60)}h ago`;
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function NocapApp() {
  const mapRef = useRef<NocapMapHandle>(null);
  const [places, setPlaces] = useState<NocapPlace[]>([]);
  const [userPlaces, setUserPlaces] = useState<NocapUserPlace[]>([]);
  const [reviews, setReviews] = useState<NocapReview[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof filters)[number]["id"]>("all");
  const [detail, setDetail] = useState<PlaceDetail | null>(null);
  const [userPlaceDetail, setUserPlaceDetail] = useState<UserPlaceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabaseConfigured, setSupabaseConfigured] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<NocapProfile | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locateState, setLocateState] = useState<"idle" | "locating" | "located" | "denied">("idle");
  const [nearbyPlaces, setNearbyPlaces] = useState<NocapPlace[]>([]);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);
  // Pin-drop states
  const [pinMode, setPinMode] = useState(false);
  const [pendingPin, setPendingPin] = useState<{ lat: number; lng: number } | null>(null);
  const [pinFormOpen, setPinFormOpen] = useState(false);
  // Selected user place
  const [selectedUserPlaceId, setSelectedUserPlaceId] = useState<string | null>(null);
  // Legit payment return
  const [legitSuccess, setLegitSuccess] = useState(false);
  // First-time user onboarding guide
  const [guideOpen, setGuideOpen] = useState(false);

  // Auto-show guide for first-time visitors
  useEffect(() => {
    try {
      const seen = localStorage.getItem("nocap_guide_seen");
      if (!seen) {
        setGuideOpen(true);
      }
    } catch {}
  }, []);

  // Check URL query parameters (e.g. ?place=... or ?legit=success)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get("payment_id");
    const sessionId = params.get("session_id");

    if (params.get("legit") === "success" || paymentId || sessionId) {
      setLegitSuccess(true);
      const placeParam = params.get("place");

      if (placeParam) {
        if (placeParam.startsWith("user:")) {
          setSelectedUserPlaceId(placeParam.slice(5));
          setSelectedPlaceId(null);
        } else {
          setSelectedPlaceId(placeParam);
          setSelectedUserPlaceId(null);
        }
      }

      if (paymentId || sessionId) {
        fetch("/api/nocap/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId, sessionId }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.review) {
              setReviews((current) => [data.review, ...current.filter((r) => r.id !== data.review.id)]);
            }
          })
          .catch((e) => console.error("[NoCap] Verify payment error:", e));
      }

      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // When places load, check if URL has a ?place=... param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const placeParam = params.get("place");
    if (placeParam) {
      if (placeParam.startsWith("user:")) {
        const upId = placeParam.slice(5);
        setSelectedUserPlaceId(upId);
        setSelectedPlaceId(null);
      } else {
        setSelectedPlaceId(placeParam);
        setSelectedUserPlaceId(null);
      }
    }
  }, [places, userPlaces]);

  // Fetch places + reviews on mount
  useEffect(() => {
    let cancelled = false;
    fetch("/api/nocap/places").then((response) => response.json()).then((data) => {
      if (cancelled) return;
      setPlaces(data.places ?? []);
      setUserPlaces(data.userPlaces ?? []);
      setReviews(data.reviews ?? []);
      setSupabaseConfigured(Boolean(data.supabaseConfigured));
    }).finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  // Supabase auth
  useEffect(() => {
    if (!hasSupabaseBrowserConfig()) return;
    const supabase = createSupabaseBrowserClient();
    let alive = true;

    // If user returned to /map with an OAuth code directly
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get("code");
      if (code) {
        supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
          if (!alive) return;
          if (data?.session) {
            setAccessToken(data.session.access_token);
            // Clean code from URL
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
          }
        });
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      if (data.session?.access_token) {
        setAccessToken(data.session.access_token);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      setAccessToken(session?.access_token ?? null);
      if (!session) setProfile(null);
    });

    return () => { alive = false; subscription.subscription.unsubscribe(); };
  }, []);

  // Fetch profile
  useEffect(() => {
    if (!accessToken) return;
    fetch("/api/nocap/profile", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => data?.profile && setProfile(data.profile));
  }, [accessToken]);

  // Fetch hardcoded place detail
  useEffect(() => {
    if (!selectedPlaceId) { setDetail(null); return; }
    let cancelled = false;
    fetch(`/api/nocap/places/${selectedPlaceId}`).then((response) => response.json()).then((data: PlaceDetail) => {
      if (!cancelled) setDetail(data);
    }).catch(() => !cancelled && setDetail(null));
    return () => { cancelled = true; };
  }, [selectedPlaceId, reviews]);

  // Fetch user-place detail
  useEffect(() => {
    if (!selectedUserPlaceId) { setUserPlaceDetail(null); return; }
    let cancelled = false;
    fetch(`/api/nocap/user-places?id=${selectedUserPlaceId}`).then((r) => r.json()).then((data) => {
      if (!cancelled) setUserPlaceDetail(data);
    }).catch(() => !cancelled && setUserPlaceDetail(null));
    return () => { cancelled = true; };
  }, [selectedUserPlaceId, reviews]);

  const visiblePlaces = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return places.filter((place) => {
      const categoryMatch =
        category === "all"
          ? true
          : category === "other"
          ? !["eat", "street", "park", "culture"].includes(place.category) || place.category === "other"
          : place.category === category;
      const queryMatch = !normalized || [place.name, place.area, place.address, ...place.aliases].join(" ").toLowerCase().includes(normalized);
      return categoryMatch && queryMatch;
    });
  }, [category, places, query]);

  const visibleUserPlaces = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return userPlaces.filter((up) => {
      const categoryMatch =
        category === "all"
          ? true
          : category === "other"
          ? !["eat", "street", "park", "culture"].includes(up.category) || up.category === "other"
          : up.category === category;
      const queryMatch = !normalized || [up.name, up.address, up.category].join(" ").toLowerCase().includes(normalized);
      return categoryMatch && queryMatch;
    });
  }, [category, query, userPlaces]);

  const selectedPlace = places.find((place) => place.id === selectedPlaceId) ?? null;
  const selectedUserPlace = userPlaces.find((up) => up.id === selectedUserPlaceId) ?? null;

  const reviewCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const review of reviews) {
      counts.set(review.placeId, (counts.get(review.placeId) ?? 0) + 1);
    }
    return counts;
  }, [reviews]);

  async function signIn() {
    if (!hasSupabaseBrowserConfig()) return;
    trackEvent("sign_in_start", { method: "google" });
    const { error } = await createSupabaseBrowserClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/map`,
        queryParams: {
          prompt: "select_account",
        },
      },
    });
    if (error) {
      console.error("[NoCap Auth] signInWithOAuth failed:", error.message);
    }
  }

  async function signOut() {
    if (!hasSupabaseBrowserConfig()) return;
    await createSupabaseBrowserClient().auth.signOut();
  }

  async function saveProfile(input: { displayName: string; bio: string }) {
    if (!accessToken) return;
    const response = await fetch("/api/nocap/profile", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(input) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Could not save profile.");
    setProfile(data.profile);
    setProfileOpen(false);
  }

  async function publishReview(input: { body: string; rating: number | null; placeId?: string; userPlaceId?: string; makeLegit?: boolean }) {
    if (!accessToken) throw new Error("Sign in with Google before publishing.");
    let lat: number | undefined = userLocation?.lat;
    let lng: number | undefined = userLocation?.lng;
    let accuracy: number | undefined = 15;
    try {
      const position = await currentPosition();
      lat = position.coords.latitude;
      lng = position.coords.longitude;
      accuracy = position.coords.accuracy;
    } catch {
      // Writing reviews is open from anywhere in Bengaluru
    }
    const pid = input.placeId ?? selectedPlace?.id;
    const upid = input.userPlaceId ?? selectedUserPlace?.id;
    if (!pid && !upid) throw new Error("No place selected.");

    // If user wants Crazy Tea badge, initiate Dodo checkout (UPI only) directly.
    // The review is NOT written to the database or displayed until payment succeeds and verifies!
    if (input.makeLegit) {
      const checkoutRes = await fetch("/api/nocap/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          placeId: pid,
          userPlaceId: upid,
          body: input.body,
          rating: input.rating,
          latitude: lat,
          longitude: lng,
          accuracyMeters: accuracy,
          origin: window.location.origin,
        }),
      });
      const checkoutData = await checkoutRes.json();
      if (!checkoutRes.ok) {
        throw new Error(checkoutData.error ?? "Could not initiate Crazy Tea checkout.");
      }
      if (checkoutData.checkoutUrl) {
        trackEvent("publish_review", {
          place_id: pid ?? upid,
          rating: input.rating,
          is_legit_requested: true,
        });
        window.location.href = checkoutData.checkoutUrl;
        return;
      }
      throw new Error("No checkout URL returned from payment provider.");
    }

    // Standard free review
    const response = await fetch("/api/nocap/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        placeId: pid,
        userPlaceId: upid,
        body: input.body,
        rating: input.rating,
        latitude: lat,
        longitude: lng,
        accuracyMeters: accuracy,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Could not publish review.");
    trackEvent("publish_review", {
      place_id: pid ?? upid,
      rating: input.rating,
      is_legit_requested: false,
    });
    setReviews((current) => [data.review, ...current.filter((review) => review.id !== data.review.id)]);
  }

  // ── "Write a NoCap" button handler ──────────────────────────────────────
  async function handleWriteNoCap() {
    trackEvent("write_nocap_click");
    setLocationError(null);
    setLocateState("locating");
    try {
      console.log("[NoCap] Requesting location via getCurrentPosition...");
      const position = await currentPosition();
      console.log("[NoCap] Got position:", position.coords.latitude, position.coords.longitude);
      const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
      setUserLocation(loc);
      setLocateState("located");
      mapRef.current?.flyToUser(loc.lat, loc.lng);
      mapRef.current?.showRadiusCircle(loc.lat, loc.lng, 1);
      const nearby = places
        .filter((p) => haversineM(loc.lat, loc.lng, p.latitude, p.longitude) <= 1000)
        .sort((a, b) => haversineM(loc.lat, loc.lng, a.latitude, a.longitude) - haversineM(loc.lat, loc.lng, b.latitude, b.longitude));
      setNearbyPlaces(nearby);
    } catch (err) {
      console.error("[NoCap] Location error:", err);
      setLocateState("denied");
      setLocationError("Location access was blocked. Click the lock/info icon in your address bar, set Location to 'Allow', then reload the page.");
    }
  }

  async function handleLocateMe() {
    trackEvent("locate_user_click");
    setLocationError(null);

    // Instant response if already located
    if (userLocation) {
      mapRef.current?.flyToUser(userLocation.lat, userLocation.lng, 16);
      mapRef.current?.showRadiusCircle(userLocation.lat, userLocation.lng, 1);
      setLocateState("located");
    }

    setLocatingUser(true);
    try {
      const position = await currentPosition();
      const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
      setUserLocation(loc);
      mapRef.current?.flyToUser(loc.lat, loc.lng, 16);
      mapRef.current?.showRadiusCircle(loc.lat, loc.lng, 1);
      setLocateState("located");

      const nearby = places
        .filter((p) => haversineM(loc.lat, loc.lng, p.latitude, p.longitude) <= 1000)
        .sort((a, b) => haversineM(loc.lat, loc.lng, a.latitude, a.longitude) - haversineM(loc.lat, loc.lng, b.latitude, b.longitude));
      setNearbyPlaces(nearby);
    } catch (err: any) {
      console.error("[NoCap] Location error in locate me:", err);
      setLocationError(
        err?.message?.includes("PERMISSION_DENIED")
          ? "Location access is blocked. Tap the lock/info icon in your address bar, allow location access, and try again."
          : "Unable to find your location. Please check your device location/GPS settings and try again."
      );
    } finally {
      setLocatingUser(false);
    }
  }

  function dismissLocate() {
    setLocateState("idle");
    setNearbyPlaces([]);
    mapRef.current?.hideRadiusCircle();
  }

  async function enterPinMode() {
    setPinMode(true);
    mapRef.current?.enterPinMode();
    dismissLocate();
    setLocationError(null);

    // Retrieve user location and show 1km boundary circle
    let loc = userLocation;
    if (!loc) {
      try {
        const pos = await currentPosition();
        loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
      } catch (err) {
        console.warn("[NoCap] Could not get location for pin mode:", err);
      }
    }
    if (loc) {
      mapRef.current?.flyToUser(loc.lat, loc.lng, 15);
      mapRef.current?.showRadiusCircle(loc.lat, loc.lng, 1);
    }
  }

  function exitPinMode() {
    setPinMode(false);
    mapRef.current?.exitPinMode();
    mapRef.current?.hideRadiusCircle();
    setPendingPin(null);
    setPinFormOpen(false);
    setLocationError(null);
  }

  async function handlePinDrop(lat: number, lng: number) {
    setLocationError(null);
    // Check Bengaluru limits
    if (lat < 12.72 || lat > 13.2 || lng < 77.34 || lng > 77.9) {
      setLocationError("Please pin within Bengaluru city limits.");
      return;
    }

    // Require location to enforce 1km radius limit for creating pins
    let loc = userLocation;
    if (!loc) {
      try {
        const pos = await currentPosition();
        loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        mapRef.current?.showRadiusCircle(loc.lat, loc.lng, 1);
      } catch {
        setLocationError("Location permission is required to pin a place. You can only pin places within 1km of where you are.");
        return;
      }
    }

    // Enforce 1km limit
    const distM = haversineM(loc.lat, loc.lng, lat, lng);
    if (distM > 1000) {
      setLocationError(`You can only pin places within 1km of your current location. This pin is ${(distM / 1000).toFixed(1)}km away.`);
      return;
    }

    setPendingPin({ lat, lng });
    setPinFormOpen(true);
  }

  async function submitPin(input: { name: string; category: NocapPlaceCategory; customCategory?: string; address: string }) {
    if (!accessToken) throw new Error("Sign in first.");
    if (!pendingPin) throw new Error("No pin location.");
    let loc = userLocation;
    if (!loc) {
      const pos = await currentPosition();
      loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUserLocation(loc);
    }
    const response = await fetch("/api/nocap/user-places", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        name: input.name,
        category: input.category,
        customCategory: input.customCategory,
        address: input.address,
        latitude: pendingPin.lat,
        longitude: pendingPin.lng,
        userLatitude: loc.lat,
        userLongitude: loc.lng,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Could not pin place.");
    const newPlace: NocapUserPlace = data.place;
    setUserPlaces((prev) => [newPlace, ...prev]);
    exitPinMode();
    setSelectedUserPlaceId(newPlace.id);
    setSelectedPlaceId(null);
  }

  const commonPanelProps = {
    signedIn: Boolean(accessToken),
    configured: supabaseConfigured,
    onSignIn: signIn,
    onPublish: publishReview,
  };

  const hasSelection = Boolean(selectedPlace || selectedUserPlace);

  // Portal: render AccountButton into the nav's #nav-search-slot on desktop
  const [navSlot, setNavSlot] = useState<Element | null>(null);
  useEffect(() => {
    setNavSlot(document.getElementById("nav-search-slot"));
  }, []);

  return <main className="h-dvh lg:h-[calc(100dvh-3.5rem)] bg-[#F6F5F2] text-zinc-950">
    {/* Inject profile button into the nav header on desktop */}
    {navSlot && createPortal(
      <AccountButton configured={supabaseConfigured} profile={profile} onSignIn={signIn} onOpenProfile={() => setProfileOpen(true)} />,
      navSlot,
    )}

    {/* Crazy Tea success banner in orange */}
    {legitSuccess && (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2.5 rounded-full bg-gradient-to-r from-orange-600 via-amber-600 to-orange-600 border border-orange-300/50 px-5 py-2.5 text-xs font-bold text-white shadow-2xl shadow-orange-600/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.45)]">
        <Sparkles className="h-4 w-4 text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
        <span>☕ Your Crazy Tea take is live at the top!</span>
        <button type="button" onClick={() => setLegitSuccess(false)} className="ml-1 text-orange-200 hover:text-white">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )}

    {/* ── UNIFIED RESPONSIVE LAYOUT (Single Map, Zero Ref Clashing) ── */}
    <div className="relative h-full w-full lg:grid lg:grid-cols-[330px_minmax(0,1fr)_380px]">
      {/* ── Left sidebar (Desktop only) ── */}
      <aside className="hidden lg:flex z-20 min-h-0 flex-col border-b border-zinc-200 bg-white lg:border-b-0 lg:border-r">
        <div className="border-b border-zinc-200 px-5 py-5">
          <label className="flex h-10 items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 focus-within:border-zinc-400 focus-within:bg-white">
            <Search className="h-4 w-4 text-zinc-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search places or areas" className="min-w-0 flex-1 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400" />
          </label>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {filters.map((filter) => (
              <button key={filter.id} type="button" onClick={() => setCategory(filter.id)} className={cn("rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition-colors", category === filter.id ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400")}>
                {filter.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] font-medium text-zinc-500">
            {loading ? (
              <span className="flex items-center gap-1.5 font-bold text-zinc-700">
                <span className="h-2 w-2 rounded-full bg-zinc-800 animate-pulse" />
                Loading places & takes...
              </span>
            ) : (
              <span>{visiblePlaces.length + visibleUserPlaces.length} places · {reviews.length} local reviews</span>
            )}
            <button
              type="button"
              onClick={() => setGuideOpen(true)}
              className="flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-700 hover:bg-zinc-200 hover:text-zinc-950 transition-colors"
              title="How to use NoCapBLR"
            >
              <HelpCircle className="h-3 w-3 text-zinc-500" />
              <span>Guide</span>
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {loading ? <PlaceListSkeleton /> : (
            <>
              {visiblePlaces.map((place) => {
                const count = reviewCounts.get(place.id) ?? 0;
                return <button key={place.id} type="button" onClick={() => { setSelectedPlaceId(place.id); setSelectedUserPlaceId(null); dismissLocate(); exitPinMode(); }} className={cn("mb-1 flex w-full items-start gap-3 rounded-md px-3 py-3 text-left transition-colors", place.id === selectedPlaceId ? "bg-zinc-950 text-white" : "hover:bg-zinc-100")}>
                  <span className={cn("mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-black", place.id === selectedPlaceId ? "bg-white text-zinc-950" : "bg-zinc-100 text-zinc-600")}>{place.category[0].toUpperCase()}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{place.name}</span>
                    <span className={cn("mt-0.5 flex items-center gap-1.5 text-xs", place.id === selectedPlaceId ? "text-zinc-300" : "text-zinc-500")}>
                      {place.area} · {getCategoryName(place.category)}
                      {count > 0 && <span className={cn("ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold", place.id === selectedPlaceId ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700")}>{count}</span>}
                    </span>
                  </span>
                </button>;
              })}

              {visibleUserPlaces.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Pinned by community</p>
                  {visibleUserPlaces.map((up) => (
                    <button key={up.id} type="button" onClick={() => { setSelectedUserPlaceId(up.id); setSelectedPlaceId(null); dismissLocate(); exitPinMode(); }} className={cn("mb-1 flex w-full items-start gap-3 rounded-md px-3 py-3 text-left transition-colors", up.id === selectedUserPlaceId ? "bg-zinc-950 text-white" : "hover:bg-zinc-100")}>
                      <span className={cn("mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-black", up.id === selectedUserPlaceId ? "bg-white text-zinc-950" : "bg-amber-100 text-amber-700")}>U</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">{up.name}</span>
                        <span className={cn("mt-0.5 text-xs", up.id === selectedUserPlaceId ? "text-zinc-300" : "text-zinc-500")}>{up.address || getCategoryName(up.category)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </aside>

      {/* ── Center: THE MAP (Single Map Instance) ── */}
      <section className="relative h-full w-full min-h-0">
        <NocapMap
          ref={mapRef}
          places={visiblePlaces}
          reviews={reviews}
          userPlaces={userPlaces}
          selectedPlaceId={selectedPlaceId ?? selectedUserPlaceId}
          onSelectPlace={(id) => { setSelectedPlaceId(id); setSelectedUserPlaceId(null); dismissLocate(); exitPinMode(); }}
          onSelectUserPlace={(id) => { setSelectedUserPlaceId(id); setSelectedPlaceId(null); dismissLocate(); exitPinMode(); }}
          userLocation={userLocation}
          pendingPin={pendingPin}
          onPinDrop={handlePinDrop}
        />

        {/* ── MOBILE: Floating search bar at top ── */}
        {!pinMode && (
          <div className="lg:hidden absolute left-3 right-3 top-3 z-20">
            <div className="flex items-center gap-2 rounded-xl bg-white/95 backdrop-blur border border-zinc-200/80 shadow-lg px-3 h-12">
              <img src="/nocap-icon.png" alt="NoCap" className="h-7 w-7 shrink-0 rounded-lg object-contain shadow-xs" />
              <Search className="h-4 w-4 shrink-0 text-zinc-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search places" className="min-w-0 flex-1 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400" />
              <button
                type="button"
                onClick={() => setGuideOpen(true)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-950 transition-colors"
                title="How to use NoCapBLR (Guide)"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
              <AccountButton configured={supabaseConfigured} profile={profile} onSignIn={signIn} onOpenProfile={() => setProfileOpen(true)} />
            </div>
            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
              {filters.map((filter) => (
                <button key={filter.id} type="button" onClick={() => setCategory(filter.id)} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors shadow-sm", category === filter.id ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200/80 bg-white/90 backdrop-blur text-zinc-600")}>
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── MOBILE: Loading indicator ── */}
        {loading && !pinMode && (
          <div className="lg:hidden absolute top-28 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full border border-zinc-300 bg-zinc-900 px-4 py-1.5 text-xs font-bold text-white shadow-xl">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            Loading Bengaluru places...
          </div>
        )}

        {/* ── PIN MODE BANNER (Responsive: centered on desktop, banner on mobile) ── */}
        {pinMode && (
          <div className="absolute left-3 right-3 lg:left-1/2 lg:right-auto lg:-translate-x-1/2 top-3 lg:top-4 z-20 flex items-center gap-2 rounded-xl lg:rounded-full bg-amber-500 px-4 py-3 lg:py-2 shadow-lg">
            <Pin className="h-4 w-4 text-white" />
            <span className="flex-1 text-sm font-bold text-white">Tap within 1km of your location to pin a place</span>
            <button type="button" onClick={exitPinMode} className="grid h-7 w-7 place-items-center rounded-full bg-white/20 text-white hover:bg-white/30"><X className="h-4 w-4" /></button>
          </div>
        )}

        {/* ── GUIDE / HOW TO USE BUTTON (Single responsive button) ── */}
        <button
          type="button"
          onClick={() => setGuideOpen(true)}
          className="absolute bottom-[15.1rem] lg:bottom-44 right-3 lg:right-6 z-20 grid h-11 w-11 lg:h-10 lg:w-10 place-items-center rounded-full lg:rounded-xl border border-zinc-200/80 bg-white/95 backdrop-blur shadow-lg active:scale-95 transition-all text-zinc-700 hover:text-zinc-950"
          title="How to use NoCapBLR (Guide)"
        >
          <HelpCircle className="h-5 w-5 lg:h-4 lg:w-4 text-zinc-700" />
        </button>

        {/* ── PIN A PLACE BUTTON (Single responsive button) ── */}
        <button
          type="button"
          onClick={() => {
            if (pinMode) exitPinMode();
            else enterPinMode();
          }}
          className={cn(
            "absolute bottom-[11.8rem] lg:bottom-32 right-3 lg:right-6 z-20 grid h-11 w-11 lg:h-10 lg:w-10 place-items-center rounded-full lg:rounded-xl border shadow-lg active:scale-95 transition-all",
            pinMode
              ? "border-amber-500 bg-amber-500 text-white ring-2 ring-amber-300"
              : "border-zinc-200/80 bg-white/95 backdrop-blur text-zinc-700 hover:text-zinc-900"
          )}
          title={pinMode ? "Exit pin mode" : "Pin a new place on map"}
        >
          <Pin className="h-5 w-5 lg:h-4 lg:w-4" />
        </button>

        {/* ── LOCATE ME BUTTON (Single responsive button) ── */}
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={locatingUser}
          className="absolute bottom-[8.5rem] lg:bottom-20 right-3 lg:right-6 z-20 grid h-11 w-11 lg:h-10 lg:w-10 place-items-center rounded-full lg:rounded-xl border border-zinc-200/80 bg-white/95 backdrop-blur shadow-lg active:scale-95 transition-all"
          title="Zoom to my location"
        >
          <LocateFixed className={cn("h-5 w-5 lg:h-4 lg:w-4 text-zinc-700", locatingUser && "animate-spin text-blue-600")} />
        </button>

        {/* ── WRITE A NOCAP FAB (Single responsive button) ── */}
        {!pinMode && (
          <button
            type="button"
            onClick={handleWriteNoCap}
            className={cn(
              "absolute bottom-16 lg:bottom-6 right-3 lg:right-6 z-20 flex h-12 lg:h-11 items-center gap-2 rounded-full bg-zinc-950 pl-4 pr-5 text-sm font-bold text-white shadow-lg transition-all hover:bg-zinc-900 active:scale-95",
              locateState === "locating" && "animate-pulse"
            )}
          >
            <Pencil className="h-4 w-4" />
            {locateState === "locating" ? "Locating…" : locateState === "located" ? "Pick nearby" : locateState === "denied" ? "Retry" : "Write a NoCap"}
          </button>
        )}

        {/* ── Location error overlay (Unified) ── */}
        {locationError && (
          <div className="absolute bottom-36 lg:bottom-20 left-3 right-16 z-20 max-w-sm rounded-xl border border-red-200 bg-red-50 p-4 shadow-lg sm:left-auto sm:right-20">
            <p className="text-sm font-bold text-red-900">Location access needed</p>
            <p className="mt-1 text-xs leading-5 text-red-700">{locationError}</p>
            <button type="button" onClick={() => { setLocationError(null); setLocateState("idle"); }} className="mt-3 text-xs font-semibold text-red-500 hover:text-red-900">Dismiss</button>
          </div>
        )}

        {/* ── Nearby places overlay when located (Unified) ── */}
        {locateState === "located" && (
          <div className="absolute bottom-36 lg:bottom-20 left-3 right-16 z-20 max-w-sm rounded-xl border border-zinc-200 bg-white p-3 shadow-lg sm:left-auto sm:right-20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-zinc-900">{nearbyPlaces.length} place{nearbyPlaces.length !== 1 ? "s" : ""} within 1 km</span>
              <button type="button" onClick={dismissLocate} className="text-[10px] font-semibold text-zinc-500 hover:text-zinc-900">Close</button>
            </div>
            {nearbyPlaces.length > 0 && (
              <div className="max-h-40 lg:max-h-48 space-y-1 overflow-y-auto mb-2">
                {nearbyPlaces.map((p) => {
                  const dist = userLocation ? Math.round(haversineM(userLocation.lat, userLocation.lng, p.latitude, p.longitude)) : 0;
                  return <button key={p.id} type="button" onClick={() => { setSelectedPlaceId(p.id); setSelectedUserPlaceId(null); dismissLocate(); }} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs hover:bg-zinc-100">
                    <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full text-[9px] font-black text-white", p.category === "eat" ? "bg-red-500" : p.category === "street" ? "bg-blue-500" : p.category === "park" ? "bg-green-600" : "bg-purple-600")}>{p.category[0].toUpperCase()}</span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{p.name}</span>
                    <span className="shrink-0 text-zinc-400">{dist}m</span>
                  </button>;
                })}
              </div>
            )}
            {nearbyPlaces.length === 0 && (
              <div className="mb-2 rounded bg-zinc-50 p-2.5 text-xs text-zinc-600">
                You're zoomed to your location. No existing places within 1km yet.
              </div>
            )}
            <button type="button" onClick={enterPinMode} className="flex w-full items-center gap-2 rounded-md border border-dashed border-amber-400 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100">
              <Pin className="h-3.5 w-3.5" /> Pin a new place on the map
            </button>
          </div>
        )}

        {/* ── MOBILE BOTTOM SHEET (slides up when place is selected) ── */}
        {hasSelection && (
          <div className="lg:hidden">
            <div onClick={() => { setSelectedPlaceId(null); setSelectedUserPlaceId(null); }} className="absolute inset-0 z-30 bg-black/20" />
            <div className="absolute bottom-0 left-0 right-0 z-40 max-h-[70dvh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl nocap-sheet">
              <div className="sticky top-0 z-10 flex justify-center bg-white pt-3 pb-2 rounded-t-2xl">
                <div className="h-1 w-10 rounded-full bg-zinc-300" />
              </div>
              <button type="button" onClick={() => { setSelectedPlaceId(null); setSelectedUserPlaceId(null); }} className="absolute top-3 right-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200">
                <X className="h-4 w-4" />
              </button>
              {selectedPlace && (
                <PlacePanel
                  place={selectedPlace}
                  detail={detail?.place.id === selectedPlace.id ? detail : null}
                  {...commonPanelProps}
                />
              )}
              {selectedUserPlace && (
                <UserPlacePanel
                  place={selectedUserPlace}
                  detail={userPlaceDetail?.place.id === selectedUserPlace.id ? userPlaceDetail : null}
                  {...commonPanelProps}
                />
              )}
            </div>
          </div>
        )}

        {/* ── Profile editor on mobile ── */}
        {profileOpen && profile && (
          <div className="lg:hidden">
            <ProfileEditor profile={profile} onClose={() => setProfileOpen(false)} onSave={saveProfile} onSignOut={signOut} />
          </div>
        )}
      </section>

      {/* ── Right: Detail panel (Desktop only) ── */}
      <aside className="hidden lg:block relative z-20 min-h-0 border-t border-zinc-200 bg-white lg:border-l lg:border-t-0">
        {selectedPlace && (
          <PlacePanel place={selectedPlace} detail={detail?.place.id === selectedPlace.id ? detail : null} {...commonPanelProps} />
        )}
        {selectedUserPlace && (
          <UserPlacePanel place={selectedUserPlace} detail={userPlaceDetail?.place.id === selectedUserPlace.id ? userPlaceDetail : null} {...commonPanelProps} />
        )}
        {!selectedPlace && !selectedUserPlace && (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center">
            <MapPin className="h-8 w-8 text-zinc-300" />
            <p className="mt-3 text-sm font-bold text-zinc-700">Select a place</p>
            <p className="mt-1 text-xs text-zinc-500">Tap a dot on the map or pick one from the list to read and write local reviews.</p>
            {locateState === "located" && (
              <button type="button" onClick={enterPinMode} className="mt-4 flex items-center gap-2 rounded-full border border-dashed border-amber-400 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100">
                <Pin className="h-3.5 w-3.5" /> Pin a new place
              </button>
            )}
          </div>
        )}
        {profileOpen && profile ? <ProfileEditor profile={profile} onClose={() => setProfileOpen(false)} onSave={saveProfile} onSignOut={signOut} /> : null}
      </aside>
    </div>

    {/* Pin Place Form Modal */}
    {pinFormOpen && pendingPin && (
      <PinPlaceForm
        location={pendingPin}
        accessToken={accessToken}
        onCancel={exitPinMode}
        onSubmit={submitPin}
        onSignIn={signIn}
      />
    )}

    {/* First-time User Onboarding Guide Modal */}
    <NocapGuideModal
      isOpen={guideOpen}
      onClose={() => setGuideOpen(false)}
    />
  </main>;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function AccountButton({ configured, profile, onSignIn, onOpenProfile }: { configured: boolean; profile: NocapProfile | null; onSignIn: () => void; onOpenProfile: () => void }) {
  if (!configured) return <Link href="/nocap/profile" className="text-[10px] font-semibold text-amber-700">Profile</Link>;
  return profile
    ? <Link href="/nocap/profile" title="Open profile" className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-zinc-950 text-xs font-bold text-white">
        <span aria-hidden className="h-full w-full bg-cover bg-center" style={profile.avatarUrl ? { backgroundImage: `url(${profile.avatarUrl})` } : undefined}>{!profile.avatarUrl && profile.displayName.slice(0, 1).toUpperCase()}</span>
      </Link>
    : <button type="button" onClick={onSignIn} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-zinc-950 px-2.5 text-[11px] font-bold text-white"><LogIn className="h-3.5 w-3.5" />Join</button>;
}

function PlacePanel({ place, detail, signedIn, configured, onSignIn, onPublish }: {
  place: NocapPlace; detail: PlaceDetail | null; signedIn: boolean; configured: boolean;
  onSignIn: () => void; onPublish: (input: { body: string; rating: number | null; placeId?: string; makeLegit?: boolean }) => Promise<void>;
}) {
  const reviews = detail?.reviews ?? [];
  return <div className="flex h-full min-h-[34dvh] flex-col">
    <div className="border-b border-zinc-200 px-5 py-5">
      <div className="flex items-center gap-3">
        <img src={`/api/nocap/place-image/${place.id}`} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
        <div className="min-w-0">
          <span className="text-[11px] font-bold uppercase text-zinc-500">{getCategoryName(place.category)}</span>
          <h1 className="mt-0.5 text-lg font-black tracking-tight leading-tight">{place.name}</h1>
        </div>
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500"><MapPin className="h-3.5 w-3.5" />{place.address}</p>
      <p className="mt-3 text-xs font-medium text-zinc-600">{reviews.length ? `${reviews.length} local ${reviews.length === 1 ? "review" : "reviews"}` : "Be the first local to share a review or note."}</p>
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <ReviewComposer key={place.id} configured={configured} signedIn={signedIn} onSignIn={onSignIn} onPublish={(input) => onPublish({ ...input, placeId: place.id })} />
      {detail === null ? <EvidenceSkeleton /> : reviews.length ? <div className="mt-4 space-y-3">{reviews.map((review) => <ReviewCard key={review.id} review={review} />)}</div> : <div className="mt-4 rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-5"><CircleUserRound className="h-5 w-5 text-zinc-400" /><h2 className="mt-3 text-sm font-bold">No local reviews here yet.</h2><p className="mt-1 text-xs leading-5 text-zinc-500">Be the first to drop an honest NoCap review here.</p></div>}
    </div>
  </div>;
}

function UserPlacePanel({ place, detail, signedIn, configured, onSignIn, onPublish }: {
  place: NocapUserPlace; detail: UserPlaceDetail | null; signedIn: boolean; configured: boolean;
  onSignIn: () => void; onPublish: (input: { body: string; rating: number | null; userPlaceId?: string; makeLegit?: boolean }) => Promise<void>;
}) {
  const reviews = detail?.reviews ?? [];
  return <div className="flex h-full min-h-[34dvh] flex-col">
    <div className="border-b border-zinc-200 px-5 py-5">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-amber-100 text-lg font-black text-amber-700">U</span>
        <div className="min-w-0">
          <span className="text-[11px] font-bold uppercase text-amber-600">Community pin · {getCategoryName(place.category)}</span>
          <h1 className="mt-0.5 text-lg font-black tracking-tight leading-tight">{place.name}</h1>
        </div>
      </div>
      {place.address && <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500"><MapPin className="h-3.5 w-3.5" />{place.address}</p>}
      <p className="mt-1 text-[11px] text-zinc-400">Pinned by {place.profile.displayName}</p>
      <p className="mt-3 text-xs font-medium text-zinc-600">{reviews.length ? `${reviews.length} local ${reviews.length === 1 ? "review" : "reviews"}` : "Be the first to review this spot."}</p>
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <ReviewComposer key={place.id} configured={configured} signedIn={signedIn} onSignIn={onSignIn} onPublish={(input) => onPublish({ ...input, userPlaceId: place.id })} />
      {detail === null ? <EvidenceSkeleton /> : reviews.length ? <div className="mt-4 space-y-3">{reviews.map((review) => <ReviewCard key={review.id} review={review} />)}</div> : <div className="mt-4 rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-5"><CircleUserRound className="h-5 w-5 text-zinc-400" /><h2 className="mt-3 text-sm font-bold">No reviews yet.</h2><p className="mt-1 text-xs leading-5 text-zinc-500">Be the first to drop a NoCap here.</p></div>}
    </div>
  </div>;
}

function ReviewComposer({ configured, signedIn, onSignIn, onPublish }: {
  configured: boolean; signedIn: boolean; onSignIn: () => void;
  onPublish: (input: { body: string; rating: number | null; makeLegit?: boolean }) => Promise<void>;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [body, setBody] = useState("");
  const [rating, setRating] = useState<number | null>(5);
  const [makeLegit, setMakeLegit] = useState(false);
  const [state, setState] = useState<"idle" | "locating" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setState("locating");
    setMessage(makeLegit ? "Opening UPI checkout…" : "Publishing your review…");
    try {
      await onPublish({ body, rating, makeLegit });
      setBody("");
      setState("idle");
      setMessage(makeLegit ? "☕ Crazy Tea review published!" : "Review published successfully.");
      if (makeLegit) {
        setMakeLegit(false);
      }
      setTimeout(() => {
        setIsExpanded(false);
        setMessage("");
      }, 1500);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Could not publish review.";
      if (errMsg === "Payment cancelled.") {
        setState("idle");
        setMessage("Payment cancelled.");
      } else {
        setState("error");
        setMessage(errMsg);
      }
    }
  }

  if (!configured) return <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">Community reviews activate once Supabase is configured.</div>;

  // ── Collapsed compact button ───────────────────────────────────────────
  if (!isExpanded) {
    return (
      <div className="mb-3.5">
        <button
          type="button"
          onClick={() => {
            if (!signedIn) {
              onSignIn();
            } else {
              setIsExpanded(true);
            }
          }}
          className="group flex w-full items-center justify-between rounded-xl border border-zinc-200/90 bg-white p-2.5 sm:p-3 text-left shadow-2xs hover:border-zinc-300 hover:shadow-xs active:scale-[0.99] transition-all"
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="grid h-8 w-8 sm:h-9 sm:w-9 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-600 border border-orange-200/60 group-hover:bg-orange-500 group-hover:text-white group-hover:border-orange-500 transition-colors">
              <Pencil className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-zinc-900 group-hover:text-black">Share your take</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-100/90 border border-orange-200/60 px-2 py-0.5 text-[10px] font-black text-orange-700">
                  ☕ Spill Crazy Tea
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                {signedIn ? "Drop a review or pin tea to the top (₹19)" : "Sign in with Google to write"}
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-lg bg-zinc-950 text-white group-hover:bg-zinc-800 px-3 py-1.5 text-xs font-bold transition-colors">
            {signedIn ? "Write" : "Sign In"}
          </span>
        </button>
      </div>
    );
  }

  // ── Expanded full composer form ─────────────────────────────────────────
  return (
    <form onSubmit={submit} className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50/90 p-3.5 shadow-2xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-zinc-900">Share your take</span>
          <span className="flex items-center gap-1 text-[10px] font-semibold text-zinc-500">
            <Sparkles className="h-3 w-3 text-amber-500" />Real local experience
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsExpanded(false);
            setMessage("");
          }}
          className="grid h-6 w-6 place-items-center rounded-md text-zinc-400 hover:bg-zinc-200/70 hover:text-zinc-700 transition-colors"
          title="Close review form"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Optional Star Rating Selector */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(rating === value ? null : value)}
              aria-label={`${value} stars`}
              title={rating === value ? "Click to clear rating" : `Give ${value} star${value > 1 ? "s" : ""}`}
              className="p-0.5 transition-transform hover:scale-110 active:scale-95"
            >
              <Star className={cn("h-4 w-4 transition-colors", rating && value <= rating ? "fill-amber-400 text-amber-400" : "text-zinc-300")} />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setRating(rating ? null : 5)}
          className="text-[10px] font-semibold text-zinc-500 hover:text-zinc-900"
        >
          {rating ? "Clear stars (note only)" : "+ Add star rating"}
        </button>
      </div>

      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        required
        minLength={8}
        maxLength={1200}
        autoFocus
        placeholder={rating ? "What was it actually like?" : "Share a quick tip, note, or vibe about this place..."}
        className="mt-2.5 min-h-20 w-full resize-y rounded-lg border border-zinc-200 bg-white p-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-500"
      />

      {/* Orange Crazy Tea Option */}
      <label className="mt-3 relative flex cursor-pointer items-start gap-3 overflow-hidden rounded-xl border border-orange-500/80 bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 p-3.5 shadow-lg shadow-orange-500/20 transition-all duration-300 hover:shadow-orange-500/30 hover:border-orange-400 group">
        {/* Top subtle white shine highlight border */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        {/* Diagonal gloss reflection sheen */}
        <div className="pointer-events-none absolute -inset-full top-0 block -rotate-45 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-60 transition-opacity duration-500 group-hover:opacity-100" />

        <input
          type="checkbox"
          checked={makeLegit}
          onChange={(e) => setMakeLegit(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded accent-orange-950 cursor-pointer"
        />
        <div className="relative min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-black text-white tracking-wide">
              <span className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">☕</span>
              <span>Spill Crazy Tea</span>
            </span>
            <span className="relative overflow-hidden rounded-full bg-black/25 border border-white/30 px-2.5 py-0.5 text-[10px] font-black tracking-wider text-white shadow-xs">
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              ₹19
            </span>
          </div>
          <p className="mt-0.5 text-[11px] leading-relaxed text-orange-50 font-medium">
            Spill the real unfiltered tea. Pin your review right to the top with an exclusive Crazy Tea badge.
          </p>
        </div>
      </label>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className={cn("text-[11px]", state === "error" ? "text-red-600" : "text-zinc-500")}>{message}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsExpanded(false);
              setMessage("");
            }}
            className="inline-flex h-8 items-center rounded-lg px-2.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-200/60 hover:text-zinc-900 transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={state === "locating" || body.trim().length < 8}
            className={cn(
              "relative overflow-hidden inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-4 text-xs font-bold text-white transition-all duration-200 disabled:opacity-50 group",
              makeLegit
                ? "bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 border border-orange-300/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),0_4px_14px_rgba(249,115,22,0.4)] hover:brightness-105 active:scale-[0.98]"
                : "bg-zinc-950 border border-transparent hover:bg-zinc-800"
            )}
          >
            {makeLegit && (
              <>
                <span className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/70 to-transparent" />
                <span className="pointer-events-none absolute -inset-full top-0 block -rotate-45 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />
              </>
            )}
            <Send className="relative z-10 h-3.5 w-3.5" />
            <span className="relative z-10">{makeLegit ? "Spill Tea (₹19)" : "Publish"}</span>
          </button>
        </div>
      </div>
    </form>
  );
}

function ReviewCard({ review }: { review: NocapReview }) {
  return (
    <article
      className={cn(
        "rounded-xl border p-3.5 transition-colors",
        review.isLegit
          ? "border-orange-300/90 bg-gradient-to-br from-orange-50/60 via-amber-50/30 to-white shadow-xs"
          : "border-zinc-200 bg-white"
      )}
    >
      <div className="flex items-center gap-2">
        {review.isLegit && (
          <span className="relative overflow-hidden flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 px-2.5 py-0.5 text-[10px] font-black tracking-wide text-white border border-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_2px_6px_rgba(249,115,22,0.3)]">
            <span className="text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]">☕</span> Crazy Tea
          </span>
        )}
        <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-zinc-950 text-[10px] font-bold text-white">
          {review.profile.avatarUrl ? (
            <span aria-hidden className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${review.profile.avatarUrl})` }} />
          ) : (
            review.profile.displayName.slice(0, 1).toUpperCase()
          )}
        </span>
        <div className="min-w-0">
          <div className="truncate text-xs font-bold text-zinc-900">{review.profile.displayName}</div>
          <div className="flex items-center gap-1 text-[10px] text-zinc-500">
            <span>{timeLabel(review.updatedAt, review.id)}</span>
            {review.rating ? (
              <>
                <span>·</span>
                <span className="text-amber-600 font-bold">{"★".repeat(review.rating)}</span>
              </>
            ) : (
              <>
                <span>·</span>
                <span className="rounded bg-zinc-100 px-1 py-0.5 text-[9px] font-medium text-zinc-600">Note</span>
              </>
            )}
          </div>
        </div>
      </div>
      <p className="mt-2.5 text-sm leading-5 text-zinc-700">{review.body}</p>
    </article>
  );
}

function ProfileEditor({ profile, onClose, onSave, onSignOut }: { profile: NocapProfile; onClose: () => void; onSave: (input: { displayName: string; bio: string }) => Promise<void>; onSignOut: () => void }) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [error, setError] = useState("");
  async function save(event: React.FormEvent) {
    event.preventDefault();
    try { await onSave({ displayName, bio }); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save profile."); }
  }
  return <div className="absolute inset-0 z-30 overflow-y-auto bg-white p-5">
    <div className="flex items-center justify-between">
      <h2 className="text-base font-black">Your profile</h2>
      <button type="button" onClick={onClose} className="text-xs font-semibold text-zinc-500">Close</button>
    </div>
    <form onSubmit={save} className="mt-5 space-y-4">
      <label className="block text-xs font-bold text-zinc-700">Name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={60} className="mt-1.5 h-10 w-full rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-500" /></label>
      <label className="block text-xs font-bold text-zinc-700">About you<textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={240} className="mt-1.5 min-h-24 w-full rounded-md border border-zinc-200 p-3 text-sm outline-none focus:border-zinc-500" /></label>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <button className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-zinc-950 text-sm font-bold text-white"><Pencil className="h-3.5 w-3.5" />Save profile</button>
    </form>
    <button type="button" onClick={onSignOut} className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900"><LogOut className="h-3.5 w-3.5" />Sign out</button>
  </div>;
}

function PinPlaceForm({ location, accessToken, onCancel, onSubmit, onSignIn }: {
  location: { lat: number; lng: number };
  accessToken: string | null;
  onCancel: () => void;
  onSubmit: (input: { name: string; category: NocapPlaceCategory; customCategory?: string; address: string }) => Promise<void>;
  onSignIn?: () => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("eat");
  const [customCategory, setCustomCategory] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!accessToken) {
    return (
      <div className="fixed inset-0 z-[60] flex items-end justify-center lg:items-center">
        <div onClick={onCancel} className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 w-full max-w-md rounded-t-2xl bg-white p-6 shadow-2xl lg:rounded-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black">Pin a new place</h2>
            <button type="button" onClick={onCancel} className="grid h-7 w-7 place-items-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Coordinates: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
          </p>
          <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-center">
            <p className="text-sm font-bold text-zinc-900">Sign in with Google to pin this spot</p>
            <p className="mt-1 text-xs text-zinc-500">Sign in so other locals can discover this place and see who pinned it.</p>
            {onSignIn && (
              <button
                type="button"
                onClick={onSignIn}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-950 py-3 text-xs font-bold text-white shadow-md hover:bg-zinc-800"
              >
                <LogIn className="h-4 w-4" />
                Sign in with Google
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!accessToken) { setError("Sign in first."); return; }
    if (category === "other" && !customCategory.trim()) {
      setError("Please write a custom category name.");
      return;
    }
    setSaving(true);
    try {
      const finalCategory = (category === "other" && customCategory.trim() ? customCategory.trim() : category) as NocapPlaceCategory;
      await onSubmit({ name, category: finalCategory, customCategory: customCategory.trim(), address });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not pin place.");
      setSaving(false);
    }
  }

  return <div className="fixed inset-0 z-[60] flex items-end justify-center lg:items-center">
    <div onClick={onCancel} className="absolute inset-0 bg-black/40" />
    <div className="relative z-10 w-full max-w-md rounded-t-2xl bg-white p-6 shadow-2xl lg:rounded-2xl">
      <h2 className="text-base font-black">Pin a new place</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Coordinates: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
      </p>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <label className="block text-xs font-bold text-zinc-700">
          Place name *
          <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={80} placeholder="e.g. Blue Tokai, Rooftop Club..." className="mt-1 h-10 w-full rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-500" />
        </label>
        <label className="block text-xs font-bold text-zinc-700">
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-500">
            <option value="eat">Food &amp; drink</option>
            <option value="street">Street</option>
            <option value="park">Park</option>
            <option value="culture">Culture</option>
            <option value="other">Others (write your own)</option>
          </select>
        </label>
        {category === "other" && (
          <label className="block text-xs font-bold text-zinc-700 animate-in fade-in duration-200">
            Custom category name *
            <input
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              required
              maxLength={40}
              placeholder="e.g. Gaming Cafe, Bookstore, Rooftop, Gym..."
              className="mt-1 h-10 w-full rounded-md border border-purple-300 bg-purple-50/30 px-3 text-sm outline-none focus:border-purple-600"
            />
          </label>
        )}
        <label className="block text-xs font-bold text-zinc-700">
          Address / landmark (optional)
          <input value={address} onChange={(e) => setAddress(e.target.value)} maxLength={160} placeholder="e.g. 100 Ft Rd, Indiranagar" className="mt-1 h-10 w-full rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-500" />
        </label>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onCancel} className="flex-1 rounded-md border border-zinc-200 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">Cancel</button>
          <button disabled={saving || name.trim().length < 2} className="flex flex-1 items-center justify-center gap-2 rounded-md bg-zinc-950 py-2.5 text-sm font-bold text-white disabled:opacity-50">
            <Pin className="h-4 w-4" />{saving ? "Pinning\u2026" : "Pin this place"}
          </button>
        </div>
      </form>
    </div>
  </div>;
}

function currentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser."));
      return;
    }

    let settled = false;

    // Fast attempt: allow cached location up to 5 minutes old with network/wifi fallback
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!settled) {
          settled = true;
          resolve(pos);
        }
      },
      (fastErr) => {
        console.warn("[NoCap] Fast cached geolocation failed:", fastErr.code, fastErr.message);
        if (fastErr.code === 1) {
          settled = true;
          reject(new Error("PERMISSION_DENIED: Location permission was blocked."));
          return;
        }

        // Retry with high accuracy
        navigator.geolocation.getCurrentPosition(
          (freshPos) => {
            if (!settled) {
              settled = true;
              resolve(freshPos);
            }
          },
          (freshErr) => {
            if (!settled) {
              settled = true;
              if (freshErr.code === 1) reject(new Error("PERMISSION_DENIED: Location permission was blocked."));
              else if (freshErr.code === 2) reject(new Error("POSITION_UNAVAILABLE: Your device could not determine its location. Please turn on device GPS."));
              else reject(new Error("TIMEOUT: Location request timed out. Please check GPS and try again."));
            }
          },
          { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
        );
      },
      { enableHighAccuracy: false, timeout: 5_000, maximumAge: 300_000 }
    );
  });
}

function PlaceListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }, (_, index) => (
        <div
          key={index}
          className="flex items-start gap-3 rounded-xl border border-zinc-200/90 bg-white p-3 shadow-xs"
        >
          {/* Avatar icon skeleton - dark zinc with high visibility shimmer */}
          <div className="h-8 w-8 shrink-0 rounded-full bg-zinc-300 skeleton-shimmer" />
          {/* Text lines */}
          <div className="min-w-0 flex-1 space-y-2 pt-0.5">
            <div className="h-3.5 w-3/4 rounded-md bg-zinc-300 skeleton-shimmer" />
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2/5 rounded-md bg-zinc-300 skeleton-shimmer" />
              <div className="h-2.5 w-1/4 rounded-md bg-zinc-200 skeleton-shimmer" />
            </div>
          </div>
          <div className="h-4 w-7 rounded-full bg-zinc-200 skeleton-shimmer" />
        </div>
      ))}
    </div>
  );
}

function EvidenceSkeleton() {
  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2 px-1 text-xs font-bold text-zinc-700">
        <span className="inline-block h-2 w-2 rounded-full bg-zinc-800 animate-pulse" />
        Loading verified reviews & takes...
      </div>
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={index}
          className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-xs space-y-3"
        >
          {/* Reviewer header */}
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 shrink-0 rounded-full bg-zinc-400 skeleton-shimmer" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="h-3.5 w-1/3 rounded-md bg-zinc-400 skeleton-shimmer" />
              <div className="h-2.5 w-1/4 rounded-md bg-zinc-300 skeleton-shimmer" />
            </div>
            <div className="h-4 w-16 rounded-md bg-zinc-300 skeleton-shimmer" />
          </div>
          {/* Review body paragraph lines */}
          <div className="space-y-2 pt-1">
            <div className="h-3.5 w-full rounded-md bg-zinc-300 skeleton-shimmer" />
            <div className="h-3.5 w-11/12 rounded-md bg-zinc-300 skeleton-shimmer" />
            <div className="h-3.5 w-3/5 rounded-md bg-zinc-200 skeleton-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}
