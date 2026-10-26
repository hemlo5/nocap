import { findNocapPlace } from "@/lib/nocap/places";
import { getArchivedPlaceReviews } from "@/lib/nocap/local-evidence";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { NocapReview } from "@/lib/nocap/community";

export async function GET(_request: Request, context: RouteContext<"/api/nocap/places/[id]">) {
  const { id } = await context.params;
  const place = findNocapPlace(id);
  if (!place) return Response.json({ error: "Place not found" }, { status: 404 });

  const archivedReviews = await getArchivedPlaceReviews(place);
  if (!isSupabaseConfigured()) return Response.json({ place, reviews: archivedReviews, status: "ready", supabaseConfigured: false });

  const { data } = await createAdminClient()
    .from("nocap_reviews")
    .select("id, place_id, body, rating, latitude, longitude, is_legit, payment_id, created_at, updated_at, nocap_profiles!inner(id, display_name, avatar_url, bio)")
    .eq("place_id", id)
    .order("is_legit", { ascending: false })
    .order("created_at", { ascending: false });
  return Response.json({ place, reviews: [...(data ?? []).map((review) => toReview(review)), ...archivedReviews], status: "ready", supabaseConfigured: true });
}

function toReview(review: Record<string, unknown>): NocapReview {
  const profile = review.nocap_profiles as { id: string; display_name: string; avatar_url: string | null; bio: string | null };
  return {
    id: String(review.id), placeId: String(review.place_id), body: String(review.body), rating: Number(review.rating),
    latitude: Number(review.latitude), longitude: Number(review.longitude),
    isLegit: Boolean(review.is_legit), paymentId: review.payment_id ? String(review.payment_id) : null,
    createdAt: String(review.created_at), updatedAt: String(review.updated_at),
    profile: { id: profile.id, displayName: profile.display_name || "Anonymous", avatarUrl: profile.avatar_url, bio: profile.bio },
  };
}
