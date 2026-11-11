"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Camera, ChevronDown, CircleUserRound, HelpCircle, Loader2, LocateFixed, LogIn, LogOut, MapPin, Navigation, Pencil, Pin, Search, Send, Star, X, Sparkles, ZoomIn } from "lucide-react";
import type { NocapPlace, NocapPlaceCategory } from "@/lib/nocap/places";
import type { NocapPersonNote, NocapProfile, NocapReview, NocapUserPlace } from "@/lib/nocap/community";
import { uploadImageFile } from "@/lib/nocap/image-helper";
import { createSupabaseBrowserClient, hasSupabaseBrowserConfig } from "@/lib/supabase/client";
import { NocapMap, type NocapMapHandle, type SuggestedMapPlace } from "./nocap-map";
import { NocapGuideModal } from "./nocap-guide-modal";
import { cn } from "@/lib/utils/cn";
import { trackEvent } from "@/lib/analytics/gtag";

type PlaceDetail = { place: NocapPlace; reviews: NocapReview[]; personNotes?: NocapPersonNote[]; status: "ready"; supabaseConfigured: boolean };

type UserPlaceDetail = { place: NocapUserPlace; reviews: NocapReview[]; personNotes?: NocapPersonNote[]; supabaseConfigured: boolean };

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

// Feature flag: set to true to re-enable paid Crazy Tea (Dodo Payments / UPI).
// Kept unplugged (false) to make all review sharing completely free in production.
const ENABLE_PAID_CRAZY_TEA = process.env.NEXT_PUBLIC_ENABLE_PAID_CRAZY_TEA === "true";

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

const USER_LOCATION_STORAGE_KEY = "nocap_user_location";
const USER_LOCATION_TTL_MS = 12 * 60 * 60 * 1000;
const AREA_EXPLORE_ZOOM = 13.8;
const AREA_RADIUS_M = 3_000;
const SUGGESTION_MAX_EXISTING_DOTS = 10;

function isBengaluruCoord(lat: number, lng: number) {
  return lat >= 12.72 && lat <= 13.3 && lng >= 77.34 && lng <= 77.9;
}

function formatDistance(meters: number) {
  return meters < 1000 ? `${Math.round(meters)}m` : `${(meters / 1000).toFixed(1)}km`;
}

function normalizeSpotName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function readSavedUserLocation(): { lat: number; lng: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_LOCATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { lat?: unknown; lng?: unknown; updatedAt?: unknown };
    if (
      typeof parsed.lat !== "number" ||
      typeof parsed.lng !== "number" ||
      !Number.isFinite(parsed.lat) ||
      !Number.isFinite(parsed.lng) ||
      parsed.lat < -90 ||
      parsed.lat > 90 ||
      parsed.lng < -180 ||
      parsed.lng > 180 ||
      typeof parsed.updatedAt !== "number" ||
      Date.now() - parsed.updatedAt > USER_LOCATION_TTL_MS
    ) {
      return null;
    }
    return { lat: parsed.lat, lng: parsed.lng };
  } catch {
    return null;
  }
}

function saveUserLocation(loc: { lat: number; lng: number }) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      USER_LOCATION_STORAGE_KEY,
      JSON.stringify({ lat: loc.lat, lng: loc.lng, updatedAt: Date.now() })
    );
  } catch {}
}

async function getGeolocationPermissionState(): Promise<"granted" | "prompt" | "denied" | "unknown"> {
  if (typeof window === "undefined" || !navigator.permissions?.query) return "unknown";
  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    if (status.state === "granted" || status.state === "prompt" || status.state === "denied") {
      return status.state;
    }
    return "unknown";
  } catch {
    return "unknown";
  }
}

