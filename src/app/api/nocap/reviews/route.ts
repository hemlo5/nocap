import { findNocapPlace } from "@/lib/nocap/places";
import { createAdminClient, getGoogleUser, isSupabaseConfigured } from "@/lib/supabase/server";
import type { NocapReview } from "@/lib/nocap/community";

const maxAccuracyMeters = 500; // relaxed — covers wifi/desktop
const minimumReviewLength = 8;
const maximumReviewLength = 1200;

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return Response.json({ error: "Supabase is not configured." }, { status: 503 });
  const user = await getGoogleUser(request);
  if (!user) return Response.json({ error: "Sign in with Google to share a review." }, { status: 401 });
  const input = await request.json().catch(() => null) as ReviewInput | null;
  const validation = await validateInput(input);
  if (validation instanceof Response) return validation;
  const { placeId, placeLat, placeLng, body, rating, latitude, longitude, accuracyMeters } = validation;

  const admin = createAdminClient();
  await ensureProfile(admin, user);
  let upsertResult = await admin.from("nocap_reviews")
    .upsert(
      { profile_id: user.id, place_id: placeId, body, rating, latitude, longitude, accuracy_meters: accuracyMeters, updated_at: new Date().toISOString() },
      { onConflict: "profile_id,place_id" }
    )
    .select("id, place_id, body, rating, latitude, longitude, is_legit, payment_id, created_at, updated_at, nocap_profiles!inner(id, display_name, avatar_url, bio)")
    .single();

  if (upsertResult.error && (upsertResult.error.code === "23502" || upsertResult.error.code === "23514") && rating === null) {
    // If rating column still has old NOT NULL constraint, fallback to 5
    upsertResult = await admin.from("nocap_reviews")
      .upsert(
        { profile_id: user.id, place_id: placeId, body, rating: 5, latitude, longitude, accuracy_meters: accuracyMeters, updated_at: new Date().toISOString() },
        { onConflict: "profile_id,place_id" }
      )
      .select("id, place_id, body, rating, latitude, longitude, is_legit, payment_id, created_at, updated_at, nocap_profiles!inner(id, display_name, avatar_url, bio)")
      .single();
  }

  const { data, error } = upsertResult;
  if (error || !data) return Response.json({ error: "Could not publish your review." }, { status: 500 });
  return Response.json({ review: toReview(data) });
}

type ReviewInput = { placeId?: unknown; userPlaceId?: unknown; body?: unknown; rating?: unknown; latitude?: unknown; longitude?: unknown; accuracyMeters?: unknown };

async function validateInput(input: ReviewInput | null) {
  const body = typeof input?.body === "string" ? input.body.trim() : "";
  const rawRating = input?.rating;
  const rating = (rawRating === null || rawRating === undefined || rawRating === "") ? null : Number(rawRating);
  const latitude = Number(input?.latitude);
  const longitude = Number(input?.longitude);
  const accuracyMeters = Number(input?.accuracyMeters);

  if (body.length < minimumReviewLength || body.length > maximumReviewLength)
    return Response.json({ error: `Write between ${minimumReviewLength} and ${maximumReviewLength} characters.` }, { status: 400 });
  if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5))
    return Response.json({ error: "Choose a rating from 1 to 5, or leave it blank." }, { status: 400 });

  // Check both hardcoded places and user-pinned places
  let placeLat = 12.9716;
  let placeLng = 77.5946;
  let targetPlaceId: string | null = null;

  const hardcodedPlace = typeof input?.placeId === "string" ? findNocapPlace(input.placeId) : null;
  if (hardcodedPlace) {
    targetPlaceId = hardcodedPlace.id;
    placeLat = hardcodedPlace.latitude;
    placeLng = hardcodedPlace.longitude;
  } else {
    const userPlaceId = typeof input?.userPlaceId === "string" ? input.userPlaceId : null;
    if (userPlaceId) {
      const admin = createAdminClient();
      const { data: userPlace } = await admin.from("nocap_user_places").select("id, latitude, longitude").eq("id", userPlaceId).single();
      if (userPlace) {
        targetPlaceId = `user:${userPlace.id}`;
        placeLat = Number(userPlace.latitude);
        placeLng = Number(userPlace.longitude);
      }
    }
  }

  if (!targetPlaceId) return Response.json({ error: "Choose a place from the map." }, { status: 400 });

  const finalLat = Number.isFinite(latitude) ? latitude : placeLat;
  const finalLng = Number.isFinite(longitude) ? longitude : placeLng;
  const finalAccuracy = Number.isFinite(accuracyMeters) && accuracyMeters > 0 ? accuracyMeters : 15;

  return { placeId: targetPlaceId, placeLat, placeLng, body, rating, latitude: finalLat, longitude: finalLng, accuracyMeters: finalAccuracy };
}

async function ensureProfile(admin: ReturnType<typeof createAdminClient>, user: { id: string; user_metadata: Record<string, unknown> }) {
  const candidate = user.user_metadata.full_name ?? user.user_metadata.name ?? user.user_metadata.user_name;
  const displayName = typeof candidate === "string" && candidate.trim() ? candidate.trim().slice(0, 60) : "NoCap local";
  const avatar = user.user_metadata.avatar_url ?? user.user_metadata.picture;
  await admin.from("nocap_profiles").upsert({ id: user.id, display_name: displayName, avatar_url: typeof avatar === "string" ? avatar : null });
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
    profile: { id: profile.id, displayName: profile.display_name, avatarUrl: profile.avatar_url, bio: profile.bio },
  };
}

function distanceBetween(latitudeA: number, longitudeA: number, latitudeB: number, longitudeB: number) {
  const radians = Math.PI / 180;
  const latitudeDistance = (latitudeB - latitudeA) * radians;
  const longitudeDistance = (longitudeB - longitudeA) * radians;
  const a = Math.sin(latitudeDistance / 2) ** 2 + Math.cos(latitudeA * radians) * Math.cos(latitudeB * radians) * Math.sin(longitudeDistance / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
