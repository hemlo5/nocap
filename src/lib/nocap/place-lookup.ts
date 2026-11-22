import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  nocapPlaces,
  findNocapPlace,
  slugifyPlaceName,
  slugifyArea,
  type NocapPlaceCategory,
  categoryDetails,
} from "@/lib/nocap/places";
import { getArchivedPlaceReviews } from "@/lib/nocap/local-evidence";
import { getArchivedPersonNotes, memoryPersonNotesStore } from "@/lib/nocap/person-notes";
import type { NocapPersonNote, NocapReview, NocapProfile } from "@/lib/nocap/community";

export type UnifiedPlace = {
  id: string;
  slug: string;
  name: string;
  category: NocapPlaceCategory;
  categoryName: string;
  area: string;
  areaSlug: string;
  address: string;
  latitude: number;
  longitude: number;
  isCommunity: boolean;
  profile?: NocapProfile;
  createdAt?: string;
  aliases?: string[];
  searchQuery?: string;
};

function extractAreaFromAddress(address: string, fallback = "Bengaluru"): string {
  if (!address || !address.trim()) return fallback;
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    // If last part is "Bengaluru" or "Karnataka", take the part before it
    const last = parts[parts.length - 1].toLowerCase();
    if ((last.includes("bengaluru") || last.includes("bangalore") || last.includes("karnataka")) && parts.length >= 2) {
      return parts[parts.length - 2];
    }
    return parts[0];
  }
  return parts[0] || fallback;
}

export function toUnifiedCuratedPlace(place: import("./places").NocapPlace): UnifiedPlace {
  const areaSlug = slugifyArea(place.area);
  const cat = categoryDetails[place.category];
  return {
    id: place.id,
    slug: place.id,
    name: place.name,
    category: place.category,
    categoryName: cat?.name ?? place.category,
    area: place.area,
    areaSlug,
    address: place.address,
    latitude: place.latitude,
    longitude: place.longitude,
    isCommunity: false,
    aliases: place.aliases,
    searchQuery: place.searchQuery,
  };
}

export function toUnifiedUserPlace(row: Record<string, unknown>): UnifiedPlace {
  const profileRaw = row.nocap_profiles as { id: string; display_name: string; avatar_url: string | null; bio: string | null } | undefined;
  const rawName = String(row.name ?? "Untitled Place");
  const rawAddress = String(row.address ?? "Bengaluru");
  const rawCategory = (row.category as NocapPlaceCategory) || "other";
  const area = extractAreaFromAddress(rawAddress);
  const areaSlug = slugifyArea(area);
  const slug = slugifyPlaceName(rawName) || String(row.id);
  const cat = categoryDetails[rawCategory];

  return {
    id: String(row.id),
    slug,
    name: rawName,
    category: rawCategory,
    categoryName: cat?.name ?? (rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1)),
    area,
    areaSlug,
    address: rawAddress,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    isCommunity: true,
    createdAt: row.created_at ? String(row.created_at) : undefined,
    profile: profileRaw
      ? {
          id: profileRaw.id,
          displayName: profileRaw.display_name || "Anonymous",
          avatarUrl: profileRaw.avatar_url || null,
          bio: profileRaw.bio || null,
        }
      : undefined,
  };
}