export function NocapApp() {
  const mapRef = useRef<NocapMapHandle>(null);
  const [places, setPlaces] = useState<NocapPlace[]>([]);
  const [userPlaces, setUserPlaces] = useState<NocapUserPlace[]>([]);
  const [reviews, setReviews] = useState<NocapReview[]>([]);
  const [personNotes, setPersonNotes] = useState<NocapPersonNote[]>([]);
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
  const [entryLocateStatus, setEntryLocateStatus] = useState<"idle" | "asking" | "grabbed" | "needs_tap" | "dismissed">("idle");
  const [entryBannerVisible, setEntryBannerVisible] = useState(false);
  const userCameraMovedRef = useRef(false);
  const wasGuideOpenRef = useRef(false);
  // Pin-drop states
  const [pinMode, setPinMode] = useState(false);
  const [pendingPin, setPendingPin] = useState<{ lat: number; lng: number } | null>(null);
  const [pinFormOpen, setPinFormOpen] = useState(false);
  const [pinPrefill, setPinPrefill] = useState<{ name: string; address: string; category?: NocapPlaceCategory } | null>(null);
  // Search autocomplete & map suggestions states
  const [searchFocused, setSearchFocused] = useState(false);
  const [mapSuggestions, setMapSuggestions] = useState<Array<{ id: string; title: string; subtitle: string; lat: number; lng: number; category?: NocapPlaceCategory }>>([]);
  const [loadingMapSuggestions, setLoadingMapSuggestions] = useState(false);
  // Searched area anchor & auto nearby suggested dots when existing dots within 3 km <= 10
  const [searchAnchor, setSearchAnchor] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [focusedSuggestion, setFocusedSuggestion] = useState<SuggestedMapPlace | null>(null);
  const [nearbySuggestionsRaw, setNearbySuggestionsRaw] = useState<SuggestedMapPlace[]>([]);
  const [loadingNearbySuggestions, setLoadingNearbySuggestions] = useState(false);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
  const [selectedSuggestionPlace, setSelectedSuggestionPlace] = useState<SuggestedMapPlace | null>(null);
  const [suggestionHostAnchor, setSuggestionHostAnchor] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const suggestionOriginRef = useRef<{ lat: number; lng: number } | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mobileSearchContainerRef = useRef<HTMLDivElement>(null);
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

  // Ask for location on entry if not cached, then center map on user's area to show nearby dots
  useEffect(() => {
    let cancelled = false;

    async function initEntryLocation() {
      const params = new URLSearchParams(window.location.search);
      const hasDeepPlace = Boolean(params.get("place"));
      const saved = readSavedUserLocation();

      if (saved) {
        setUserLocation(saved);
        if (!hasDeepPlace && !userCameraMovedRef.current) {
          mapRef.current?.flyToUser(saved.lat, saved.lng, AREA_EXPLORE_ZOOM);
          setEntryLocateStatus("grabbed");
          setEntryBannerVisible(true);
        }

        const perm = await getGeolocationPermissionState();
        if (cancelled || perm !== "granted") return;
        try {
          const pos = await currentPosition();
          if (cancelled) return;
          const fresh = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          saveUserLocation(fresh);
          setUserLocation(fresh);
          if (
            !hasDeepPlace &&
            !userCameraMovedRef.current &&
            haversineM(saved.lat, saved.lng, fresh.lat, fresh.lng) > 250
          ) {
            mapRef.current?.flyToUser(fresh.lat, fresh.lng, AREA_EXPLORE_ZOOM);
          }
        } catch {
          // Keep saved location if silent background refresh fails
        }
        return;
      }

      const perm = await getGeolocationPermissionState();
      if (cancelled || perm === "denied") return;
      if (hasDeepPlace && perm !== "granted") return;

      setEntryLocateStatus("asking");
      setEntryBannerVisible(true);

      try {
        const pos = await currentPosition();
        if (cancelled) return;
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        saveUserLocation(loc);
        setUserLocation(loc);
        setEntryLocateStatus("grabbed");
        setEntryBannerVisible(true);
        trackEvent("entry_locate_success", { permission: perm });
        if (!hasDeepPlace && !userCameraMovedRef.current) {
          mapRef.current?.flyToUser(loc.lat, loc.lng, AREA_EXPLORE_ZOOM);
        }
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("PERMISSION_DENIED")) {
          setEntryLocateStatus("dismissed");
          setEntryBannerVisible(false);
        } else {
          // Mobile/WebView may require an explicit tap for geolocation prompt
          setEntryLocateStatus("needs_tap");
          setEntryBannerVisible(true);
        }
      }
    }

    initEntryLocation();
    return () => {
      cancelled = true;
    };
  }, []);

  // When first-time guide closes after location was grabbed underneath, glide smoothly to user's area
  useEffect(() => {
    if (guideOpen) {
      wasGuideOpenRef.current = true;
      return;
    }
    if (wasGuideOpenRef.current) {
      wasGuideOpenRef.current = false;
      if (userLocation && !selectedPlaceId && !selectedUserPlaceId && !userCameraMovedRef.current) {
        mapRef.current?.flyToUser(userLocation.lat, userLocation.lng, AREA_EXPLORE_ZOOM);
      }
    }
  }, [guideOpen, userLocation, selectedPlaceId, selectedUserPlaceId]);

  // Auto-hide entry status pill shortly after places finish loading and guide is dismissed (keep pinned while exploring a searched area)
  useEffect(() => {
    if (searchAnchor || !entryBannerVisible || entryLocateStatus !== "grabbed" || loading || guideOpen) return;
    const timeoutMs = userLocation && !isBengaluruCoord(userLocation.lat, userLocation.lng) ? 9000 : 5500;
    const timer = setTimeout(() => setEntryBannerVisible(false), timeoutMs);
    return () => clearTimeout(timer);
  }, [searchAnchor, entryBannerVisible, entryLocateStatus, loading, guideOpen, userLocation]);

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
      if (Array.isArray(data.personNotes)) setPersonNotes(data.personNotes);
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
  }, [selectedPlaceId, reviews, personNotes]);

  // Fetch user-place detail
  useEffect(() => {
    if (!selectedUserPlaceId) { setUserPlaceDetail(null); return; }
    let cancelled = false;
    fetch(`/api/nocap/user-places?id=${selectedUserPlaceId}`).then((r) => r.json()).then((data) => {
      if (!cancelled) setUserPlaceDetail(data);
    }).catch(() => !cancelled && setUserPlaceDetail(null));
    return () => { cancelled = true; };
  }, [selectedUserPlaceId, reviews, personNotes]);

  const activeAreaCenter = useMemo(
    () =>
      searchAnchor
        ? { lat: searchAnchor.lat, lng: searchAnchor.lng, label: searchAnchor.label, isSearch: true as const }
        : userLocation
          ? { lat: userLocation.lat, lng: userLocation.lng, label: "Your area", isSearch: false as const }
          : null,
    [searchAnchor, userLocation]
  );

  const visiblePlaces = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = places.filter((place) => {
      const categoryMatch =
        category === "all"
          ? true
          : category === "other"
          ? !["eat", "street", "park", "culture"].includes(place.category) || place.category === "other"
          : place.category === category;
      const queryMatch = !normalized || [place.name, place.area, place.address, ...place.aliases].join(" ").toLowerCase().includes(normalized);
      return categoryMatch && queryMatch;
    });
    if (!activeAreaCenter) return filtered;
    return [...filtered].sort(
      (a, b) =>
        haversineM(activeAreaCenter.lat, activeAreaCenter.lng, a.latitude, a.longitude) -
        haversineM(activeAreaCenter.lat, activeAreaCenter.lng, b.latitude, b.longitude)
    );
  }, [category, places, query, activeAreaCenter]);

  const visibleUserPlaces = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = userPlaces.filter((up) => {
      const categoryMatch =
        category === "all"
          ? true
          : category === "other"
          ? !["eat", "street", "park", "culture"].includes(up.category) || up.category === "other"
          : up.category === category;
      const queryMatch = !normalized || [up.name, up.address, up.category].join(" ").toLowerCase().includes(normalized);
      return categoryMatch && queryMatch;
    });
    if (!activeAreaCenter) return filtered;
    return [...filtered].sort(
      (a, b) =>
        haversineM(activeAreaCenter.lat, activeAreaCenter.lng, a.latitude, a.longitude) -
        haversineM(activeAreaCenter.lat, activeAreaCenter.lng, b.latitude, b.longitude)
    );
  }, [category, query, userPlaces, activeAreaCenter]);

  const selectedPlace = places.find((place) => place.id === selectedPlaceId) ?? null;
  const selectedUserPlace = userPlaces.find((up) => up.id === selectedUserPlaceId) ?? null;

  const suggestionAnchor = useMemo(() => {
    if (selectedPlace) {
      return { lat: selectedPlace.latitude, lng: selectedPlace.longitude, label: selectedPlace.name };
    }
    if (selectedUserPlace) {
      return { lat: selectedUserPlace.latitude, lng: selectedUserPlace.longitude, label: selectedUserPlace.name };
    }
    if (suggestionHostAnchor) {
      return suggestionHostAnchor;
    }
    return activeAreaCenter;
  }, [selectedPlace, selectedUserPlace, suggestionHostAnchor, activeAreaCenter]);

  const areaNearbyCount = useMemo(() => {
    if (!suggestionAnchor) return 0;
    let count = 0;
    for (const p of places) {
      if (haversineM(suggestionAnchor.lat, suggestionAnchor.lng, p.latitude, p.longitude) <= AREA_RADIUS_M) count++;
    }
    for (const up of userPlaces) {
      if (haversineM(suggestionAnchor.lat, suggestionAnchor.lng, up.latitude, up.longitude) <= AREA_RADIUS_M) count++;
    }
    return count;
  }, [places, userPlaces, suggestionAnchor]);

  // If dots within 3 km of selected spot / searched place / user location <= 10, load closest nearby map suggestions
  useEffect(() => {
    if (loading || !suggestionAnchor) return;

    if (areaNearbyCount > SUGGESTION_MAX_EXISTING_DOTS) {
      setNearbySuggestionsRaw([]);
      setLoadingNearbySuggestions(false);
      suggestionOriginRef.current = null;
      return;
    }

    const lastOrigin = suggestionOriginRef.current;
    if (lastOrigin && haversineM(lastOrigin.lat, lastOrigin.lng, suggestionAnchor.lat, suggestionAnchor.lng) < 350) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setLoadingNearbySuggestions(true);

    fetch(
      `/api/nocap/search-locations?lat=${encodeURIComponent(String(suggestionAnchor.lat))}&lng=${encodeURIComponent(String(suggestionAnchor.lng))}&limit=75`,
      { signal: controller.signal }
    )
      .then((res) => (res.ok ? res.json() : { results: [] }))
      .then((data) => {
        if (cancelled) return;
        const rows = Array.isArray(data?.results) ? (data.results as SuggestedMapPlace[]) : [];
        suggestionOriginRef.current = rows.length > 0 ? { lat: suggestionAnchor.lat, lng: suggestionAnchor.lng } : null;
        setNearbySuggestionsRaw(rows);
      })
      .catch((err: unknown) => {
        if ((err as Error)?.name !== "AbortError" && !cancelled) {
          setNearbySuggestionsRaw([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingNearbySuggestions(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [loading, suggestionAnchor, areaNearbyCount]);

  const activeSelectedSuggestion =
    selectedSuggestionPlace && selectedSuggestionPlace.id === selectedSuggestionId
      ? selectedSuggestionPlace
      : focusedSuggestion && focusedSuggestion.id === selectedSuggestionId
        ? focusedSuggestion
        : null;

  const visibleSuggestedDots = useMemo(() => {
    const queryLower = query.trim().toLowerCase();
    const base =
      suggestionAnchor && areaNearbyCount <= SUGGESTION_MAX_EXISTING_DOTS ? nearbySuggestionsRaw : [];

    const combined =
      activeSelectedSuggestion &&
      !base.some((b) => haversineM(b.lat, b.lng, activeSelectedSuggestion.lat, activeSelectedSuggestion.lng) <= 80)
        ? [activeSelectedSuggestion, ...base]
        : base;

    if (combined.length === 0) return [];
    const normalized = queryLower;

    return combined
      .filter((item) => {
        const isSelectedSearchSpot =
          Boolean(focusedSuggestion) &&
          item.id === focusedSuggestion?.id &&
          item.id === selectedSuggestionId;
        if (isSelectedSearchSpot) return true;

        if (suggestionAnchor && haversineM(suggestionAnchor.lat, suggestionAnchor.lng, item.lat, item.lng) > AREA_RADIUS_M) {
          return false;
        }

        const itemCat = item.category ?? "other";
        const categoryMatch =
          category === "all"
            ? true
            : category === "other"
            ? !["eat", "street", "park", "culture"].includes(itemCat) || itemCat === "other"
            : itemCat === category;
        if (!categoryMatch) return false;

        if (normalized) {
          const textMatch = `${item.title} ${item.subtitle}`.toLowerCase().includes(normalized);
          if (!textMatch) return false;
        }

        const itemNorm = normalizeSpotName(item.title);
        for (const p of places) {
          const dist = haversineM(item.lat, item.lng, p.latitude, p.longitude);
          if (dist <= 80) return false;
          if (itemNorm && dist <= 1500 && normalizeSpotName(p.name) === itemNorm) return false;
        }
        for (const up of userPlaces) {
          const dist = haversineM(item.lat, item.lng, up.latitude, up.longitude);
          if (dist <= 80) return false;
          if (itemNorm && dist <= 1500 && normalizeSpotName(up.name) === itemNorm) return false;
        }
        return true;
      })
      .sort((a, b) =>
        suggestionAnchor
          ? haversineM(suggestionAnchor.lat, suggestionAnchor.lng, a.lat, a.lng) -
            haversineM(suggestionAnchor.lat, suggestionAnchor.lng, b.lat, b.lng)
          : 0
      )
      .slice(0, 60);
  }, [areaNearbyCount, category, nearbySuggestionsRaw, places, query, suggestionAnchor, activeSelectedSuggestion, userPlaces]);

  const selectedSuggestion =
    activeSelectedSuggestion ?? visibleSuggestedDots.find((item) => item.id === selectedSuggestionId) ?? null;

  const reviewCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const review of reviews) {
      counts.set(review.placeId, (counts.get(review.placeId) ?? 0) + 1);
    }
    return counts;
  }, [reviews]);

  // Synchronous dot matching (matching existing NoCap places & community places)
  const matchingDots = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];

    const matched: Array<
      | { type: "place"; place: NocapPlace }
      | { type: "userPlace"; place: NocapUserPlace }
    > = [];

    // Search hardcoded places
    for (const p of places) {
      if (
        p.name.toLowerCase().includes(q) ||
        p.area.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        (p.aliases && p.aliases.some((a) => a.toLowerCase().includes(q)))
      ) {
        matched.push({ type: "place", place: p });
        if (matched.length >= 4) break;
      }
    }

    // Search community pinned places
    for (const up of userPlaces) {
      if (matched.length >= 6) break;
      if (
        up.name.toLowerCase().includes(q) ||
        up.address.toLowerCase().includes(q) ||
        up.category.toLowerCase().includes(q)
      ) {
        matched.push({ type: "userPlace", place: up });
      }
    }

    return matched;
  }, [places, query, userPlaces]);

  // Debounced geocoding search for Bengaluru locations
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setMapSuggestions([]);
      setLoadingMapSuggestions(false);
      return;
    }

    setLoadingMapSuggestions(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/nocap/search-locations?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setMapSuggestions(Array.isArray(data?.results) ? data.results : []);
        } else {
          setMapSuggestions([]);
        }
      } catch (err: unknown) {
        if ((err as Error)?.name !== "AbortError") {
          setMapSuggestions([]);
        }
      } finally {
        setLoadingMapSuggestions(false);
      }
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Click outside listener to dismiss search suggestions dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(target) &&
        mobileSearchContainerRef.current &&
        !mobileSearchContainerRef.current.contains(target)
      ) {
        setSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  async function saveProfile(input: { displayName: string; bio: string; showAvatar?: boolean }) {
    if (!accessToken) return;
    const response = await fetch("/api/nocap/profile", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(input) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Could not save profile.");
    setProfile(data.profile);
    setProfileOpen(false);
  }

  async function submitReview(input: { body: string; rating: number | null; imageUrl?: string | null; placeId?: string; userPlaceId?: string; makeLegit?: boolean }): Promise<NocapReview | null> {
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
    // Gated by ENABLE_PAID_CRAZY_TEA: kept unplugged to make review sharing completely free.
    if (ENABLE_PAID_CRAZY_TEA && input.makeLegit) {
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
        return null;
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
        imageUrl: input.imageUrl,
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
    const createdReview = data.review as NocapReview;
    setReviews((current) => [createdReview, ...current.filter((review) => review.id !== createdReview.id)]);
    return createdReview;
  }

  async function publishReview(input: { body: string; rating: number | null; imageUrl?: string | null; placeId?: string; userPlaceId?: string; makeLegit?: boolean }) {
    await submitReview(input);
  }

  async function publishSuggestionReview(
    suggestion: SuggestedMapPlace,
    input: { body: string; rating: number | null; imageUrl?: string | null; makeLegit?: boolean },
  ) {
    if (!accessToken) throw new Error("Sign in with Google before publishing.");
    if (!isBengaluruCoord(suggestion.lat, suggestion.lng)) {
      throw new Error("Reviews can only be published for Bengaluru spots.");
    }
    const cleanBody = input.body.trim();
    if (cleanBody.length < 8) throw new Error("Review must be at least 8 characters.");
    if (cleanBody.length > 1200) throw new Error("Review must be under 1200 characters.");

    const targetNameNorm = normalizeSpotName(suggestion.title);

    // If a permanent dot already exists at this exact spot, attach the review to it rather than duplicating
    const existingCurated = places.find(
      (p) =>
        haversineM(p.latitude, p.longitude, suggestion.lat, suggestion.lng) <= 80 ||
        (targetNameNorm.length >= 3 &&
          haversineM(p.latitude, p.longitude, suggestion.lat, suggestion.lng) <= 300 &&
          normalizeSpotName(p.name) === targetNameNorm),
    );
    if (existingCurated) {
      await submitReview({
        placeId: existingCurated.id,
        body: cleanBody,
        rating: input.rating,
        imageUrl: input.imageUrl,
        makeLegit: input.makeLegit,
      });
      setSelectedSuggestionId(null);
      setSelectedSuggestionPlace(null);
      setSuggestionHostAnchor(null);
      setFocusedSuggestion((curr) =>
        curr && (curr.id === suggestion.id || haversineM(curr.lat, curr.lng, existingCurated.latitude, existingCurated.longitude) <= 80)
          ? null
          : curr,
      );
      setSelectedUserPlaceId(null);
      setSelectedPlaceId(existingCurated.id);
      return;
    }

    let targetUserPlace =
      userPlaces.find(
        (up) =>
          haversineM(up.latitude, up.longitude, suggestion.lat, suggestion.lng) <= 80 ||
          (targetNameNorm.length >= 3 &&
            haversineM(up.latitude, up.longitude, suggestion.lat, suggestion.lng) <= 300 &&
            normalizeSpotName(up.name) === targetNameNorm),
      ) ?? null;

    if (!targetUserPlace) {
      const validCategory: NocapPlaceCategory =
        suggestion.category && ["eat", "street", "park", "culture", "other"].includes(suggestion.category)
          ? suggestion.category
          : "other";
      const trimmedTitle = suggestion.title.trim();
      const safeName = (trimmedTitle.length >= 2 ? trimmedTitle : `${trimmedTitle || "Local"} Spot`).slice(0, 120);

      const placeRes = await fetch("/api/nocap/user-places", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: safeName,
          category: validCategory,
          address: (suggestion.subtitle || "Bengaluru").trim().slice(0, 200),
          latitude: suggestion.lat,
          longitude: suggestion.lng,
          userLatitude: userLocation?.lat,
          userLongitude: userLocation?.lng,
        }),
      });
      const placeData = await placeRes.json();
      if (!placeRes.ok || !placeData?.place) {
        throw new Error(placeData?.error ?? "Could not convert this spot into a permanent dot.");
      }
      targetUserPlace = placeData.place as NocapUserPlace;
      setUserPlaces((prev) => [targetUserPlace!, ...prev.filter((up) => up.id !== targetUserPlace!.id)]);
      trackEvent("pin_user_place", {
        place_id: targetUserPlace.id,
        category: targetUserPlace.category,
        from_suggestion: true,
      });
    }

    const createdReview = await submitReview({
      userPlaceId: targetUserPlace.id,
      body: cleanBody,
      rating: input.rating,
      imageUrl: input.imageUrl,
      makeLegit: input.makeLegit,
    });

    if (createdReview) {
      setUserPlaceDetail({
        place: targetUserPlace,
        reviews: [
          createdReview,
          ...reviews.filter(
            (r) =>
              (r.placeId === targetUserPlace!.id || r.placeId === `user:${targetUserPlace!.id}`) &&
              r.id !== createdReview.id,
          ),
        ],
        personNotes: personNotes.filter((n) => n.placeId === `user:${targetUserPlace!.id}` || n.placeId === targetUserPlace!.id),
        supabaseConfigured,
      });
    }

    setNearbySuggestionsRaw((prev) =>
      prev.filter((item) => haversineM(item.lat, item.lng, targetUserPlace!.latitude, targetUserPlace!.longitude) > 80),
    );
    setSelectedSuggestionId(null);
    setSelectedSuggestionPlace(null);
    setSuggestionHostAnchor(null);
    setFocusedSuggestion((curr) =>
      curr && (curr.id === suggestion.id || haversineM(curr.lat, curr.lng, targetUserPlace!.latitude, targetUserPlace!.longitude) <= 80)
        ? null
        : curr,
    );
    setSelectedPlaceId(null);
    setSelectedUserPlaceId(targetUserPlace.id);
    mapRef.current?.flyToUser(targetUserPlace.latitude, targetUserPlace.longitude, 16);
  }

  async function publishPersonNote(input: { personName: string; description: string; photoUrl?: string | null; placeId?: string; userPlaceId?: string }) {
    if (!accessToken) throw new Error("Sign in with Google before publishing.");
    const pid = input.placeId ?? selectedPlace?.id;
    const upid = input.userPlaceId ?? selectedUserPlace?.id;
    if (!pid && !upid) throw new Error("No place selected.");

    const response = await fetch("/api/nocap/person-notes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({
        placeId: pid,
        userPlaceId: upid,
        personName: input.personName,
        description: input.description,
        photoUrl: input.photoUrl,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Could not publish person note.");
    trackEvent("publish_person_note", {
      place_id: pid ?? upid,
      person_name: input.personName,
    });
    const newNote = data.personNote as NocapPersonNote;
    setPersonNotes((prev) => [newNote, ...prev.filter((p) => p.id !== newNote.id)]);
    if (detail && detail.place.id === pid) {
      setDetail((curr) => curr ? { ...curr, personNotes: [newNote, ...(curr.personNotes ?? []).filter((p) => p.id !== newNote.id)] } : null);
    }
    if (userPlaceDetail && userPlaceDetail.place.id === upid) {
      setUserPlaceDetail((curr) => curr ? { ...curr, personNotes: [newNote, ...(curr.personNotes ?? []).filter((p) => p.id !== newNote.id)] } : null);
    }
  }

  // ── "Write a NoCap" button handler ──────────────────────────────────────
  async function handleWriteNoCap() {
    trackEvent("write_nocap_click");
    setLocationError(null);
    setEntryBannerVisible(false);
    setLocateState("locating");
    try {
      console.log("[NoCap] Requesting location via getCurrentPosition...");
      const position = await currentPosition();
      console.log("[NoCap] Got position:", position.coords.latitude, position.coords.longitude);
      const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
      saveUserLocation(loc);
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
    setSearchAnchor(null);
    setFocusedSuggestion(null);
    setSelectedSuggestionId(null);
    setSelectedSuggestionPlace(null);
    setSuggestionHostAnchor(null);
    setEntryBannerVisible(true);

    // Instant response if already located
    if (userLocation) {
      mapRef.current?.flyToUser(userLocation.lat, userLocation.lng, AREA_EXPLORE_ZOOM);
      mapRef.current?.showRadiusCircle(userLocation.lat, userLocation.lng, 1);
      setLocateState("located");
    }

    setLocatingUser(true);
    try {
      const position = await currentPosition();
      const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
      saveUserLocation(loc);
      setUserLocation(loc);
      setEntryLocateStatus("grabbed");
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

  async function handleEntryShareLocation() {
    trackEvent("entry_locate_tap");
    setLocationError(null);
    setSearchAnchor(null);
    setFocusedSuggestion(null);
    setEntryLocateStatus("asking");
    setEntryBannerVisible(true);
    try {
      const position = await currentPosition();
      const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
      saveUserLocation(loc);
      setUserLocation(loc);
      setEntryLocateStatus("grabbed");
      setEntryBannerVisible(true);
      userCameraMovedRef.current = false;
      mapRef.current?.flyToUser(loc.lat, loc.lng, AREA_EXPLORE_ZOOM);
    } catch (err: any) {
      if (err?.message?.includes("PERMISSION_DENIED")) {
        setEntryLocateStatus("dismissed");
        setEntryBannerVisible(false);
        setLocationError("Location access is blocked. Tap the lock/info icon in your address bar, allow location access, and try again.");
      } else {
        setEntryLocateStatus("needs_tap");
        setLocationError("Unable to find your location. Please check your device GPS settings and try again.");
      }
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
    setEntryBannerVisible(false);
    setLocationError(null);

    // Retrieve user location and show 1km boundary circle
    let loc = userLocation;
    if (!loc) {
      try {
        const pos = await currentPosition();
        loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        saveUserLocation(loc);
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

  function handleSelectDot(item: { type: "place"; place: NocapPlace } | { type: "userPlace"; place: NocapUserPlace }) {
    userCameraMovedRef.current = true;
    setSearchAnchor({ lat: item.place.latitude, lng: item.place.longitude, label: item.place.name });
    setFocusedSuggestion(null);
    setQuery("");
    setEntryBannerVisible(true);
    setSearchFocused(false);
    dismissLocate();
    exitPinMode();
    setSelectedSuggestionId(null);
    setSelectedSuggestionPlace(null);
    setSuggestionHostAnchor(null);
    if (item.type === "place") {
      setSelectedPlaceId(item.place.id);
      setSelectedUserPlaceId(null);
      mapRef.current?.flyToUser(item.place.latitude, item.place.longitude, 15);
    } else {
      setSelectedUserPlaceId(item.place.id);
      setSelectedPlaceId(null);
      mapRef.current?.flyToUser(item.place.latitude, item.place.longitude, 15);
    }
  }

  function handleSelectSuggestionDot(suggestion: SuggestedMapPlace) {
    userCameraMovedRef.current = true;
    setEntryBannerVisible(false);
    setSearchFocused(false);
    dismissLocate();
    exitPinMode();
    if (suggestionAnchor) {
      setSuggestionHostAnchor({
        lat: suggestionAnchor.lat,
        lng: suggestionAnchor.lng,
        label: suggestionAnchor.label,
      });
    } else {
      setSuggestionHostAnchor({
        lat: suggestion.lat,
        lng: suggestion.lng,
        label: suggestion.title,
      });
    }
    setSelectedPlaceId(null);
    setSelectedUserPlaceId(null);
    setSelectedSuggestionId(suggestion.id);
    setSelectedSuggestionPlace(suggestion);
    mapRef.current?.flyToUser(suggestion.lat, suggestion.lng, 16);
  }

  function handleExploreMapSuggestion(suggestion: { id: string; title: string; subtitle: string; lat: number; lng: number; category?: NocapPlaceCategory }) {
    userCameraMovedRef.current = true;
    setSearchFocused(false);
    dismissLocate();
    exitPinMode();
    setQuery("");
    setSearchAnchor({ lat: suggestion.lat, lng: suggestion.lng, label: suggestion.title });
    setEntryBannerVisible(true);

    // If a specific venue category is clicked, or an existing dot sits within 150m, highlight it;
    // for broad area searches (e.g. UB City / Whitefield / Electronic City), show the surrounding map directly.
    const isSpecificSpot =
      suggestion.category && ["eat", "street", "park", "culture"].includes(suggestion.category);

    const nearbyExistingPlace = places.find(
      (p) => haversineM(suggestion.lat, suggestion.lng, p.latitude, p.longitude) <= 150
    );
    if (nearbyExistingPlace && (isSpecificSpot || normalizeSpotName(nearbyExistingPlace.name) === normalizeSpotName(suggestion.title))) {
      setFocusedSuggestion(null);
      setSelectedSuggestionId(null);
      setSelectedSuggestionPlace(null);
      setSuggestionHostAnchor(null);
      setSelectedUserPlaceId(null);
      setSelectedPlaceId(nearbyExistingPlace.id);
      mapRef.current?.flyToUser(nearbyExistingPlace.latitude, nearbyExistingPlace.longitude, 14);
      return;
    }

    const nearbyExistingUserPlace = userPlaces.find(
      (up) => haversineM(suggestion.lat, suggestion.lng, up.latitude, up.longitude) <= 150
    );
    if (nearbyExistingUserPlace && (isSpecificSpot || normalizeSpotName(nearbyExistingUserPlace.name) === normalizeSpotName(suggestion.title))) {
      setFocusedSuggestion(null);
      setSelectedSuggestionId(null);
      setSelectedSuggestionPlace(null);
      setSuggestionHostAnchor(null);
      setSelectedPlaceId(null);
      setSelectedUserPlaceId(nearbyExistingUserPlace.id);
      mapRef.current?.flyToUser(nearbyExistingUserPlace.latitude, nearbyExistingUserPlace.longitude, 14);
      return;
    }

    if (isSpecificSpot) {
      const asSuggested: SuggestedMapPlace = {
        id: `searched-${suggestion.id}`,
        title: suggestion.title,
        subtitle: suggestion.subtitle || "Bengaluru, Karnataka",
        lat: suggestion.lat,
        lng: suggestion.lng,
        category: suggestion.category,
      };
      setFocusedSuggestion(asSuggested);
      setSuggestionHostAnchor(null);
      setSelectedPlaceId(null);
      setSelectedUserPlaceId(null);
      setSelectedSuggestionId(asSuggested.id);
      setSelectedSuggestionPlace(asSuggested);
      mapRef.current?.flyToUser(suggestion.lat, suggestion.lng, 14);
      return;
    }

    setFocusedSuggestion(null);
    setSelectedPlaceId(null);
    setSelectedUserPlaceId(null);
    setSelectedSuggestionId(null);
    setSelectedSuggestionPlace(null);
    setSuggestionHostAnchor(null);
    mapRef.current?.flyToUser(suggestion.lat, suggestion.lng, 13.6);
  }

  async function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    event.preventDefault();

    if (mapSuggestions.length > 0) {
      handleExploreMapSuggestion(mapSuggestions[0]);
      return;
    }

    try {
      const res = await fetch(`/api/nocap/search-locations?q=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data = await res.json();
        const first = Array.isArray(data?.results) ? data.results[0] : null;
        if (first) {
          handleExploreMapSuggestion(first);
          return;
        }
      }
    } catch {}

    if (matchingDots.length > 0) {
      handleExploreMapSuggestion({
        id: matchingDots[0].place.id,
        title: matchingDots[0].place.name,
        subtitle: matchingDots[0].place.address || "Bengaluru",
        lat: matchingDots[0].place.latitude,
        lng: matchingDots[0].place.longitude,
      });
    }
  }

  function handleSelectMapSuggestion(suggestion: { id: string; title: string; subtitle: string; lat: number; lng: number; category?: NocapPlaceCategory }) {
    userCameraMovedRef.current = true;
    setEntryBannerVisible(false);
    setSearchFocused(false);
    dismissLocate();
    setSelectedPlaceId(null);
    setSelectedUserPlaceId(null);
    setSelectedSuggestionId(null);
    setSelectedSuggestionPlace(null);
    setSuggestionHostAnchor(null);
    setFocusedSuggestion(null);
    setSearchAnchor({ lat: suggestion.lat, lng: suggestion.lng, label: suggestion.title });

    // Smoothly fly camera to the exact map location
    mapRef.current?.flyToUser(suggestion.lat, suggestion.lng, 16);

    // Drop pending pin right at the location & pre-fill the name, address, and category
    setPendingPin({ lat: suggestion.lat, lng: suggestion.lng });
    setPinPrefill({
      name: suggestion.title,
      address: suggestion.subtitle,
      category: suggestion.category,
    });
    setPinFormOpen(true);
  }

  async function handlePinDrop(lat: number, lng: number) {
    setLocationError(null);
    // Check Bengaluru limits
    if (lat < 12.72 || lat > 13.3 || lng < 77.34 || lng > 77.9) {
      setLocationError("Please pin within Bengaluru city limits.");
      return;
    }

    setPendingPin({ lat, lng });
    setPinPrefill(null);
    setPinFormOpen(true);
  }

  async function submitPin(input: { name: string; category: NocapPlaceCategory; customCategory?: string; address: string }) {
    if (!accessToken) throw new Error("Sign in first.");
    if (!pendingPin) throw new Error("No pin location.");
    let loc = userLocation;
    if (!loc) {
      try {
        const pos = await currentPosition();
        loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        saveUserLocation(loc);
        setUserLocation(loc);
      } catch {
        loc = { lat: pendingPin.lat, lng: pendingPin.lng };
      }
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
        userLatitude: loc?.lat ?? pendingPin.lat,
        userLongitude: loc?.lng ?? pendingPin.lng,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Could not pin place.");
    const newPlace: NocapUserPlace = data.place;
    setUserPlaces((prev) => [newPlace, ...prev]);
    exitPinMode();
    setPinPrefill(null);
    setSelectedUserPlaceId(newPlace.id);
    setSelectedPlaceId(null);
    setSelectedSuggestionId(null);
    setSelectedSuggestionPlace(null);
    setSuggestionHostAnchor(null);
  }

  const commonPanelProps = {
    signedIn: Boolean(accessToken),
    configured: supabaseConfigured,
    onSignIn: signIn,
    onPublish: publishReview,
    onPublishPersonNote: publishPersonNote,
  };

  const hasSelection = Boolean(selectedPlace || selectedUserPlace || selectedSuggestion);

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
        <div ref={searchContainerRef} className="relative border-b border-zinc-200 px-5 py-5">
          <label className="flex h-10 items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 focus-within:border-zinc-400 focus-within:bg-white transition-colors">
            <Search className="h-4 w-4 text-zinc-400 shrink-0" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSearchFocused(true);
              }}
              onFocus={() => setSearchFocused(true)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search places or areas"
              className="min-w-0 flex-1 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setSearchFocused(false);
                }}
                className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 transition-colors"
                title="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </label>

          {/* Desktop Search Suggestions Dropdown */}
          {searchFocused && query.trim().length >= 2 && (
            <SearchSuggestionsDropdown
              query={query}
              matchingDots={matchingDots}
              mapSuggestions={mapSuggestions}
              loadingMap={loadingMapSuggestions}
              reviewCounts={reviewCounts}
              onSelectDot={handleSelectDot}
              onExploreMapSuggestion={handleExploreMapSuggestion}
              onSelectMapSuggestion={handleSelectMapSuggestion}
            />
          )}
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
              <span>{visiblePlaces.length + visibleUserPlaces.length + visibleSuggestedDots.length} places · {reviews.length} local reviews</span>
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
                const distLabel = activeAreaCenter
                  ? formatDistance(haversineM(activeAreaCenter.lat, activeAreaCenter.lng, place.latitude, place.longitude))
                  : null;
                return <button key={place.id} type="button" onClick={() => { userCameraMovedRef.current = true; setEntryBannerVisible(false); setSelectedPlaceId(place.id); setSelectedUserPlaceId(null); setSelectedSuggestionId(null); setSelectedSuggestionPlace(null); setSuggestionHostAnchor(null); dismissLocate(); exitPinMode(); mapRef.current?.flyToUser(place.latitude, place.longitude, 14); }} className={cn("mb-1 flex w-full items-start gap-3 rounded-md px-3 py-3 text-left transition-colors", place.id === selectedPlaceId ? "bg-zinc-950 text-white" : "hover:bg-zinc-100")}>
                  <span className={cn("mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-black", place.id === selectedPlaceId ? "bg-white text-zinc-950" : "bg-zinc-100 text-zinc-600")}>{place.category[0].toUpperCase()}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{place.name}</span>
                    <span className={cn("mt-0.5 flex items-center gap-1.5 text-xs", place.id === selectedPlaceId ? "text-zinc-300" : "text-zinc-500")}>
                      <span className="truncate">{place.area} · {getCategoryName(place.category)}{distLabel ? ` · ${distLabel}` : ""}</span>
                      {count > 0 && <span className={cn("ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold", place.id === selectedPlaceId ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700")}>{count}</span>}
                    </span>
                  </span>
                </button>;
              })}

              {visibleUserPlaces.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Pinned by community</p>
                  {visibleUserPlaces.map((up) => {
                    const distLabel = activeAreaCenter
                      ? formatDistance(haversineM(activeAreaCenter.lat, activeAreaCenter.lng, up.latitude, up.longitude))
                      : null;
                    return (
                      <button key={up.id} type="button" onClick={() => { userCameraMovedRef.current = true; setEntryBannerVisible(false); setSelectedUserPlaceId(up.id); setSelectedPlaceId(null); setSelectedSuggestionId(null); setSelectedSuggestionPlace(null); setSuggestionHostAnchor(null); dismissLocate(); exitPinMode(); mapRef.current?.flyToUser(up.latitude, up.longitude, 14); }} className={cn("mb-1 flex w-full items-start gap-3 rounded-md px-3 py-3 text-left transition-colors", up.id === selectedUserPlaceId ? "bg-zinc-950 text-white" : "hover:bg-zinc-100")}>
                        <span className={cn("mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-black", up.id === selectedUserPlaceId ? "bg-white text-zinc-950" : "bg-zinc-950 text-white")}>U</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold">{up.name}</span>
                          <span className={cn("mt-0.5 block truncate text-xs", up.id === selectedUserPlaceId ? "text-zinc-300" : "text-zinc-500")}>{up.address || getCategoryName(up.category)}{distLabel ? ` · ${distLabel}` : ""}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {visibleSuggestedDots.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                    {suggestionAnchor ? `Closest to ${suggestionAnchor.label} · Suggested` : "Around you · Suggested"}
                  </p>
                  {visibleSuggestedDots.map((s) => {
                    const distLabel = suggestionAnchor
                      ? formatDistance(haversineM(suggestionAnchor.lat, suggestionAnchor.lng, s.lat, s.lng))
                      : null;
                    const cat = s.category ?? "other";
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSelectSuggestionDot(s)}
                        className={cn(
                          "mb-1 flex w-full items-start gap-3 rounded-md px-3 py-3 text-left transition-colors",
                          s.id === selectedSuggestionId ? "bg-zinc-950 text-white" : "hover:bg-zinc-100"
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[10px] font-black",
                            s.id === selectedSuggestionId
                              ? "border-white bg-white text-zinc-950"
                              : "border-dashed border-zinc-400/80 bg-zinc-900/45 text-white"
                          )}
                        >
                          {cat === "other" ? "+" : cat[0].toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold">{s.title}</span>
                          <span className={cn("mt-0.5 block truncate text-xs", s.id === selectedSuggestionId ? "text-zinc-300" : "text-zinc-500")}>
                            {s.subtitle || getCategoryName(cat)}{distLabel ? ` · ${distLabel}` : ""}
                          </span>
                        </span>
                      </button>
                    );
                  })}
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
          suggestedPlaces={visibleSuggestedDots}
          selectedPlaceId={selectedPlaceId ?? selectedUserPlaceId ?? selectedSuggestionId}
          onSelectPlace={(id) => { userCameraMovedRef.current = true; setEntryBannerVisible(false); setSelectedPlaceId(id); setSelectedUserPlaceId(null); setSelectedSuggestionId(null); setSelectedSuggestionPlace(null); setSuggestionHostAnchor(null); dismissLocate(); exitPinMode(); }}
          onSelectUserPlace={(id) => { userCameraMovedRef.current = true; setEntryBannerVisible(false); setSelectedUserPlaceId(id); setSelectedPlaceId(null); setSelectedSuggestionId(null); setSelectedSuggestionPlace(null); setSuggestionHostAnchor(null); dismissLocate(); exitPinMode(); }}
          onSelectSuggestion={handleSelectSuggestionDot}
          userLocation={userLocation}
          pendingPin={pendingPin}
          onPinDrop={handlePinDrop}
        />

        {/* ── MOBILE: Floating search bar at top ── */}
        {!pinMode && (
          <div ref={mobileSearchContainerRef} className="lg:hidden absolute left-3 right-3 top-3 z-20">
            <div className="flex items-center gap-2 rounded-xl bg-white/95 backdrop-blur border border-zinc-200/80 shadow-lg px-3 h-12">
              <img src="/nocap-icon.png" alt="NoCap" className="h-7 w-7 shrink-0 rounded-lg object-contain shadow-xs" />
              <Search className="h-4 w-4 shrink-0 text-zinc-400" />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSearchFocused(true);
                }}
                onFocus={() => setSearchFocused(true)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search places or areas"
                className="min-w-0 flex-1 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setSearchFocused(false);
                  }}
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
                  title="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
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

            {/* Mobile Search Suggestions Dropdown */}
            {searchFocused && query.trim().length >= 2 && (
              <SearchSuggestionsDropdown
                query={query}
                matchingDots={matchingDots}
                mapSuggestions={mapSuggestions}
                loadingMap={loadingMapSuggestions}
                reviewCounts={reviewCounts}
                onSelectDot={handleSelectDot}
                onExploreMapSuggestion={handleExploreMapSuggestion}
                onSelectMapSuggestion={handleSelectMapSuggestion}
                isMobile
              />
            )}
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

        {/* ── ENTRY LOCATION STATUS PILL (Non-blocking, monochrome) ── */}
        {entryBannerVisible &&
          !loading &&
          !guideOpen &&
          !pinMode &&
          locateState === "idle" &&
          !locationError && (
            <div
              className={cn(
                "pointer-events-auto absolute top-28 lg:top-4 left-1/2 -translate-x-1/2 z-20 max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-full border border-zinc-200 bg-white/95 px-3.5 py-2 text-xs font-semibold text-zinc-900 shadow-lg backdrop-blur",
                hasSelection ? "hidden lg:flex" : "flex"
              )}
            >
              {searchAnchor ? (
                <>
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-zinc-950 ring-2 ring-zinc-300" />
                  <span className="truncate">
                    {loadingNearbySuggestions
                      ? `${searchAnchor.label} · Finding nearby spots…`
                      : areaNearbyCount <= SUGGESTION_MAX_EXISTING_DOTS
                        ? visibleSuggestedDots.length > 0
                          ? `${searchAnchor.label} · ${areaNearbyCount} NoCap + ${visibleSuggestedDots.length} suggested within 3 km`
                          : `${searchAnchor.label} · ${areaNearbyCount} NoCap dot${areaNearbyCount === 1 ? "" : "s"} within 3 km`
                        : `${searchAnchor.label} · ${areaNearbyCount} NoCap dots within 3 km`}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchAnchor(null);
                      setFocusedSuggestion(null);
                      setSelectedSuggestionId(null);
                      setSelectedSuggestionPlace(null);
                      setSuggestionHostAnchor(null);
                      if (userLocation) {
                        userCameraMovedRef.current = false;
                        mapRef.current?.flyToUser(userLocation.lat, userLocation.lng, AREA_EXPLORE_ZOOM);
                      } else {
                        setEntryBannerVisible(false);
                        mapRef.current?.flyToBengaluru();
                      }
                    }}
                    className="shrink-0 rounded-full bg-zinc-950 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-zinc-800 transition-colors"
                  >
                    {userLocation ? "My area" : "Reset"}
                  </button>
                </>
              ) : (
                <>
                  {entryLocateStatus === "asking" && (
                    <>
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-zinc-700" />
                      <span className="truncate">Finding dots around your area…</span>
                    </>
                  )}

                  {entryLocateStatus === "needs_tap" && (
                    <>
                      <LocateFixed className="h-3.5 w-3.5 shrink-0 text-zinc-700" />
                      <span className="truncate">See dots around your area</span>
                      <button
                        type="button"
                        onClick={handleEntryShareLocation}
                        className="shrink-0 rounded-full bg-zinc-950 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-zinc-800 transition-colors"
                      >
                        Use location
                      </button>
                    </>
                  )}

                  {entryLocateStatus === "grabbed" && userLocation && (
                    <>
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600 ring-2 ring-blue-200" />
                      <span className="truncate">
                        {loadingNearbySuggestions
                          ? "Your area · Finding nearby spots…"
                          : !isBengaluruCoord(userLocation.lat, userLocation.lng)
                            ? visibleSuggestedDots.length > 0
                              ? `Your area · ${visibleSuggestedDots.length} suggested spot${visibleSuggestedDots.length === 1 ? "" : "s"} nearby`
                              : "Showing your location"
                            : areaNearbyCount <= SUGGESTION_MAX_EXISTING_DOTS && visibleSuggestedDots.length > 0
                              ? `Your area · ${areaNearbyCount} NoCap + ${visibleSuggestedDots.length} suggested within 3 km`
                              : areaNearbyCount > 0
                                ? `Your area · ${areaNearbyCount} NoCap dot${areaNearbyCount === 1 ? "" : "s"} within 3 km`
                                : "Your area · Pin a spot nearby"}
                      </span>
                      {!isBengaluruCoord(userLocation.lat, userLocation.lng) && (
                        <button
                          type="button"
                          onClick={() => {
                            userCameraMovedRef.current = true;
                            setEntryBannerVisible(false);
                            mapRef.current?.flyToBengaluru();
                          }}
                          className="shrink-0 rounded-full bg-zinc-950 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-zinc-800 transition-colors"
                        >
                          Bengaluru dots
                        </button>
                      )}
                    </>
                  )}
                </>
              )}

              <button
                type="button"
                onClick={() => setEntryBannerVisible(false)}
                className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
                aria-label="Dismiss location notice"
              >
                <X className="h-3 w-3" />
              </button>
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

        {/* ── GUIDE / HOW TO USE BUTTON (Desktop only — mobile uses searchbar guide button beside profile) ── */}
        <button
          type="button"
          onClick={() => setGuideOpen(true)}
          className="hidden lg:grid absolute bottom-44 right-6 z-20 h-10 w-10 place-items-center rounded-xl border border-zinc-200/80 bg-white/95 backdrop-blur shadow-lg active:scale-95 transition-all text-zinc-700 hover:text-zinc-950"
          title="How to use NoCapBLR (Guide)"
        >
          <HelpCircle className="h-4 w-4 text-zinc-700" />
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
            <div onClick={() => { setSelectedPlaceId(null); setSelectedUserPlaceId(null); setSelectedSuggestionId(null); setSelectedSuggestionPlace(null); setSuggestionHostAnchor(null); }} className="absolute inset-0 z-30 bg-black/20" />
            <div className="absolute bottom-0 left-0 right-0 z-40 max-h-[70dvh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl nocap-sheet">
              <div className="sticky top-0 z-10 flex justify-center bg-white pt-3 pb-2 rounded-t-2xl">
                <div className="h-1 w-10 rounded-full bg-zinc-300" />
              </div>
              <button type="button" onClick={() => { setSelectedPlaceId(null); setSelectedUserPlaceId(null); setSelectedSuggestionId(null); setSelectedSuggestionPlace(null); setSuggestionHostAnchor(null); }} className="absolute top-3 right-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200">
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
              {selectedSuggestion && (
                <SuggestedPlacePanel
                  suggestion={selectedSuggestion}
                  userLocation={userLocation}
                  configured={supabaseConfigured}
                  signedIn={Boolean(accessToken)}
                  onSignIn={signIn}
                  onPublishReview={(input) => publishSuggestionReview(selectedSuggestion, input)}
                  onPinAndReview={() => handleSelectMapSuggestion(selectedSuggestion)}
                  onViewBengaluru={() => {
                    setSelectedSuggestionId(null);
                    setSelectedSuggestionPlace(null);
                    setSuggestionHostAnchor(null);
                    mapRef.current?.flyToBengaluru();
                  }}
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
        {selectedSuggestion && (
          <SuggestedPlacePanel
            suggestion={selectedSuggestion}
            userLocation={userLocation}
            configured={supabaseConfigured}
            signedIn={Boolean(accessToken)}
            onSignIn={signIn}
            onPublishReview={(input) => publishSuggestionReview(selectedSuggestion, input)}
            onPinAndReview={() => handleSelectMapSuggestion(selectedSuggestion)}
            onViewBengaluru={() => {
              setSelectedSuggestionId(null);
              setSelectedSuggestionPlace(null);
              setSuggestionHostAnchor(null);
              mapRef.current?.flyToBengaluru();
            }}
          />
        )}
        {!selectedPlace && !selectedUserPlace && !selectedSuggestion && (
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
        initialName={pinPrefill?.name ?? ""}
        initialAddress={pinPrefill?.address ?? ""}
        initialCategory={pinPrefill?.category}
        onCancel={() => {
          setPinPrefill(null);
          exitPinMode();
        }}
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
        {profile.avatarUrl ? (
          <span aria-hidden className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${profile.avatarUrl})` }} />
        ) : (
          <CircleUserRound className="h-4 w-4 text-zinc-300" />
        )}
      </Link>
    : <button type="button" onClick={onSignIn} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-zinc-950 px-2.5 text-[11px] font-bold text-white"><LogIn className="h-3.5 w-3.5" />Join</button>;
}

function PlacePanel({ place, detail, signedIn, configured, onSignIn, onPublish, onPublishPersonNote }: {
  place: NocapPlace; detail: PlaceDetail | null; signedIn: boolean; configured: boolean;
  onSignIn: () => void;
  onPublish: (input: { body: string; rating: number | null; imageUrl?: string | null; placeId?: string; makeLegit?: boolean }) => Promise<void>;
  onPublishPersonNote: (input: { placeId?: string; userPlaceId?: string; personName: string; description: string; photoUrl?: string | null }) => Promise<void>;
}) {
  const reviews = detail?.reviews ?? [];
  const personNotes = detail?.personNotes ?? [];
  const [activeTab, setActiveTab] = useState<"all" | "reviews" | "people">("all");
  const [composerMode, setComposerMode] = useState<"review" | "person">("review");
  const [lightbox, setLightbox] = useState<{ url: string; caption?: string } | null>(null);

  const totalCount = reviews.length + personNotes.length;

  return (
    <div className="flex h-full min-h-[34dvh] flex-col">
      {lightbox && <ImageLightbox url={lightbox.url} caption={lightbox.caption} onClose={() => setLightbox(null)} />}

      <div className="border-b border-zinc-200 px-5 py-5">
        <div className="flex items-center gap-3">
          <img src={`/api/nocap/place-image/${place.id}`} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase text-zinc-500">{getCategoryName(place.category)}</span>
            <h1 className="mt-0.5 text-lg font-black tracking-tight leading-tight">{place.name}</h1>
          </div>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500"><MapPin className="h-3.5 w-3.5" />{place.address}</p>
        <p className="mt-3 text-xs font-medium text-zinc-600">
          {totalCount
            ? `${reviews.length} ${reviews.length === 1 ? "review/note" : "reviews/notes"}${personNotes.length ? ` · ${personNotes.length} ${personNotes.length === 1 ? "person noted" : "people noted"}` : ""}`
            : "Be the first local to share a review, note, or person spotlight."}
        </p>

        {/* Tab filters */}
        <div className="mt-4 flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
              activeTab === "all" ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            )}
          >
            All ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("reviews")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
              activeTab === "reviews" ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            )}
          >
            Reviews & Notes ({reviews.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("people")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
              activeTab === "people" ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            )}
          >
            People ({personNotes.length})
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {/* Toggle between writing a review/note or noting a person */}
        <div className="mb-3 flex items-center rounded-xl bg-zinc-100 p-1">
          <button
            type="button"
            onClick={() => setComposerMode("review")}
            className={cn(
              "flex-1 rounded-lg py-1.5 text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5",
              composerMode === "review" ? "bg-white text-zinc-950 shadow-2xs" : "text-zinc-600 hover:text-zinc-950"
            )}
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>Review / Note</span>
          </button>
          <button
            type="button"
            onClick={() => setComposerMode("person")}
            className={cn(
              "flex-1 rounded-lg py-1.5 text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5",
              composerMode === "person" ? "bg-white text-zinc-950 shadow-2xs" : "text-zinc-600 hover:text-zinc-950"
            )}
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>Note a Person</span>
          </button>
        </div>

        {composerMode === "review" ? (
          <ReviewComposer
            key={place.id}
            configured={configured}
            signedIn={signedIn}
            onSignIn={onSignIn}
            onPublish={(input) => onPublish({ ...input, placeId: place.id })}
          />
        ) : (
          <PersonNoteComposer
            key={`person-${place.id}`}
            placeName={place.name}
            configured={configured}
            signedIn={signedIn}
            onSignIn={onSignIn}
            onPublish={(input) => onPublishPersonNote({ ...input, placeId: place.id })}
          />
        )}

        {detail === null ? (
          <EvidenceSkeleton />
        ) : (
          <div className="mt-4 space-y-3">
            {activeTab === "people" ? (
              personNotes.length ? (
                personNotes.map((note) => (
                  <PersonNoteCard
                    key={note.id}
                    note={note}
                    onViewPhoto={(url, caption) => setLightbox({ url, caption })}
                  />
                ))
              ) : (
                <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-5 text-center">
                  <CircleUserRound className="mx-auto h-5 w-5 text-zinc-400" />
                  <h2 className="mt-2 text-sm font-bold text-zinc-900">No people noted here yet.</h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    Know a chef, barista, or iconic character here? Click &ldquo;Note a Person&rdquo; above!
                  </p>
                </div>
              )
            ) : activeTab === "reviews" ? (
              reviews.length ? (
                reviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    onViewPhoto={(url, caption) => setLightbox({ url, caption })}
                  />
                ))
              ) : (
                <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-5">
                  <CircleUserRound className="h-5 w-5 text-zinc-400" />
                  <h2 className="mt-3 text-sm font-bold">No local reviews here yet.</h2>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">Be the first to drop an honest NoCap review here.</p>
                </div>
              )
            ) : (
              // All items
              <>
                {personNotes.map((note) => (
                  <PersonNoteCard
                    key={note.id}
                    note={note}
                    onViewPhoto={(url, caption) => setLightbox({ url, caption })}
                  />
                ))}
                {reviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    onViewPhoto={(url, caption) => setLightbox({ url, caption })}
                  />
                ))}
                {!totalCount && (
                  <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-5">
                    <CircleUserRound className="h-5 w-5 text-zinc-400" />
                    <h2 className="mt-3 text-sm font-bold">No local reviews or notes here yet.</h2>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">Be the first to drop an honest take or note someone here.</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function UserPlacePanel({ place, detail, signedIn, configured, onSignIn, onPublish, onPublishPersonNote }: {
  place: NocapUserPlace; detail: UserPlaceDetail | null; signedIn: boolean; configured: boolean;
  onSignIn: () => void;
  onPublish: (input: { body: string; rating: number | null; imageUrl?: string | null; userPlaceId?: string; makeLegit?: boolean }) => Promise<void>;
  onPublishPersonNote: (input: { placeId?: string; userPlaceId?: string; personName: string; description: string; photoUrl?: string | null }) => Promise<void>;
}) {
  const reviews = detail?.reviews ?? [];
  const personNotes = detail?.personNotes ?? [];
  const [activeTab, setActiveTab] = useState<"all" | "reviews" | "people">("all");
  const [composerMode, setComposerMode] = useState<"review" | "person">("review");
  const [lightbox, setLightbox] = useState<{ url: string; caption?: string } | null>(null);

  const totalCount = reviews.length + personNotes.length;

  return (
    <div className="flex h-full min-h-[34dvh] flex-col">
      {lightbox && <ImageLightbox url={lightbox.url} caption={lightbox.caption} onClose={() => setLightbox(null)} />}

      <div className="border-b border-zinc-200 px-5 py-5">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-zinc-950 text-lg font-black text-white">U</span>
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase text-zinc-500">Community pin · {getCategoryName(place.category)}</span>
            <h1 className="mt-0.5 text-lg font-black tracking-tight leading-tight">{place.name}</h1>
          </div>
        </div>
        {place.address && <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500"><MapPin className="h-3.5 w-3.5" />{place.address}</p>}
        <p className="mt-1 text-[11px] text-zinc-400">Pinned by {place.profile.displayName}</p>
        <p className="mt-3 text-xs font-medium text-zinc-600">
          {totalCount
            ? `${reviews.length} ${reviews.length === 1 ? "review/note" : "reviews/notes"}${personNotes.length ? ` · ${personNotes.length} ${personNotes.length === 1 ? "person noted" : "people noted"}` : ""}`
            : "Be the first to review this spot or note someone here."}
        </p>

        {/* Tab filters */}
        <div className="mt-4 flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
              activeTab === "all" ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            )}
          >
            All ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("reviews")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
              activeTab === "reviews" ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            )}
          >
            Reviews & Notes ({reviews.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("people")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
              activeTab === "people" ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            )}
          >
            People ({personNotes.length})
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {/* Toggle between writing a review/note or noting a person */}
        <div className="mb-3 flex items-center rounded-xl bg-zinc-100 p-1">
          <button
            type="button"
            onClick={() => setComposerMode("review")}
            className={cn(
              "flex-1 rounded-lg py-1.5 text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5",
              composerMode === "review" ? "bg-white text-zinc-950 shadow-2xs" : "text-zinc-600 hover:text-zinc-950"
            )}
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>Review / Note</span>
          </button>
          <button
            type="button"
            onClick={() => setComposerMode("person")}
            className={cn(
              "flex-1 rounded-lg py-1.5 text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5",
              composerMode === "person" ? "bg-white text-zinc-950 shadow-2xs" : "text-zinc-600 hover:text-zinc-950"
            )}
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>Note a Person</span>
          </button>
        </div>

        {composerMode === "review" ? (
          <ReviewComposer
            key={place.id}
            configured={configured}
            signedIn={signedIn}
            onSignIn={onSignIn}
            onPublish={(input) => onPublish({ ...input, userPlaceId: place.id })}
          />
        ) : (
          <PersonNoteComposer
            key={`person-${place.id}`}
            placeName={place.name}
            configured={configured}
            signedIn={signedIn}
            onSignIn={onSignIn}
            onPublish={(input) => onPublishPersonNote({ ...input, userPlaceId: place.id })}
          />
        )}

        {detail === null ? (
          <EvidenceSkeleton />
        ) : (
          <div className="mt-4 space-y-3">
            {activeTab === "people" ? (
              personNotes.length ? (
                personNotes.map((note) => (
                  <PersonNoteCard
                    key={note.id}
                    note={note}
                    onViewPhoto={(url, caption) => setLightbox({ url, caption })}
                  />
                ))
              ) : (
                <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-5 text-center">
                  <CircleUserRound className="mx-auto h-5 w-5 text-zinc-400" />
                  <h2 className="mt-2 text-sm font-bold text-zinc-900">No people noted here yet.</h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    Know a friendly face or person here? Click &ldquo;Note a Person&rdquo; above!
                  </p>
                </div>
              )
            ) : activeTab === "reviews" ? (
              reviews.length ? (
                reviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    onViewPhoto={(url, caption) => setLightbox({ url, caption })}
                  />
                ))
              ) : (
                <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-5">
                  <CircleUserRound className="h-5 w-5 text-zinc-400" />
                  <h2 className="mt-3 text-sm font-bold">No reviews yet.</h2>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">Be the first to drop a NoCap here.</p>
                </div>
              )
            ) : (
              // All items
              <>
                {personNotes.map((note) => (
                  <PersonNoteCard
                    key={note.id}
                    note={note}
                    onViewPhoto={(url, caption) => setLightbox({ url, caption })}
                  />
                ))}
                {reviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    onViewPhoto={(url, caption) => setLightbox({ url, caption })}
                  />
                ))}
                {!totalCount && (
                  <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-5">
                    <CircleUserRound className="h-5 w-5 text-zinc-400" />
                    <h2 className="mt-3 text-sm font-bold">No reviews or notes yet.</h2>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">Be the first to drop a NoCap or note someone here.</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewComposer({ configured, signedIn, onSignIn, onPublish, defaultExpanded = false }: {
  configured: boolean; signedIn: boolean; onSignIn: () => void;
  onPublish: (input: { body: string; rating: number | null; imageUrl?: string | null; makeLegit?: boolean }) => Promise<void>;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(Boolean(defaultExpanded && signedIn));
  const [body, setBody] = useState("");
  const [rating, setRating] = useState<number | null>(5);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [makeLegit, setMakeLegit] = useState(false);
  const [state, setState] = useState<"idle" | "locating" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (defaultExpanded && signedIn) {
      setIsExpanded(true);
    }
  }, [defaultExpanded, signedIn]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("Please choose an image file (PNG, JPG, WebP).");
      return;
    }
    setImageUploading(true);
    setMessage("Processing photo…");
    try {
      const url = await uploadImageFile(file);
      setImageUrl(url);
      setMessage("");
    } catch (err) {
      console.error("Image upload failed:", err);
      setMessage("Could not attach image.");
    } finally {
      setImageUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setState("locating");
    setMessage(ENABLE_PAID_CRAZY_TEA && makeLegit ? "Opening UPI checkout…" : "Publishing your review…");
    try {
      await onPublish({ body, rating, imageUrl, makeLegit: ENABLE_PAID_CRAZY_TEA && makeLegit });
      setBody("");
      setImageUrl(null);
      setState("idle");
      setMessage(ENABLE_PAID_CRAZY_TEA && makeLegit ? "☕ Crazy Tea review published!" : "Review published successfully.");
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
  if (!signedIn || !isExpanded) {
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
            <div
              className={cn(
                "grid h-8 w-8 sm:h-9 sm:w-9 shrink-0 place-items-center rounded-xl border transition-colors",
                ENABLE_PAID_CRAZY_TEA
                  ? "bg-orange-50 text-orange-600 border-orange-200/60 group-hover:bg-orange-500 group-hover:text-white group-hover:border-orange-500"
                  : "bg-zinc-100 text-zinc-700 border-zinc-200/80 group-hover:bg-zinc-900 group-hover:text-white group-hover:border-zinc-900"
              )}
            >
              <Pencil className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-zinc-900 group-hover:text-black">Share your take</span>
                {ENABLE_PAID_CRAZY_TEA && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-100/90 border border-orange-200/60 px-2 py-0.5 text-[10px] font-black text-orange-700">
                    ☕ Spill Crazy Tea
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                {signedIn
                  ? ENABLE_PAID_CRAZY_TEA
                    ? "Drop a review or pin tea to the top (₹49)"
                    : "Drop a review or note with optional photo"
                  : "Sign in with Google to write"}
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-lg bg-zinc-950 text-white group-hover:bg-zinc-800 px-3 py-1.5 text-xs font-bold transition-colors">
            {signedIn ? "Write Note" : "Sign In"}
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

      {/* Image attachment file input & preview */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {imageUrl ? (
        <div className="relative mt-2.5 inline-block group">
          <img
            src={imageUrl}
            alt="Attached photo"
            className="h-20 w-28 sm:h-24 sm:w-36 rounded-lg object-cover border border-zinc-200 shadow-2xs"
          />
          <button
            type="button"
            onClick={() => setImageUrl(null)}
            className="absolute -top-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full bg-zinc-900 text-white hover:bg-red-600 transition-colors shadow-xs"
            title="Remove image"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div className="mt-2.5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={imageUploading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
          >
            {imageUploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" />
                <span>Processing photo…</span>
              </>
            ) : (
              <>
                <Camera className="h-3.5 w-3.5 text-zinc-500" />
                <span>Add photo to note</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Orange Crazy Tea Option */}
      {ENABLE_PAID_CRAZY_TEA && (
        <label className="mt-3 relative flex cursor-pointer items-start gap-3 overflow-hidden rounded-xl border border-orange-500/80 bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 p-3.5 shadow-lg shadow-orange-500/20 transition-all duration-300 hover:shadow-orange-500/30 hover:border-orange-400 group">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
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
                ₹49
              </span>
            </div>
            <p className="mt-0.5 text-[11px] leading-relaxed text-orange-50 font-medium">
              Spill the real unfiltered tea. Pin your review right to the top with an exclusive Crazy Tea badge.
            </p>
          </div>
        </label>
      )}

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
              ENABLE_PAID_CRAZY_TEA && makeLegit
                ? "bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 border border-orange-300/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),0_4px_14px_rgba(249,115,22,0.4)] hover:brightness-105 active:scale-[0.98]"
                : "bg-zinc-950 border border-transparent hover:bg-zinc-800"
            )}
          >
            {ENABLE_PAID_CRAZY_TEA && makeLegit && (
              <>
                <span className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/70 to-transparent" />
                <span className="pointer-events-none absolute -inset-full top-0 block -rotate-45 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />
              </>
            )}
            <Send className="relative z-10 h-3.5 w-3.5" />
            <span className="relative z-10">{ENABLE_PAID_CRAZY_TEA && makeLegit ? "Spill Tea (₹49)" : "Publish"}</span>
          </button>
        </div>
      </div>
    </form>
  );
}

function PersonNoteComposer({
  configured,
  signedIn,
  placeName,
  onSignIn,
  onPublish,
}: {
  configured: boolean;
  signedIn: boolean;
  placeName: string;
  onSignIn: () => void;
  onPublish: (input: { personName: string; description: string; photoUrl?: string | null }) => Promise<void>;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [personName, setPersonName] = useState("");
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "submitting" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("Please choose an image file (PNG, JPG, WebP).");
      return;
    }
    setPhotoUploading(true);
    setMessage("Processing photo…");
    try {
      const url = await uploadImageFile(file);
      setPhotoUrl(url);
      setMessage("");
    } catch (err) {
      console.error("Person photo upload failed:", err);
      setMessage("Could not attach photo.");
    } finally {
      setPhotoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (personName.trim().length < 2) {
      setState("error");
      setMessage("Please enter person's name (at least 2 letters).");
      return;
    }
    if (description.trim().length < 3) {
      setState("error");
      setMessage("Please enter a short note about them.");
      return;
    }
    setState("submitting");
    setMessage("Saving person note…");
    try {
      await onPublish({ personName, description, photoUrl });
      setPersonName("");
      setDescription("");
      setPhotoUrl(null);
      setState("idle");
      setMessage("✨ Note about this person added!");
      setTimeout(() => {
        setIsExpanded(false);
        setMessage("");
      }, 1500);
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "Could not post person note.");
    }
  }

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
            <div className="grid h-8 w-8 sm:h-9 sm:w-9 shrink-0 place-items-center rounded-xl border border-zinc-200/80 bg-zinc-100 text-zinc-700 group-hover:bg-zinc-950 group-hover:text-white group-hover:border-zinc-950 transition-colors">
              <Pencil className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-zinc-900 group-hover:text-black">Note someone here</span>
              <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                Spotlight a chef, friendly barista, guard, or local character
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-lg bg-zinc-950 text-white group-hover:bg-zinc-800 px-3 py-1.5 text-xs font-bold transition-colors">
            {signedIn ? "Note Person" : "Sign In"}
          </span>
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50/90 p-3.5 shadow-2xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-zinc-900">Spotlight a Person</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-200/70 px-2 py-0.5 text-[10px] font-bold text-zinc-700">
            at {placeName}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsExpanded(false);
            setMessage("");
          }}
          className="grid h-6 w-6 place-items-center rounded-md text-zinc-400 hover:bg-zinc-200/70 hover:text-zinc-700 transition-colors"
          title="Close person note form"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Field 1: Name & Role */}
      <div className="mt-3">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-600">
          Person&apos;s Name & Role <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={personName}
          onChange={(e) => setPersonName(e.target.value)}
          required
          maxLength={100}
          placeholder="e.g. Anand (Head Waiter), Suresh the Dosa Master..."
          className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 outline-none focus:border-zinc-500"
        />
      </div>

      {/* Field 2: Description */}
      <div className="mt-2.5">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-600">
          Description & Story <span className="text-red-500">*</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          minLength={3}
          maxLength={1500}
          placeholder="Why are they special? What do they do? Share helpful context, their vibe, or tips about them..."
          className="mt-1 min-h-18 w-full resize-y rounded-lg border border-zinc-200 bg-white p-2.5 text-xs text-zinc-900 outline-none focus:border-zinc-500"
        />
      </div>

      {/* Field 3: Photo */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="mt-2.5">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-600">
          Photo of this person / spot <span className="text-zinc-400 font-normal">(recommended)</span>
        </label>

        {photoUrl ? (
          <div className="relative mt-1.5 inline-block group">
            <img
              src={photoUrl}
              alt="Person preview"
              className="h-20 w-24 sm:h-24 sm:w-28 rounded-lg object-cover border border-zinc-200 shadow-2xs"
            />
            <button
              type="button"
              onClick={() => setPhotoUrl(null)}
              className="absolute -top-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full bg-zinc-900 text-white hover:bg-red-600 transition-colors shadow-xs"
              title="Remove photo"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={photoUploading}
            className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
          >
            {photoUploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" />
                <span>Processing photo…</span>
              </>
            ) : (
              <>
                <Camera className="h-3.5 w-3.5 text-zinc-500" />
                <span>Upload photo of person</span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-zinc-200/80 pt-2.5">
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
            type="submit"
            disabled={state === "submitting" || personName.trim().length < 2 || description.trim().length < 3}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-zinc-950 px-4 text-xs font-bold text-white hover:bg-zinc-800 transition-all disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Save Person Note</span>
          </button>
        </div>
      </div>
    </form>
  );
}

function ReviewCard({ review, onViewPhoto }: { review: NocapReview; onViewPhoto?: (url: string, caption?: string) => void }) {
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
            <CircleUserRound className="h-4 w-4 text-zinc-300" />
          )}
        </span>
        <div className="min-w-0">
          <div className="truncate text-xs font-bold text-zinc-900">{review.profile.displayName || "Anonymous"}</div>
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
      <p className="mt-2.5 text-sm leading-5 text-zinc-700 whitespace-pre-line">{review.body}</p>

      {/* Review Photo Attachment */}
      {review.imageUrl && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => onViewPhoto?.(review.imageUrl!, `${review.profile.displayName}'s note photo`)}
            className="group relative block overflow-hidden rounded-xl border border-zinc-200/90 bg-zinc-100 shadow-2xs hover:opacity-95 transition-opacity"
          >
            <img
              src={review.imageUrl}
              alt="Photo attached to note"
              className="max-h-60 w-auto rounded-xl object-cover transition-transform duration-200 group-hover:scale-[1.01]"
              loading="lazy"
            />
            <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-xs">
              <ZoomIn className="h-3 w-3" />
              <span>Click to expand</span>
            </div>
          </button>
        </div>
      )}
    </article>
  );
}

