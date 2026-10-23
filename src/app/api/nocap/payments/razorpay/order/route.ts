import { findNocapPlace } from "@/lib/nocap/places";
import { createAdminClient, getGoogleUser, isSupabaseConfigured } from "@/lib/supabase/server";

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

const minimumReviewLength = 8;
const maximumReviewLength = 1200;

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase not configured." }, { status: 503 });
  }
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    return Response.json({ error: "Razorpay keys not configured on server." }, { status: 503 });
  }

  const user = await getGoogleUser(request);
  if (!user) {
    return Response.json({ error: "Sign in with Google first." }, { status: 401 });
  }

  const input = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const admin = createAdminClient();

  let metadata: Record<string, string> = {};
  let targetPlaceId = "";
  let targetPlaceName = "Bengaluru hotspot";

  // Mode 1: Upgrade existing review
  const reviewId = typeof input?.reviewId === "string" ? input.reviewId : null;
  if (reviewId) {
    const { data: review } = await admin
      .from("nocap_reviews")
      .select("id, profile_id, place_id, is_legit")
      .eq("id", reviewId)
      .single();

    if (!review) return Response.json({ error: "Review not found." }, { status: 404 });
    if (review.profile_id !== user.id) return Response.json({ error: "Not your review." }, { status: 403 });
    if (review.is_legit) return Response.json({ error: "Already marked as Legit." }, { status: 400 });

    targetPlaceId = review.place_id;
    metadata = {
      review_id: reviewId,
      user_id: user.id,
      place_id: targetPlaceId,
      type: "upgrade_review",
    };
  } else {
    // Mode 2: Brand new Legit review
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

    // Resolve hardcoded or user place
    const placeIdInput = typeof input?.placeId === "string" ? input.placeId : null;
    const hardcodedPlace = placeIdInput ? findNocapPlace(placeIdInput) : null;
    let placeLat = 12.9716;
    let placeLng = 77.5946;

    if (hardcodedPlace) {
      targetPlaceId = hardcodedPlace.id;
      targetPlaceName = hardcodedPlace.name;
      placeLat = hardcodedPlace.latitude;
      placeLng = hardcodedPlace.longitude;
    } else {
      const userPlaceId = typeof input?.userPlaceId === "string" ? input.userPlaceId : null;
      if (userPlaceId) {
        const { data: userPlace } = await admin
          .from("nocap_user_places")
          .select("id, name, latitude, longitude")
          .eq("id", userPlaceId)
          .single();
        if (userPlace) {
          targetPlaceId = `user:${userPlace.id}`;
          targetPlaceName = userPlace.name;
          placeLat = Number(userPlace.latitude);
          placeLng = Number(userPlace.longitude);
        }
      }
    }

    if (!targetPlaceId) {
      return Response.json({ error: "Choose a place from the map." }, { status: 400 });
    }

    const finalLat = Number.isFinite(latitude) ? latitude : placeLat;
    const finalLng = Number.isFinite(longitude) ? longitude : placeLng;
    const finalAccuracy = Number.isFinite(accuracyMeters) && accuracyMeters > 0 ? accuracyMeters : 15;

    metadata = {
      user_id: user.id,
      place_id: targetPlaceId,
      rating: rating !== null ? String(rating) : "",
      latitude: String(finalLat),
      longitude: String(finalLng),
      accuracy_meters: String(finalAccuracy),
      body: body.slice(0, 1000),
      type: "new_legit_review",
    };
  }

  // Get user details
  const { data: userData } = await admin.auth.admin.getUserById(user.id);
  const email = userData?.user?.email ?? (user.email as string) ?? "user@nocap.app";
  const name = (user.user_metadata?.full_name ?? user.user_metadata?.name ?? "NoCap User") as string;

  // Create Razorpay Order
  const authHeader = `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64")}`;
  const amountPaise = 3900; // ₹39.00 (production)

  const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
      notes: metadata,
    }),
  });

  if (!rzpRes.ok) {
    const errText = await rzpRes.text();
    console.error("[Razorpay Order Error]:", rzpRes.status, errText);
    return Response.json({ error: "Could not create Razorpay order. Check API keys." }, { status: 500 });
  }

  const orderData = (await rzpRes.json()) as {
    id: string;
    amount: number;
    currency: string;
  };

  return Response.json({
    orderId: orderData.id,
    amount: orderData.amount,
    currency: orderData.currency,
    keyId: RAZORPAY_KEY_ID,
    placeId: targetPlaceId,
    placeName: targetPlaceName,
    user: { name, email },
  });
}

