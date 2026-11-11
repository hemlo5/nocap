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
  const { placeId, placeLat, placeLng, body, rating, imageUrl, latitude, longitude, accuracyMeters } = validation;

  const admin = createAdminClient();
  await ensureProfile(admin, user);

  const fullSelect =
    "id, place_id, body, rating, image_url, latitude, longitude, is_legit, payment_id, created_at, updated_at, nocap_profiles!inner(id, display_name, avatar_url, bio)";
  const noImageSelect =
    "id, place_id, body, rating, latitude, longitude, is_legit, payment_id, created_at, updated_at, nocap_profiles!inner(id, display_name, avatar_url, bio)";

  let includeImageColumn = true;
  let effectiveRating: number | null = rating;
  let effectiveAccuracy = accuracyMeters;
  let upsertResult: {
    data: Record<string, unknown> | null;
    error: { code?: string; message?: string; details?: string } | null;
  } = { data: null, error: null };

  for (let attempt = 0; attempt < 4; attempt++) {
    const payload: Record<string, unknown> = {
      profile_id: user.id,
      place_id: placeId,
      body,
      rating: effectiveRating,
      latitude,
      longitude,
      accuracy_meters: effectiveAccuracy,
      updated_at: new Date().toISOString(),
    };
    if (includeImageColumn) {
      payload.image_url = imageUrl;
    }

    const result = await admin
      .from("nocap_reviews")
      .upsert(payload, { onConflict: "profile_id,place_id" })
      .select(includeImageColumn ? fullSelect : noImageSelect)
      .single();

    upsertResult = {
      data: result.data as Record<string, unknown> | null,
      error: result.error,
    };

    const err = upsertResult.error;
    if (!err) break;

    const errMsg = `${err.message ?? ""} ${err.details ?? ""}`.toLowerCase();
    // Missing image_url column: PostgREST returns PGRST204 on upsert/insert and 42703 on select
    if (includeImageColumn && (err.code === "PGRST204" || err.code === "42703") && errMsg.includes("image_url")) {
      includeImageColumn = false;
      continue;
    }
    // Legacy NOT NULL rating column when rating is omitted
    if (effectiveRating === null && (err.code === "23502" || (err.code === "23514" && errMsg.includes("rating")))) {
      effectiveRating = 5;
      continue;
    }
    // Coarse desktop/Wi-Fi accuracy exceeding DB check constraint
    if (err.code === "23514" && errMsg.includes("accuracy_meters") && effectiveAccuracy > 15) {
      effectiveAccuracy = 15;
      continue;
    }
    break;
  }

  const { data, error } = upsertResult;
  if (error || !data) {
    console.error("[NoCap] Review upsert failed:", error);
    return Response.json({ error: "Could not publish your review." }, { status: 500 });
  }
  const review = toReview(data);
  if (!review.imageUrl && imageUrl) {
    review.imageUrl = imageUrl;
  }
  return Response.json({ review });
}

type ReviewInput = { placeId?: unknown; userPlaceId?: unknown; body?: unknown; rating?: unknown; imageUrl?: unknown; latitude?: unknown; longitude?: unknown; accuracyMeters?: unknown };

async function validateInput(input: ReviewInput | null) {
  const body = typeof input?.body === "string" ? input.body.trim() : "";
  const rawRating = input?.rating;
  const rating = (rawRating === null || rawRating === undefined || rawRating === "") ? null : Number(rawRating);
  const imageUrl = typeof input?.imageUrl === "string" && input.imageUrl.trim() ? input.imageUrl.trim() : null;
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
  const finalAccuracy =
    Number.isFinite(accuracyMeters) && accuracyMeters > 0
      ? Math.min(accuracyMeters, maxAccuracyMeters)
      : 15;

  return { placeId: targetPlaceId, placeLat, placeLng, body, rating, imageUrl, latitude: finalLat, longitude: finalLng, accuracyMeters: finalAccuracy };
}

async function ensureProfile(admin: ReturnType<typeof createAdminClient>, user: { id: string; user_metadata: Record<string, unknown> }) {
  const { data: existing } = await admin.from("nocap_profiles").select("id, display_name").eq("id", user.id).maybeSingle();
  if (!existing) {
    const { error } = await admin.from("nocap_profiles").upsert({ id: user.id, display_name: "Anonymous", avatar_url: null });
    if (error) console.error("[NoCap] ensureProfile upsert failed:", error);
  } else {
    const candidate = user.user_metadata.full_name ?? user.user_metadata.name ?? user.user_metadata.user_name;
    const rawGoogleName = typeof candidate === "string" && candidate.trim() ? candidate.trim().slice(0, 60) : "";
    if (rawGoogleName && existing.display_name === rawGoogleName) {
      await admin.from("nocap_profiles").update({ display_name: "Anonymous", avatar_url: null }).eq("id", user.id);
    }
  }
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

function distanceBetween(latitudeA: number, longitudeA: number, latitudeB: number, longitudeB: number) {
  const radians = Math.PI / 180;
  const latitudeDistance = (latitudeB - latitudeA) * radians;
  const longitudeDistance = (longitudeB - longitudeA) * radians;
  const a = Math.sin(latitudeDistance / 2) ** 2 + Math.cos(latitudeA * radians) * Math.cos(latitudeB * radians) * Math.sin(longitudeDistance / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