function PersonNoteCard({
  note,
  onViewPhoto,
}: {
  note: NocapPersonNote;
  onViewPhoto?: (url: string, caption?: string) => void;
}) {
  const initial = (note.personName.trim().charAt(0) || "P").toUpperCase();

  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-3.5 shadow-2xs">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center rounded-full bg-zinc-950 px-2 py-0.5 text-[10px] font-black text-white">
            Person Spotlight
          </span>
          <span className="text-[10px] text-zinc-400">· {timeLabel(note.updatedAt, note.id)}</span>
        </div>
      </div>

      <div className="mt-3 flex gap-3 items-start">
        {note.photoUrl ? (
          <button
            type="button"
            onClick={() => onViewPhoto?.(note.photoUrl!, `${note.personName}`)}
            className="group relative shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xs hover:opacity-90 transition-opacity"
          >
            <img
              src={note.photoUrl}
              alt={note.personName}
              className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <ZoomIn className="h-4 w-4 text-white" />
            </div>
          </button>
        ) : (
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-zinc-200 bg-zinc-950 text-base font-black text-white">
            {initial}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-black text-zinc-950 leading-snug">{note.personName}</h3>
          <p className="mt-1 text-xs leading-relaxed text-zinc-700 whitespace-pre-line">
            {note.description}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-2 text-[10px] text-zinc-400">
        <div className="flex items-center gap-1.5 truncate">
          <span className="font-semibold text-zinc-600">Noted by {note.profile.displayName || "Local Scout"}</span>
        </div>
        <span className="text-zinc-500 font-medium">Bengaluru Local Community</span>
      </div>
    </article>
  );
}

function ImageLightbox({ url, caption, onClose }: { url: string; caption?: string; onClose: () => void }) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div onClick={(e) => e.stopPropagation()} className="relative max-h-[90vh] max-w-3xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-10 right-0 grid h-8 w-8 place-items-center rounded-full bg-white/20 text-white hover:bg-white/40 transition-colors"
          title="Close photo"
        >
          <X className="h-5 w-5" />
        </button>
        <img
          src={url}
          alt={caption || "Expanded view"}
          className="max-h-[80vh] w-auto rounded-2xl object-contain shadow-2xl"
        />
        {caption && (
          <p className="mt-3 text-center text-xs font-semibold text-white/90">{caption}</p>
        )}
      </div>
    </div>
  );
}

