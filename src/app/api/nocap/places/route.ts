import { nocapPlaces } from "@/lib/nocap/places";
import { getAllArchivedReviews } from "@/lib/nocap/local-evidence";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { NocapReview, NocapUserPlace } from "@/lib/nocap/community";
import type { NocapPlaceCategory } from "@/lib/nocap/places";

export async function GET() {
  let reviews: NocapReview[] = [];
  let userPlaces: NocapUserPlace[] = [];

  if (isSupabaseConfigured()) {
    const admin = createAdminClient();

    // Fetch reviews — legit first, then newest
    const { data: reviewData } = await admin
      .from("nocap_reviews")
      .select("id, place_id, body, rating, latitude, longitude, is_legit, payment_id, created_at, updated_at, nocap_profiles!inner(id, display_name, avatar_url, bio)")
      .order("is_legit", { ascending: false })
      .order("created_at", { ascending: false });
    reviews = (reviewData ?? []).map(toReview);

    // Fetch user-pinned places
    const { data: placesData } = await admin
      .from("nocap_user_places")
      .select("id, profile_id, name, category, address, latitude, longitude, created_at, nocap_profiles!inner(id, display_name, avatar_url, bio)")
      .order("created_at", { ascending: false })
      .limit(500);
    userPlaces = (placesData ?? []).map(toUserPlace);
  }

  // Include all archived community notes/reviews from Reddit
  const archivedReviews = await getAllArchivedReviews();
  reviews = [...reviews, ...archivedReviews];

  return Response.json(
    { places: nocapPlaces, userPlaces, reviews, supabaseConfigured: isSupabaseConfigured(), updatedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

function toReview(review: Record<string, unknown>): NocapReview {
  const profile = review.nocap_profiles as { id: string; display_name: string; avatar_url: string | null; bio: string | null };
  return {
    id: String(review.id),
    placeId: String(review.place_id),
    body: String(review.body),
    rating: Number(review.rating),
    latitude: Number(review.latitude),
    longitude: Number(review.longitude),
    isLegit: Boolean(review.is_legit),
    paymentId: review.payment_id ? String(review.payment_id) : null,
    createdAt: String(review.created_at),
    updatedAt: String(review.updated_at),
    profile: { id: profile.id, displayName: profile.display_name || "Anonymous", avatarUrl: profile.avatar_url, bio: profile.bio },
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
