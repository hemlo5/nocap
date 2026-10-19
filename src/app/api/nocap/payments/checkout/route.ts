import { findNocapPlace } from "@/lib/nocap/places";
import { createAdminClient, getGoogleUser, isSupabaseConfigured } from "@/lib/supabase/server";

const DODO_API_KEY = process.env.DODO_PAYMENTS_API_KEY;
const DODO_PRODUCT_ID = process.env.DODO_PAYMENTS_PRODUCT_ID;
const DODO_BASE =
  process.env.DODO_PAYMENTS_BASE_URL ||
  (DODO_API_KEY?.startsWith("test_") ? "https://test.dodopayments.com" : "https://live.dodopayments.com");

const maxAccuracyMeters = 500;
const minimumReviewLength = 8;
const maximumReviewLength = 1200;

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return Response.json({ error: "Supabase not configured." }, { status: 503 });
  if (!DODO_API_KEY || !DODO_PRODUCT_ID) return Response.json({ error: "Payments not configured on server." }, { status: 503 });

  const user = await getGoogleUser(request);
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });

  const input = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const origin = typeof input?.origin === "string" ? input.origin : "https://hemloai.com";

  const admin = createAdminClient();

  let metadata: Record<string, string> = {};
  let targetPlaceId = "";

  // ── Mode 1: Upgrade existing review ───────────────────────────────────────
  const reviewId = typeof input?.reviewId === "string" ? input.reviewId : null;
  if (reviewId) {
    const { data: review } = await admin
      .from("nocap_reviews")
      .select("id, profile_id, place_id, is_legit")
      .eq("id", reviewId)
      .single();

    if (!review) return Response.json({ error: "Review not found." }, { status: 404 });
    if (review.profile_id !== user.id) return Response.json({ error: "Not your review." }, { status: 403 });
    if (review.is_legit) return Response.json({ error: "Already legit." }, { status: 400 });

    targetPlaceId = review.place_id;
    metadata = {
      review_id: reviewId,
      user_id: user.id,
      place_id: targetPlaceId,
      type: "upgrade_review",
    };
  } else {
    // ── Mode 2: Brand new Legit review (NOT written to DB yet) ──────────────
    const validation = await validateLegitReviewInput(input, admin);
    if (validation instanceof Response) return validation;

    const { placeId, placeLat, placeLng, body, rating, latitude, longitude, accuracyMeters } = validation;
    const distanceMeters = distanceBetween(latitude, longitude, placeLat, placeLng);
    const allowedDistanceMeters = Math.max(400, accuracyMeters * 2);
    if (distanceMeters > allowedDistanceMeters) {
      return Response.json(
        { error: `You need to be at this place to review it. Move within ${Math.round(allowedDistanceMeters)} m and try again.` },
        { status: 403 }
      );
    }

    targetPlaceId = placeId;
    metadata = {
      user_id: user.id,
      place_id: placeId,
      rating: rating !== null ? String(rating) : "",
      latitude: String(latitude),
      longitude: String(longitude),
      accuracy_meters: String(accuracyMeters),
      body_part_1: body.slice(0, 400),
      body_part_2: body.slice(400, 800),
      body_part_3: body.slice(800, 1200),
      type: "new_legit_review",
    };
  }

  // Get user details for checkout
  const { data: userData } = await admin.auth.admin.getUserById(user.id);
  const email = userData?.user?.email ?? (user.email as string) ?? "user@nocap.app";
  const name = (user.user_metadata?.full_name ?? user.user_metadata?.name ?? "NoCap User") as string;

  const returnUrl = `${origin}/map?legit=success&place=${encodeURIComponent(targetPlaceId)}`;

  // Create Dodo checkout session
  const checkoutRes = await fetch(`${DODO_BASE}/checkouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${DODO_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      product_cart: [{ product_id: DODO_PRODUCT_ID, quantity: 1 }],
      customer: { email, name },
      billing_address: { country: "IN" },
      metadata,
      return_url: returnUrl,
    }),
  });

  if (!checkoutRes.ok) {
    const errText = await checkoutRes.text();
    console.error("[Dodo checkout error]", checkoutRes.status, errText);
    let message = "Could not create payment session.";
    try {
      const errObj = JSON.parse(errText);
      if (errObj.code === "INSUFFICIENT_PERMISSION") {
        message = "Dodo Payments API key lacks checkout_sessions:write permission. Please create a key with write permissions in Dodo dashboard.";
      } else if (errObj.message) {
        message = errObj.message;
      }
    } catch {}
    return Response.json({ error: message }, { status: checkoutRes.status || 500 });
  }

  const session = (await checkoutRes.json()) as {
    checkout_url?: string;
    url?: string;
    id?: string;
    session_id?: string;
  };
  const checkoutUrl = session.checkout_url ?? session.url;
  const sessionId = session.id ?? session.session_id;

  return Response.json({ checkoutUrl, sessionId });
}

async function validateLegitReviewInput(
  input: Record<string, unknown> | null,
  admin: ReturnType<typeof createAdminClient>
) {
  const body = typeof input?.body === "string" ? input.body.trim() : "";
  const rawRating = input?.rating;
  const rating = rawRating === null || rawRating === undefined || rawRating === "" ? null : Number(rawRating);
  const latitude = Number(input?.latitude);
  const longitude = Number(input?.longitude);
  const accuracyMeters = Number(input?.accuracyMeters);

  if (body.length < minimumReviewLength || body.length > maximumReviewLength) {
    return Response.json(
      { error: `Write between ${minimumReviewLength} and ${maximumReviewLength} characters.` },
      { status: 400 }
    );
  }
  if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
    return Response.json({ error: "Choose a rating from 1 to 5, or leave it blank." }, { status: 400 });
  }
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(accuracyMeters) || accuracyMeters <= 0 || accuracyMeters > maxAccuracyMeters) {
    return Response.json({ error: "Use a fresh, accurate device location to publish." }, { status: 400 });
  }

  // Check hardcoded place
  const placeIdInput = typeof input?.placeId === "string" ? input.placeId : null;
  const hardcodedPlace = placeIdInput ? findNocapPlace(placeIdInput) : null;
  if (hardcodedPlace) {
    return {
      placeId: hardcodedPlace.id,
      placeLat: hardcodedPlace.latitude,
      placeLng: hardcodedPlace.longitude,
      body,
      rating,
      latitude,
      longitude,
      accuracyMeters,
    };
  }

  // Check user-pinned place
  const userPlaceId = typeof input?.userPlaceId === "string" ? input.userPlaceId : null;
  if (userPlaceId) {
    const { data: userPlace } = await admin
      .from("nocap_user_places")
      .select("id, latitude, longitude")
      .eq("id", userPlaceId)
      .single();
    if (userPlace) {
      return {
        placeId: `user:${userPlace.id}`,
        placeLat: Number(userPlace.latitude),
        placeLng: Number(userPlace.longitude),
        body,
        rating,
        latitude,
        longitude,
        accuracyMeters,
      };
    }
  }

  return Response.json({ error: "Choose a place from the map." }, { status: 400 });
}

function distanceBetween(latitudeA: number, longitudeA: number, latitudeB: number, longitudeB: number) {
  const radians = Math.PI / 180;
  const latitudeDistance = (latitudeB - latitudeA) * radians;
  const longitudeDistance = (longitudeB - longitudeA) * radians;
  const a =
    Math.sin(latitudeDistance / 2) ** 2 +
    Math.cos(latitudeA * radians) * Math.cos(latitudeB * radians) * Math.sin(longitudeDistance / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