export async function resolvePlaceBySlug(rawSlug: string): Promise<UnifiedPlace | null> {
  const decoded = decodeURIComponent(rawSlug).trim().toLowerCase();
  if (!decoded) return null;

  // 1. Check curated places by ID, slugified name, or aliases
  const curated = nocapPlaces.find((p) => {
    if (p.id.toLowerCase() === decoded) return true;
    if (slugifyPlaceName(p.name) === decoded) return true;
    if (p.aliases?.some((a) => slugifyPlaceName(a) === decoded || a.toLowerCase() === decoded)) return true;
    return false;
  });
  if (curated) {
    return toUnifiedCuratedPlace(curated);
  }

  // 2. Check community user places in Supabase
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const admin = createAdminClient();
    const cleanId = decoded.startsWith("user:") ? decoded.slice(5) : decoded;

    // Direct UUID match
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
    if (isUuid) {
      const { data: row, error } = await admin
        .from("nocap_user_places")
        .select("id, profile_id, name, category, address, latitude, longitude, created_at, nocap_profiles!inner(id, display_name, avatar_url, bio)")
        .eq("id", cleanId)
        .maybeSingle();
      if (!error && row) {
        return toUnifiedUserPlace(row);
      }
    }

    // Query user places by name or slug match
    const { data: rows, error: rowsErr } = await admin
      .from("nocap_user_places")
      .select("id, profile_id, name, category, address, latitude, longitude, created_at, nocap_profiles!inner(id, display_name, avatar_url, bio)")
      .order("created_at", { ascending: false })
      .limit(500);

    if (!rowsErr && Array.isArray(rows) && rows.length > 0) {
      // 1. Exact slug match
      const exact = rows.find((r) => slugifyPlaceName(String(r.name)) === decoded);
      if (exact) return toUnifiedUserPlace(exact);

      // 2. Suffix match (e.g. slug-8charUuid)
      const suffixMatch = rows.find((r) => {
        const base = slugifyPlaceName(String(r.name));
        const shortId = String(r.id).slice(0, 8);
        return decoded === `${base}-${shortId}` || decoded.endsWith(shortId);
      });
      if (suffixMatch) return toUnifiedUserPlace(suffixMatch);

      // 3. Partial prefix match
      const prefixMatch = rows.find((r) => {
        const base = slugifyPlaceName(String(r.name));
        return (base.length >= 4 && decoded.startsWith(base)) || (decoded.length >= 4 && base.startsWith(decoded));
      });
      if (prefixMatch) return toUnifiedUserPlace(prefixMatch);
    }
  } catch (err) {
    console.error("[NoCap] Error resolving place by slug:", err);
  }

  return null;
}

