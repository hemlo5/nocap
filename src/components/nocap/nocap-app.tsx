"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ChevronDown, CircleUserRound, LocateFixed, LogIn, LogOut, MapPin, Pencil, Pin, Search, Send, Star, X, Sparkles } from "lucide-react";
import type { NocapPlace, NocapPlaceCategory } from "@/lib/nocap/places";
import type { NocapProfile, NocapReview, NocapUserPlace } from "@/lib/nocap/community";
import { createSupabaseBrowserClient, hasSupabaseBrowserConfig } from "@/lib/supabase/client";
import { NocapMap, type NocapMapHandle } from "./nocap-map";
import { cn } from "@/lib/utils/cn";

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

function timeLabel(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
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

  // Check URL query parameters (e.g. ?place=... or ?legit=success)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("legit") === "success") {
      setLegitSuccess(true);
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
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setAccessToken(data.session?.access_token ?? null);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
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
    await createSupabaseBrowserClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback?next=/map` } });
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
    const position = await currentPosition();
    const pid = input.placeId ?? selectedPlace?.id;
    const upid = input.userPlaceId ?? selectedUserPlace?.id;
    if (!pid && !upid) throw new Error("No place selected.");
    const response = await fetch("/api/nocap/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        placeId: pid,
        userPlaceId: upid,
        body: input.body,
        rating: input.rating,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters: position.coords.accuracy,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Could not publish review.");
    setReviews((current) => [data.review, ...current.filter((review) => review.id !== data.review.id)]);

    // If user wants Legit badge, kick off Dodo checkout
    if (input.makeLegit && data.review?.id) {
      const checkoutRes = await fetch("/api/nocap/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ reviewId: data.review.id, origin: window.location.origin }),
      });
      const checkoutData = await checkoutRes.json();
      if (checkoutData.checkoutUrl) {
        window.location.href = checkoutData.checkoutUrl;
        return;
      }
      throw new Error(checkoutData.error ?? "Could not create Legit checkout.");
    }
  }

  // ── "Write a NoCap" button handler ──────────────────────────────────────
  async function handleWriteNoCap() {
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
    setLocationError(null);
    if (userLocation) {
      mapRef.current?.flyToUser(userLocation.lat, userLocation.lng, 16.5);
    }
    setLocatingUser(true);
    try {
      const position = await currentPosition();
      const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
      setUserLocation(loc);
      mapRef.current?.flyToUser(loc.lat, loc.lng, 16.5);
    } catch (err: any) {
      console.error("[NoCap] Location error in locate me:", err);
      if (!userLocation) {
        setLocationError(
          err?.message?.includes("PERMISSION_DENIED")
            ? "Location access was blocked. Please enable location permissions in your browser to zoom to your place."
            : "Unable to find your location. Please check your GPS and try again."
        );
      }
    } finally {
      setLocatingUser(false);
    }
  }

  function dismissLocate() {
    setLocateState("idle");
    setNearbyPlaces([]);
    mapRef.current?.hideRadiusCircle();
  }

  function enterPinMode() {
    setPinMode(true);
    mapRef.current?.enterPinMode();
    dismissLocate();
  }

  function exitPinMode() {
    setPinMode(false);
    mapRef.current?.exitPinMode();
    setPendingPin(null);
    setPinFormOpen(false);
  }

  function handlePinDrop(lat: number, lng: number) {
    if (userLocation && haversineM(userLocation.lat, userLocation.lng, lat, lng) > 1000) return;
    setPendingPin({ lat, lng });
    setPinFormOpen(true);
  }

  async function submitPin(input: { name: string; category: NocapPlaceCategory; customCategory?: string; address: string }) {
    if (!accessToken) throw new Error("Sign in first.");
    if (!pendingPin) throw new Error("No pin location.");
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

    {/* Legit success banner in dark purple theme */}
    {legitSuccess && (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2.5 rounded-full bg-gradient-to-r from-[#1b082e] via-[#290d47] to-[#140424] border border-purple-500/50 px-5 py-2.5 text-xs font-bold text-purple-100 shadow-xl shadow-purple-950/50">
        <Sparkles className="h-4 w-4 text-amber-300" />
        <span>Your Legit review is live at the top!</span>
        <button type="button" onClick={() => setLegitSuccess(false)} className="ml-1 text-purple-300 hover:text-white">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )}

    {/* ── MOBILE LAYOUT (below lg) ── */}
    <div className="relative h-full lg:hidden">
      {/* Full-screen map */}
      <NocapMap
        ref={mapRef}
        places={visiblePlaces}
        reviews={reviews}
        userPlaces={userPlaces}
        selectedPlaceId={selectedPlaceId ?? selectedUserPlaceId}
        onSelectPlace={(id) => { setSelectedPlaceId(id); setSelectedUserPlaceId(null); dismissLocate(); exitPinMode(); }}
        onSelectUserPlace={(id) => { setSelectedUserPlaceId(id); setSelectedPlaceId(null); dismissLocate(); exitPinMode(); }}
        userLocation={userLocation}
        onPinDrop={handlePinDrop}
      />

      {/* Floating search bar at top */}
      {!pinMode && (
        <div className="absolute left-3 right-3 top-3 z-20">
          <div className="flex items-center gap-2 rounded-xl bg-white/95 backdrop-blur border border-zinc-200/80 shadow-lg px-3 h-12">
            <img src="/nocap-icon.png" alt="NoCap" className="h-7 w-7 shrink-0 rounded-lg object-contain shadow-xs" />
            <Search className="h-4 w-4 shrink-0 text-zinc-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search places" className="min-w-0 flex-1 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400" />
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

      {/* Pin mode overlay banner */}
      {pinMode && (
        <div className="absolute left-3 right-3 top-3 z-20 flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-3 shadow-lg">
          <Pin className="h-4 w-4 text-white" />
          <span className="flex-1 text-sm font-bold text-white">Tap anywhere within the blue circle to pin a place</span>
          <button type="button" onClick={exitPinMode} className="grid h-7 w-7 place-items-center rounded-full bg-white/20 text-white hover:bg-white/30"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Locate me button */}
      <button
        type="button"
        onClick={handleLocateMe}
        disabled={locatingUser}
        className="absolute bottom-[8.5rem] right-3 z-20 grid h-11 w-11 place-items-center rounded-full border border-zinc-200/80 bg-white/95 backdrop-blur shadow-lg active:scale-95 transition-all"
        title="Zoom to my location"
      >
        <LocateFixed className={cn("h-5 w-5 text-zinc-700", locatingUser && "animate-spin text-blue-600")} />
      </button>

      {/* Write a NoCap FAB */}
      {!pinMode && (
        <button type="button" onClick={handleWriteNoCap} className={cn("absolute bottom-16 right-3 z-20 flex h-12 items-center gap-2 rounded-full bg-zinc-950 pl-4 pr-5 text-sm font-bold text-white shadow-lg transition-all", locateState === "locating" && "animate-pulse")}>
          <Pencil className="h-4 w-4" />
          {locateState === "locating" ? "Locating\u2026" : locateState === "located" ? "Pick nearby" : locateState === "denied" ? "Retry" : "Write a NoCap"}
        </button>
      )}

      {/* Location error overlay */}
      {locationError && (
        <div className="absolute bottom-36 left-3 right-16 z-20 max-w-sm rounded-xl border border-red-200 bg-red-50 p-4 shadow-lg">
          <p className="text-sm font-bold text-red-900">Location access needed</p>
          <p className="mt-1 text-xs leading-5 text-red-700">{locationError}</p>
          <button type="button" onClick={() => { setLocationError(null); setLocateState("idle"); }} className="mt-3 text-xs font-semibold text-red-500 hover:text-red-900">Dismiss</button>
        </div>
      )}

      {/* Nearby places overlay when located */}
      {locateState === "located" && (
        <div className="absolute bottom-36 left-3 right-16 z-20 max-w-sm rounded-xl border border-zinc-200 bg-white p-3 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-900">{nearbyPlaces.length} place{nearbyPlaces.length !== 1 ? "s" : ""} within 1 km</span>
            <button type="button" onClick={dismissLocate} className="text-[10px] font-semibold text-zinc-500 hover:text-zinc-900">Close</button>
          </div>
          {nearbyPlaces.length > 0 && (
            <div className="max-h-40 space-y-1 overflow-y-auto mb-2">
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
          <button type="button" onClick={enterPinMode} className="flex w-full items-center gap-2 rounded-md border border-dashed border-amber-400 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100">
            <Pin className="h-3.5 w-3.5" /> Pin a new place on the map
          </button>
        </div>
      )}

      {/* BOTTOM SHEET */}
      {hasSelection && (
        <>
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
        </>
      )}

      {/* Profile editor on mobile */}
      {profileOpen && profile && <ProfileEditor profile={profile} onClose={() => setProfileOpen(false)} onSave={saveProfile} onSignOut={signOut} />}
    </div>

    {/* ── DESKTOP LAYOUT (lg and above) ── */}
    <div className="hidden h-full lg:grid lg:grid-cols-[330px_minmax(0,1fr)_380px]">
      {/* Left sidebar */}
      <aside className="z-20 flex min-h-0 flex-col border-b border-zinc-200 bg-white lg:border-b-0 lg:border-r">
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
          <p className="mt-3 text-[11px] font-medium text-zinc-500">{visiblePlaces.length + visibleUserPlaces.length} places · {reviews.length} local reviews</p>
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

      {/* Center: Map */}
      <section className="relative min-h-0">
        <NocapMap
          ref={mapRef}
          places={visiblePlaces}
          reviews={reviews}
          userPlaces={userPlaces}
          selectedPlaceId={selectedPlaceId ?? selectedUserPlaceId}
          onSelectPlace={(id) => { setSelectedPlaceId(id); setSelectedUserPlaceId(null); dismissLocate(); exitPinMode(); }}
          onSelectUserPlace={(id) => { setSelectedUserPlaceId(id); setSelectedPlaceId(null); dismissLocate(); exitPinMode(); }}
          userLocation={userLocation}
          onPinDrop={handlePinDrop}
        />

        {/* Pin mode banner */}
        {pinMode && (
          <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2 flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 shadow-lg">
            <Pin className="h-4 w-4 text-white" />
            <span className="text-sm font-bold text-white">Click within the blue circle to pin a place</span>
            <button type="button" onClick={exitPinMode} className="ml-1 grid h-6 w-6 place-items-center rounded-full bg-white/20 text-white hover:bg-white/30"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}

        <button
          type="button"
          onClick={handleLocateMe}
          disabled={locatingUser}
          className="nocap-locate-btn"
          title="Zoom to my location"
        >
          <LocateFixed className={cn(locatingUser && "animate-spin text-blue-600")} />
        </button>

        {!pinMode && (
          <button type="button" onClick={handleWriteNoCap} className={cn("nocap-fab", locateState === "locating" && "nocap-fab--locating")}>
            <Pencil />
            {locateState === "locating" ? "Locating\u2026" : locateState === "located" ? "Pick a place nearby" : locateState === "denied" ? "Retry location" : "Write a NoCap"}
          </button>
        )}

        {locationError && (
          <div className="absolute bottom-20 left-3 right-16 z-20 max-w-sm rounded-xl border border-red-200 bg-red-50 p-4 shadow-lg sm:left-auto sm:right-20">
            <p className="text-sm font-bold text-red-900">Location access needed</p>
            <p className="mt-1 text-xs leading-5 text-red-700">{locationError}</p>
            <button type="button" onClick={() => { setLocationError(null); setLocateState("idle"); }} className="mt-3 text-xs font-semibold text-red-500 hover:text-red-900">Dismiss</button>
          </div>
        )}

        {locateState === "located" && (
          <div className="absolute bottom-20 left-3 right-16 z-20 max-w-sm rounded-xl border border-zinc-200 bg-white p-3 shadow-lg sm:left-auto sm:right-20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-zinc-900">{nearbyPlaces.length} place{nearbyPlaces.length !== 1 ? "s" : ""} within 1 km</span>
              <button type="button" onClick={dismissLocate} className="text-[10px] font-semibold text-zinc-500 hover:text-zinc-900">Close</button>
            </div>
            {nearbyPlaces.length > 0 && (
              <div className="mb-2 max-h-48 space-y-1 overflow-y-auto">
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
            <button type="button" onClick={enterPinMode} className="flex w-full items-center gap-2 rounded-md border border-dashed border-amber-400 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100">
              <Pin className="h-3.5 w-3.5" /> Pin a new place on the map
            </button>
          </div>
        )}
      </section>

      {/* Right: Detail panel */}
      <aside className="relative z-20 min-h-0 border-t border-zinc-200 bg-white lg:border-l lg:border-t-0">
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
      />
    )}
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
      <ReviewComposer configured={configured} signedIn={signedIn} onSignIn={onSignIn} onPublish={(input) => onPublish({ ...input, placeId: place.id })} />
      {detail === null ? <EvidenceSkeleton /> : reviews.length ? <div className="mt-4 space-y-3">{reviews.map((review) => <ReviewCard key={review.id} review={review} />)}</div> : <div className="mt-4 rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-5"><CircleUserRound className="h-5 w-5 text-zinc-400" /><h2 className="mt-3 text-sm font-bold">No local reviews here yet.</h2><p className="mt-1 text-xs leading-5 text-zinc-500">You can only post while you are at this place. That keeps the map grounded in firsthand experiences.</p></div>}
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
      <ReviewComposer configured={configured} signedIn={signedIn} onSignIn={onSignIn} onPublish={(input) => onPublish({ ...input, userPlaceId: place.id })} />
      {detail === null ? <EvidenceSkeleton /> : reviews.length ? <div className="mt-4 space-y-3">{reviews.map((review) => <ReviewCard key={review.id} review={review} />)}</div> : <div className="mt-4 rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-5"><CircleUserRound className="h-5 w-5 text-zinc-400" /><h2 className="mt-3 text-sm font-bold">No reviews yet.</h2><p className="mt-1 text-xs leading-5 text-zinc-500">Be the first to drop a NoCap here.</p></div>}
    </div>
  </div>;
}

function ReviewComposer({ configured, signedIn, onSignIn, onPublish }: {
  configured: boolean; signedIn: boolean; onSignIn: () => void;
  onPublish: (input: { body: string; rating: number | null; makeLegit?: boolean }) => Promise<void>;
}) {
  const [body, setBody] = useState("");
  const [rating, setRating] = useState<number | null>(5);
  const [makeLegit, setMakeLegit] = useState(false);
  const [state, setState] = useState<"idle" | "locating" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setState("locating");
    setMessage(makeLegit ? "Getting location & setting up checkout\u2026" : "Checking your current location\u2026");
    try {
      await onPublish({ body, rating, makeLegit });
      setBody("");
      setState("idle");
      setMessage(makeLegit ? "" : "Published at your current location.");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Could not publish review.");
    }
  }

  if (!configured) return <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">Community reviews activate once Supabase is configured.</div>;
  if (!signedIn) return <button type="button" onClick={onSignIn} className="flex w-full items-center justify-between rounded-md border border-zinc-200 bg-zinc-50 px-3 py-3 text-left text-xs font-semibold text-zinc-800 hover:bg-zinc-100"><span>Sign in with Google to write a local review</span><LogIn className="h-4 w-4" /></button>;

  return <form onSubmit={submit} className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3.5">
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold text-zinc-800">Share from here</span>
      <span className="flex items-center gap-1 text-[10px] font-semibold text-zinc-500"><LocateFixed className="h-3 w-3" />Current location required</span>
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
      placeholder={rating ? "What was it actually like?" : "Share a quick tip, note, or vibe about this place..."}
      className="mt-2.5 min-h-20 w-full resize-y rounded-lg border border-zinc-200 bg-white p-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-500"
    />

    {/* Premium Dark Purple Legit Option */}
    <label className="mt-3 relative flex cursor-pointer items-start gap-3 overflow-hidden rounded-xl border border-purple-500/40 bg-gradient-to-br from-[#1a082e] via-[#280d46] to-[#130423] p-3 shadow-lg shadow-purple-950/20 transition-all hover:border-purple-400/60 group">
      <input
        type="checkbox"
        checked={makeLegit}
        onChange={(e) => setMakeLegit(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded accent-purple-500 focus:ring-purple-500 cursor-pointer"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs font-black text-white tracking-wide">
            <span className="text-amber-300">★</span>
            <span>Make it Legit</span>
          </span>
          <span className="rounded-full bg-purple-500/30 border border-purple-400/40 px-2 py-0.5 text-[10px] font-black tracking-wider text-purple-200 shadow-xs">
            ₹39
          </span>
        </div>
        <p className="mt-0.5 text-[11px] leading-relaxed text-purple-200/80">
          Pin your review right to the top with an exclusive luxury purple badge.
        </p>
      </div>
    </label>

    <div className="mt-3 flex items-center justify-between gap-3">
      <span className={cn("text-[11px]", state === "error" ? "text-red-600" : "text-zinc-500")}>{message}</span>
      <button
        disabled={state === "locating" || body.trim().length < 8}
        className={cn(
          "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-xs font-bold transition-all disabled:opacity-50",
          makeLegit
            ? "bg-gradient-to-r from-purple-700 via-violet-700 to-indigo-700 text-white shadow-md shadow-purple-900/30 hover:brightness-110"
            : "bg-zinc-950 text-white hover:bg-zinc-800"
        )}
      >
        <Send className="h-3.5 w-3.5" />
        {makeLegit ? "Publish + Pay ₹39" : "Publish"}
      </button>
    </div>
  </form>;
}

function ReviewCard({ review }: { review: NocapReview }) {
  return (
    <article
      className={cn(
        "rounded-xl border p-3.5 transition-colors",
        review.isLegit
          ? "border-purple-300/80 bg-gradient-to-br from-purple-50/70 via-white to-violet-50/50 shadow-xs"
          : "border-zinc-200 bg-white"
      )}
    >
      <div className="flex items-center gap-2">
        {review.isLegit && (
          <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-950 via-purple-900 to-indigo-950 px-2.5 py-0.5 text-[10px] font-black tracking-wide text-purple-100 border border-purple-500/40 shadow-xs">
            <span className="text-amber-300">★</span> Legit
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
            <span>{timeLabel(review.updatedAt)}</span>
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

function PinPlaceForm({ location, accessToken, onCancel, onSubmit }: {
  location: { lat: number; lng: number };
  accessToken: string | null;
  onCancel: () => void;
  onSubmit: (input: { name: string; category: NocapPlaceCategory; customCategory?: string; address: string }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("eat");
  const [customCategory, setCustomCategory] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

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
    if (!navigator.geolocation) { reject(new Error("Geolocation API not available in this browser.")); return; }
    navigator.geolocation.getCurrentPosition(resolve, (err) => {
      console.warn("[NoCap] High-accuracy attempt failed:", err.code, err.message);
      if (err.code === 1) {
        reject(new Error("PERMISSION_DENIED: Location access is blocked. Click the lock icon in the address bar, set Location to Allow, and reload."));
      } else {
        console.log("[NoCap] Retrying with enableHighAccuracy=false...");
        navigator.geolocation.getCurrentPosition(resolve, (err2) => {
          console.error("[NoCap] Fallback also failed:", err2.code, err2.message);
          if (err2.code === 1) reject(new Error("PERMISSION_DENIED: Location access is blocked."));
          else if (err2.code === 2) reject(new Error("POSITION_UNAVAILABLE: Your device could not determine its location."));
          else reject(new Error("TIMEOUT: Location request timed out. Try again."));
        }, { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 });
      }
    }, { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 });
  });
}

function PlaceListSkeleton() { return <div className="space-y-2">{Array.from({ length: 8 }, (_, index) => <div key={index} className="h-14 animate-pulse rounded-md bg-zinc-100" />)}</div>; }
function EvidenceSkeleton() { return <div className="mt-4 space-y-3">{Array.from({ length: 2 }, (_, index) => <div key={index} className="h-24 animate-pulse rounded-md bg-zinc-100" />)}</div>; }
