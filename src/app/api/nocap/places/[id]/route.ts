import { findNocapPlace } from "@/lib/nocap/places";
import { getArchivedPlaceReviews } from "@/lib/nocap/local-evidence";
import { getArchivedPersonNotes, memoryPersonNotesStore } from "@/lib/nocap/person-notes";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { NocapPersonNote, NocapReview } from "@/lib/nocap/community";

export async function GET(_request: Request, context: RouteContext<"/api/nocap/places/[id]">) {
  const { id } = await context.params;
  const place = findNocapPlace(id);
  if (!place) return Response.json({ error: "Place not found" }, { status: 404 });

  const archivedReviews = await getArchivedPlaceReviews(place);
  const archivedPersonNotes = getArchivedPersonNotes(id);

  if (!isSupabaseConfigured()) {
    const memoryForPlace = memoryPersonNotesStore.filter((p) => p.placeId === id);
    return Response.json({
      place,
      reviews: archivedReviews,
      personNotes: [...memoryForPlace, ...archivedPersonNotes],
      status: "ready",
      supabaseConfigured: false,
    });
  }

  const admin = createAdminClient();

  let reviews: NocapReview[] = [];
  try {
    const { data: reviewData, error: reviewErr } = await admin
      .from("nocap_reviews")
      .select("id, place_id, body, rating, image_url, latitude, longitude, is_legit, payment_id, created_at, updated_at, nocap_profiles!inner(id, display_name, avatar_url, bio)")
      .eq("place_id", id)
      .order("is_legit", { ascending: false })
      .order("created_at", { ascending: false });

    if (!reviewErr && reviewData) {
      reviews = reviewData.map(toReview);
    } else {
      const { data: fallbackData } = await admin
        .from("nocap_reviews")
        .select("id, place_id, body, rating, latitude, longitude, is_legit, payment_id, created_at, updated_at, nocap_profiles!inner(id, display_name, avatar_url, bio)")
        .eq("place_id", id)
        .order("is_legit", { ascending: false })
        .order("created_at", { ascending: false });
      reviews = (fallbackData ?? []).map(toReview);
    }
  } catch {
    // Ignore
  }

  let personNotes: NocapPersonNote[] = [];
  try {
    const { data: pData, error: pErr } = await admin
      .from("nocap_person_notes")
      .select("id, place_id, person_name, description, photo_url, created_at, updated_at, nocap_profiles!inner(id, display_name, avatar_url, bio)")
      .eq("place_id", id)
      .order("created_at", { ascending: false });
    if (!pErr && Array.isArray(pData)) {
      personNotes = pData.map(toPersonNote);
    }
  } catch {
    // Ignore
  }

  const memoryForPlace = memoryPersonNotesStore.filter((p) => p.placeId === id);
  const allPersonNotes = [...memoryForPlace, ...personNotes, ...archivedPersonNotes];
  const uniquePersonNotes = Array.from(new Map(allPersonNotes.map((p) => [p.id, p])).values());

  return Response.json({
    place,
    reviews: [...reviews, ...archivedReviews],
    personNotes: uniquePersonNotes,
    status: "ready",
    supabaseConfigured: true,
  });
}

function toReview(review: Record<string, unknown>): NocapReview {
  const profile = review.nocap_profiles as { id: string; display_name: string; avatar_url: string | null; bio: string | null };
  return {
    id: String(review.id),
    placeId: String(review.place_id),
    body: String(review.body),
    rating: review.rating !== null && review.rating !== undefined ? Number(review.rating) : null,
    latitude: Number(review.latitude),
    longitude: Number(review.longitude),
    isLegit: Boolean(review.is_legit),
    paymentId: review.payment_id ? String(review.payment_id) : null,
    imageUrl: review.image_url ? String(review.image_url) : null,
    createdAt: String(review.created_at),
    updatedAt: String(review.updated_at),
    profile: { id: profile.id, displayName: profile.display_name || "Anonymous", avatarUrl: profile.avatar_url, bio: profile.bio },
  };
}

function toPersonNote(row: Record<string, unknown>): NocapPersonNote {
  const rawProfile = row.nocap_profiles;
  const profile = (Array.isArray(rawProfile) ? rawProfile[0] : rawProfile) as
    | { id: string; display_name: string; avatar_url: string | null; bio: string | null }
    | undefined;
  return {
    id: String(row.id),
    placeId: String(row.place_id),
    personName: String(row.person_name),
    description: String(row.description),
    photoUrl: row.photo_url ? String(row.photo_url) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    profile: { id: profile?.id || "anon", displayName: profile?.display_name || "Anonymous", avatarUrl: profile?.avatar_url || null, bio: profile?.bio || null },
  };
}
