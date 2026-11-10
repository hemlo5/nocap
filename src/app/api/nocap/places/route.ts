import { nocapPlaces } from "@/lib/nocap/places";
import { getAllArchivedReviews } from "@/lib/nocap/local-evidence";
import { INITIAL_PERSON_NOTES, memoryPersonNotesStore } from "@/lib/nocap/person-notes";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { NocapPersonNote, NocapReview, NocapUserPlace } from "@/lib/nocap/community";
import type { NocapPlaceCategory } from "@/lib/nocap/places";

export async function GET() {
  let reviews: NocapReview[] = [];
  let userPlaces: NocapUserPlace[] = [];
  let personNotes: NocapPersonNote[] = [];

  if (isSupabaseConfigured()) {
    const admin = createAdminClient();

    // Fetch reviews — legit first, then newest
    try {
      const { data: reviewData, error: reviewErr } = await admin
        .from("nocap_reviews")
        .select("id, place_id, body, rating, image_url, latitude, longitude, is_legit, payment_id, created_at, updated_at, nocap_profiles!inner(id, display_name, avatar_url, bio)")
        .order("is_legit", { ascending: false })
        .order("created_at", { ascending: false });

      if (!reviewErr && reviewData) {
        reviews = reviewData.map(toReview);
      } else {
        // Fallback if image_url column doesn't exist
        const { data: fallbackReviewData } = await admin
          .from("nocap_reviews")
          .select("id, place_id, body, rating, latitude, longitude, is_legit, payment_id, created_at, updated_at, nocap_profiles!inner(id, display_name, avatar_url, bio)")
          .order("is_legit", { ascending: false })
          .order("created_at", { ascending: false });
        reviews = (fallbackReviewData ?? []).map(toReview);
      }
    } catch {
      // Ignore
    }

    // Fetch user-pinned places
    try {
      const { data: placesData } = await admin
        .from("nocap_user_places")
        .select("id, profile_id, name, category, address, latitude, longitude, created_at, nocap_profiles!inner(id, display_name, avatar_url, bio)")
        .order("created_at", { ascending: false })
        .limit(500);
      userPlaces = (placesData ?? []).map(toUserPlace);
    } catch {
      // Ignore
    }

    // Fetch person notes
    try {
      const { data: personNotesData, error: pErr } = await admin
        .from("nocap_person_notes")
        .select("id, place_id, person_name, description, photo_url, created_at, updated_at, nocap_profiles!inner(id, display_name, avatar_url, bio)")
        .order("created_at", { ascending: false });
      if (!pErr && Array.isArray(personNotesData)) {
        personNotes = personNotesData.map(toPersonNote);
      }
    } catch {
      // Ignore
    }
  }

  // Include all archived community notes/reviews from Reddit
  const archivedReviews = await getAllArchivedReviews();
  reviews = [...reviews, ...archivedReviews];

  // Merge person notes with initial seeds and in-memory store
  const allPersonNotes = [...memoryPersonNotesStore, ...personNotes, ...INITIAL_PERSON_NOTES];
  const uniquePersonNotes = Array.from(new Map(allPersonNotes.map((p) => [p.id, p])).values());

  return Response.json(
    { places: nocapPlaces, userPlaces, reviews, personNotes: uniquePersonNotes, supabaseConfigured: isSupabaseConfigured(), updatedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
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

function toUserPlace(row: Record<string, unknown>): NocapUserPlace {
  const profile = row.nocap_profiles as { id: string; display_name: string; avatar_url: string | null; bio: string | null };
  return {
    id: String(row.id),
    profileId: String(row.profile_id),
    profile: { id: profile.id, displayName: profile.display_name || "Anonymous", avatarUrl: profile.avatar_url, bio: profile.bio },
    name: String(row.name),
    category: row.category as NocapPlaceCategory,
    address: String(row.address ?? ""),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    createdAt: String(row.created_at),
  };
}