function ProfileEditor({ profile, onClose, onSave, onSignOut }: { profile: NocapProfile; onClose: () => void; onSave: (input: { displayName: string; bio: string; showAvatar?: boolean }) => Promise<void>; onSignOut: () => void }) {
  const [displayName, setDisplayName] = useState(profile.displayName || "Anonymous");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [showAvatar, setShowAvatar] = useState(Boolean(profile.avatarUrl));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave({
        displayName: displayName.trim() || "Anonymous",
        bio: bio.trim(),
        showAvatar,
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  const currentAvatar = showAvatar ? (profile.googleAvatarUrl || profile.avatarUrl) : null;

  return (
    <div className="absolute inset-0 z-30 overflow-y-auto bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-black">Your profile</h2>
        <button type="button" onClick={onClose} className="text-xs font-semibold text-zinc-500 hover:text-zinc-950">Close</button>
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3.5">
        <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-zinc-950 text-xs font-bold text-white">
          {currentAvatar ? (
            <span aria-hidden className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${currentAvatar})` }} />
          ) : (
            <CircleUserRound className="h-6 w-6 text-zinc-300" />
          )}
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-zinc-900">{displayName || "Anonymous"}</div>
          <div className="text-[11px] text-zinc-500">
            {currentAvatar ? "Google photo enabled" : "Anonymous photo"}
          </div>
        </div>
      </div>

      <form onSubmit={save} className="mt-5 space-y-4">
        <label className="block text-xs font-bold text-zinc-700">
          Name
          <span className="ml-1 text-[11px] font-normal text-zinc-400">(defaults to Anonymous on reviews)</span>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Anonymous"
            maxLength={60}
            className="mt-1.5 h-10 w-full rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-500"
          />
        </label>

        {/* Profile picture toggle */}
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-zinc-900">Show Google profile picture</div>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                {showAvatar
                  ? "Your Google photo is visible on your reviews."
                  : "Hidden by default. Reviews show an anonymous icon."}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={showAvatar}
              onClick={() => setShowAvatar(!showAvatar)}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                showAvatar ? "bg-zinc-950" : "bg-zinc-300"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                  showAvatar ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>
        </div>

        <label className="block text-xs font-bold text-zinc-700">
          About you
          <textarea
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            maxLength={240}
            placeholder="A line about what you know around Bengaluru"
            className="mt-1.5 min-h-20 w-full rounded-md border border-zinc-200 p-3 text-sm outline-none focus:border-zinc-500"
          />
        </label>

        {error ? <p className="text-xs text-red-600">{error}</p> : null}

        <button
          disabled={saving}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-zinc-950 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Pencil className="h-3.5 w-3.5" />
          {saving ? "Saving..." : "Save profile"}
        </button>
      </form>

      <button
        type="button"
        onClick={onSignOut}
        className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900"
      >
        <LogOut className="h-3.5 w-3.5" />Sign out
      </button>
    </div>
  );
}

function SuggestedPlacePanel({
  suggestion,
  userLocation,
  configured,
  signedIn,
  onSignIn,
  onPublishReview,
  onPinAndReview,
  onViewBengaluru,
}: {
  suggestion: SuggestedMapPlace;
  userLocation: { lat: number; lng: number } | null;
  configured: boolean;
  signedIn: boolean;
  onSignIn: () => void;
  onPublishReview: (input: { body: string; rating: number | null; imageUrl?: string | null; makeLegit?: boolean }) => Promise<void>;
  onPinAndReview: () => void;
  onViewBengaluru: () => void;
}) {
  const cat = suggestion.category ?? "other";
  const initial = cat === "other" ? "+" : cat[0].toUpperCase();
  const distLabel = userLocation
    ? formatDistance(haversineM(userLocation.lat, userLocation.lng, suggestion.lat, suggestion.lng))
    : null;
  const insideBengaluru = isBengaluruCoord(suggestion.lat, suggestion.lng);

  return (
    <div className="flex h-full min-h-[34dvh] flex-col">
      <div className="border-b border-zinc-200 px-5 py-5">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border-2 border-dashed border-zinc-400 bg-zinc-900/45 text-lg font-black text-white">
            {initial}
          </span>
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">
              Suggested spot · {getCategoryName(cat)}
            </span>
            <h1 className="mt-0.5 text-lg font-black tracking-tight leading-tight">{suggestion.title}</h1>
          </div>
        </div>
        {suggestion.subtitle && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>{suggestion.subtitle}</span>
          </p>
        )}
        {distLabel && (
          <p className="mt-1 text-[11px] font-semibold text-zinc-600">{distLabel} from your location</p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {insideBengaluru ? (
          <>
            <div className="mb-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3.5">
              <p className="text-xs font-bold text-zinc-950">Write the first review</p>
              <p className="mt-1 text-[11px] leading-4 text-zinc-600">
                Publishing a review automatically turns{" "}
                <span className="font-semibold text-zinc-900">{suggestion.title}</span> into a permanent NoCap dot.
              </p>
            </div>

            <ReviewComposer
              key={suggestion.id}
              configured={configured}
              signedIn={signedIn}
              onSignIn={onSignIn}
              onPublish={onPublishReview}
              defaultExpanded
            />

            <button
              type="button"
              onClick={onPinAndReview}
              className="mt-1 inline-flex items-center gap-1.5 px-1 py-1 text-[11px] font-semibold text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              <Pin className="h-3 w-3" />
              <span>Edit spot name or category first</span>
            </button>
          </>
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <h2 className="text-sm font-bold text-zinc-950">Outside Bengaluru</h2>
            <p className="mt-1.5 text-[11px] leading-5 text-zinc-500">
              Pinning permanent spots and writing local reviews is currently open within Bengaluru.
            </p>
            <button
              type="button"
              onClick={onViewBengaluru}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 py-2.5 text-xs font-bold text-white hover:bg-zinc-800 transition-colors"
            >
              <Navigation className="h-3.5 w-3.5" />
              <span>Explore Bengaluru dots</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PinPlaceForm({ location, accessToken, initialName = "", initialAddress = "", initialCategory, onCancel, onSubmit, onSignIn }: {
  location: { lat: number; lng: number };
  accessToken: string | null;
  initialName?: string;
  initialAddress?: string;
  initialCategory?: NocapPlaceCategory;
  onCancel: () => void;
  onSubmit: (input: { name: string; category: NocapPlaceCategory; customCategory?: string; address: string }) => Promise<void>;
  onSignIn?: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState<string>(initialCategory && ["eat", "street", "park", "culture", "other"].includes(initialCategory) ? initialCategory : "eat");
  const [customCategory, setCustomCategory] = useState("");
  const [address, setAddress] = useState(initialAddress);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialName) setName(initialName);
    if (initialAddress) setAddress(initialAddress);
    if (initialCategory && ["eat", "street", "park", "culture", "other"].includes(initialCategory)) {
      setCategory(initialCategory);
    }
  }, [initialName, initialAddress, initialCategory]);

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

function SearchSuggestionsDropdown({
  query,
  matchingDots,
  mapSuggestions,
  loadingMap,
  reviewCounts,
  onSelectDot,
  onExploreMapSuggestion,
  onSelectMapSuggestion,
  isMobile = false,
}: {
  query: string;
  matchingDots: Array<{ type: "place"; place: NocapPlace } | { type: "userPlace"; place: NocapUserPlace }>;
  mapSuggestions: Array<{ id: string; title: string; subtitle: string; lat: number; lng: number; category?: NocapPlaceCategory }>;
  loadingMap: boolean;
  reviewCounts: Map<string, number>;
  onSelectDot: (item: { type: "place"; place: NocapPlace } | { type: "userPlace"; place: NocapUserPlace }) => void;
  onExploreMapSuggestion: (suggestion: { id: string; title: string; subtitle: string; lat: number; lng: number; category?: NocapPlaceCategory }) => void;
  onSelectMapSuggestion: (suggestion: { id: string; title: string; subtitle: string; lat: number; lng: number; category?: NocapPlaceCategory }) => void;
  isMobile?: boolean;
}) {
  return (
    <div
      className={cn(
        "absolute z-50 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl divide-y divide-zinc-100",
        isMobile
          ? "left-0 right-0 top-full mt-2 max-h-[65vh] overflow-y-auto"
          : "left-0 right-0 top-full mt-1.5 max-h-[460px] overflow-y-auto"
      )}
    >
      {/* ── Section 1: Places on NoCap (Existing dots) ── */}
      <div>
        <div className="flex items-center justify-between bg-zinc-50/90 px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-600 border-b border-zinc-100">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
            Places on NoCap
          </span>
          <span className="text-[10px] font-semibold text-zinc-400">
            {matchingDots.length > 0 ? `${matchingDots.length} found` : "None"}
          </span>
        </div>

        {matchingDots.length > 0 ? (
          <div className="divide-y divide-zinc-50">
            {matchingDots.map((item) => {
              const id = item.type === "place" ? item.place.id : item.place.id;
              const name = item.place.name;
              const sub = item.type === "place" ? (item.place.address || item.place.area) : (item.place.address || "Bengaluru");
              const category = item.type === "place" ? getCategoryName(item.place.category) : "Community";
              const count = item.type === "place" ? (reviewCounts.get(item.place.id) ?? 0) : 0;

              return (
                <button
                  key={`dot-${item.type}-${id}`}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelectDot(item);
                  }}
                  className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-zinc-50 active:bg-zinc-100 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-bold text-zinc-900 group-hover:text-zinc-950">
                        {name}
                      </span>
                      <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold bg-zinc-100 text-zinc-600">
                        {category}
                      </span>
                    </div>
                    <p className="truncate text-[11px] text-zinc-500 mt-0.5">
                      {sub}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5">
                    {count > 0 ? (
                      <span className="rounded-full bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        {count} {count === 1 ? "take" : "takes"}
                      </span>
                    ) : (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
                        View dot
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="px-3.5 py-2.5 text-xs text-zinc-400 italic">
            No existing dots match &ldquo;{query}&rdquo;
          </div>
        )}
      </div>

      {/* ── Section 2: Bengaluru Map Search ── */}
      <div>
        <div className="flex items-center justify-between bg-blue-50/70 px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-blue-900 border-b border-blue-100/60">
          <span className="flex items-center gap-1.5">
            <Navigation className="h-3 w-3 text-blue-600" />
            Bengaluru Map Search
          </span>
          <span className="text-[10px] font-medium normal-case text-blue-600">
            Tap to view area · 3 km
          </span>
        </div>

        {loadingMap ? (
          <div className="flex items-center gap-2 px-3.5 py-3 text-xs text-zinc-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
            <span>Searching locations across Bengaluru...</span>
          </div>
        ) : mapSuggestions.length > 0 ? (
          <div className="divide-y divide-zinc-50">
            {mapSuggestions.map((s) => (
              <div
                key={s.id}
                className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 hover:bg-blue-50/40 transition-colors group"
              >
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onExploreMapSuggestion(s);
                  }}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-xs font-bold text-zinc-900 group-hover:text-blue-950">
                    {s.title}
                  </p>
                  <p className="truncate text-[11px] text-zinc-500 mt-0.5">
                    {s.subtitle || "Bengaluru, Karnataka"}
                  </p>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelectMapSuggestion(s);
                  }}
                  title="Pin this location on NoCap"
                  className="shrink-0 flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700 border border-blue-200/70 hover:bg-blue-600 hover:text-white transition-colors"
                >
                  <Pin className="h-3 w-3" />
                  Pin here
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-3.5 py-3 text-xs text-zinc-400">
            No locations found on map for this query. Try a nearby landmark or street name.
          </div>
        )}
      </div>
    </div>
  );
}