export async function fetchPlaceReviewsAndNotes(place: UnifiedPlace): Promise<{
  reviews: NocapReview[];
  personNotes: NocapPersonNote[];
}> {
  let archivedReviews: NocapReview[] = [];
  let archivedNotes: NocapPersonNote[] = [];

  // If curated place, load archived local evidence & person notes
  if (!place.isCommunity) {
    const curated = findNocapPlace(place.id);
    if (curated) {
      try {
        archivedReviews = await getArchivedPlaceReviews(curated);
      } catch {}
    }
    archivedNotes = getArchivedPersonNotes(place.id);
  }

  let dbReviews: NocapReview[] = [];
  let dbPersonNotes: NocapPersonNote[] = [];

  if (isSupabaseConfigured()) {
    try {
      const admin = createAdminClient();
      const placeIds = place.isCommunity
        ? [place.id, `user:${place.id}`]
        : [place.id];

      // Query reviews
      try {
        const { data, error } = await admin
          .from("nocap_reviews")
          .select("id, place_id, body, rating, image_url, latitude, longitude, accuracy_meters, is_legit, payment_id, created_at, updated_at, nocap_profiles!inner(id, display_name, avatar_url, bio)")
          .in("place_id", placeIds)
          .order("is_legit", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(100);

        if (!error && Array.isArray(data)) {
          dbReviews = data.map(toReview);
        } else {
          // Fallback if image_url column isn't in PostgREST schema cache
          const { data: fallbackData } = await admin
            .from("nocap_reviews")
            .select("id, place_id, body, rating, latitude, longitude, accuracy_meters, is_legit, payment_id, created_at, updated_at, nocap_profiles!inner(id, display_name, avatar_url, bio)")
            .in("place_id", placeIds)
            .order("is_legit", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(100);
          if (Array.isArray(fallbackData)) {
            dbReviews = fallbackData.map(toReview);
          }
        }
      } catch (err) {
        console.error("[NoCap] Error querying reviews:", err);
      }

      // Query person notes
      try {
        const { data, error } = await admin
          .from("nocap_person_notes")
          .select("id, place_id, person_name, description, photo_url, created_at, updated_at, nocap_profiles!inner(id, display_name, avatar_url, bio)")
          .in("place_id", placeIds)
          .order("created_at", { ascending: false })
          .limit(50);

        if (!error && Array.isArray(data)) {
          dbPersonNotes = data.map(toPersonNote);
        }
      } catch (err) {
        console.error("[NoCap] Error querying person notes:", err);
      }
    } catch (err) {
      console.error("[NoCap] Supabase client error in place lookup:", err);
    }
  }

  // Also include in-memory person notes if any
  const memoryNotes = memoryPersonNotesStore.filter(
    (n) => n.placeId === place.id || n.placeId === `user:${place.id}`
  );

  // Combine and deduplicate
  const combinedReviews = [...dbReviews, ...archivedReviews];
  const uniqueReviews = Array.from(new Map(combinedReviews.map((r) => [r.id, r])).values());

  const combinedNotes = [...memoryNotes, ...dbPersonNotes, ...archivedNotes];
  const uniqueNotes = Array.from(new Map(combinedNotes.map((n) => [n.id, n])).values());

  return {
    reviews: uniqueReviews,
    personNotes: uniqueNotes,
  };
}

export async function getAllPlacesForSitemap(): Promise<Array<{ slug: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" }>> {
  const curatedEntries = nocapPlaces.map((p) => ({
    slug: p.id,
    priority: 0.75,
    changeFrequency: "weekly" as const,
  }));

  if (!isSupabaseConfigured()) {
    return curatedEntries;
  }

  try {
    const admin = createAdminClient();
    const { data: userPlaces } = await admin
      .from("nocap_user_places")
      .select("id, name, created_at")
      .order("created_at", { ascending: false })
      .limit(500);

    if (Array.isArray(userPlaces)) {
      const userEntries = userPlaces.map((up) => ({
        slug: slugifyPlaceName(String(up.name)) || String(up.id),
        priority: 0.7,
        changeFrequency: "weekly" as const,
      }));
      return [...curatedEntries, ...userEntries];
    }
  } catch (err) {
    console.error("[NoCap] Sitemap places fetch error:", err);
  }

  return curatedEntries;
}

function toReview(review: Record<string, unknown>): NocapReview {
  const profileRaw = review.nocap_profiles;
  const p = (Array.isArray(profileRaw) ? profileRaw[0] : profileRaw) as
    | { id: string; display_name: string; avatar_url: string | null; bio: string | null }
    | undefined;

  return {
    id: String(review.id),
    placeId: String(review.place_id),
    body: String(review.body ?? ""),
    rating: review.rating !== null && review.rating !== undefined ? Number(review.rating) : null,
    latitude: Number(review.latitude ?? 0),
    longitude: Number(review.longitude ?? 0),
    isLegit: Boolean(review.is_legit),
    paymentId: review.payment_id ? String(review.payment_id) : null,
    imageUrl: review.image_url ? String(review.image_url) : null,
    createdAt: String(review.created_at ?? new Date().toISOString()),
    updatedAt: String(review.updated_at ?? new Date().toISOString()),
    profile: {
      id: p?.id ?? "anon",
      displayName: p?.display_name || "Bengaluru Local",
      avatarUrl: p?.avatar_url ?? null,
      bio: p?.bio ?? null,
    },
  };
}

function toPersonNote(row: Record<string, unknown>): NocapPersonNote {
  const profileRaw = row.nocap_profiles;
  const p = (Array.isArray(profileRaw) ? profileRaw[0] : profileRaw) as
    | { id: string; display_name: string; avatar_url: string | null; bio: string | null }
    | undefined;

  return {
    id: String(row.id),
    placeId: String(row.place_id),
    personName: String(row.person_name ?? "Local Legend"),
    description: String(row.description ?? ""),
    photoUrl: row.photo_url ? String(row.photo_url) : null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
    profile: {
      id: p?.id ?? "anon",
      displayName: p?.display_name || "Local Scout",
      avatarUrl: p?.avatar_url ?? null,
      bio: p?.bio ?? null,
    },
  };
}
