import crypto from "crypto";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { NocapReview } from "@/lib/nocap/community";

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase not configured." }, { status: 503 });
  }
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    return Response.json({ error: "Razorpay keys not configured on server." }, { status: 503 });
  }

  const input = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const orderId = typeof input?.razorpay_order_id === "string" ? input.razorpay_order_id.trim() : null;
  const paymentId = typeof input?.razorpay_payment_id === "string" ? input.razorpay_payment_id.trim() : null;
  const signature = typeof input?.razorpay_signature === "string" ? input.razorpay_signature.trim() : null;

  if (!orderId || !paymentId || !signature) {
    return Response.json({ error: "Missing Razorpay verification parameters." }, { status: 400 });
  }

  // 1. Verify HMAC SHA-256 Signature
  const expectedSignature = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  if (expectedSignature !== signature) {
    console.error("[Razorpay Verify] Signature mismatch", { expected: expectedSignature, received: signature });
    return Response.json({ error: "Invalid payment signature." }, { status: 400 });
  }

  const admin = createAdminClient();

  // 2. Check if already recorded in Supabase (idempotency check)
  const { data: existingReview } = await admin
    .from("nocap_reviews")
    .select("id, place_id, body, rating, latitude, longitude, is_legit, payment_id, created_at, updated_at, nocap_profiles!inner(id, display_name, avatar_url, bio)")
    .eq("payment_id", paymentId)
    .maybeSingle();

  if (existingReview) {
    return Response.json({ success: true, review: toReview(existingReview) });
  }

  // 3. Fetch order details from Razorpay to retrieve stored metadata notes
  const authHeader = `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64")}`;
  let notes: Record<string, string> = {};

  try {
    const rzpOrderRes = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
      headers: { Authorization: authHeader },
    });
    if (rzpOrderRes.ok) {
      const orderJson = (await rzpOrderRes.json()) as { notes?: Record<string, string> };
      notes = orderJson.notes ?? {};
    } else {
      console.error("[Razorpay Order Fetch Failed]", rzpOrderRes.status);
    }
  } catch (err) {
    console.error("[Razorpay Order Fetch Error]", err);
  }

  // Fallback to input notes if order fetch didn't return them
  const fallbackNotes = (input?.notes as Record<string, string>) ?? {};
  const metadata = { ...fallbackNotes, ...notes };

  // Case A: Existing review upgrade to Legit
  if (metadata.review_id) {
    const { data: updatedReview, error } = await admin
      .from("nocap_reviews")
      .update({ is_legit: true, payment_id: paymentId, updated_at: new Date().toISOString() })
      .eq("id", metadata.review_id)
      .select("id, place_id, body, rating, latitude, longitude, is_legit, payment_id, created_at, updated_at, nocap_profiles!inner(id, display_name, avatar_url, bio)")
      .single();

    if (error || !updatedReview) {
      return Response.json({ error: "Could not update review status." }, { status: 500 });
    }
    return Response.json({ success: true, review: toReview(updatedReview) });
  }

  // Case B: New Legit review creation
  if (metadata.place_id && metadata.user_id) {
    const reviewBody =
      (typeof input?.body === "string" && input.body.trim())
        ? input.body.trim()
        : (metadata.body || "");
    const rating = metadata.rating ? Number(metadata.rating) : 5;
    const latitude = Number(metadata.latitude) || 12.9716;
    const longitude = Number(metadata.longitude) || 77.5946;
    const accuracyMeters = Number(metadata.accuracy_meters) || 15;

    // Ensure profile exists
    const { data: userAuth } = await admin.auth.admin.getUserById(metadata.user_id);
    if (userAuth?.user) {
      const candidate =
        userAuth.user.user_metadata?.full_name ??
        userAuth.user.user_metadata?.name ??
        userAuth.user.user_metadata?.user_name;
      const displayName =
        typeof candidate === "string" && candidate.trim() ? candidate.trim().slice(0, 60) : "NoCap local";
      const avatar = userAuth.user.user_metadata?.avatar_url ?? userAuth.user.user_metadata?.picture;
      await admin.from("nocap_profiles").upsert({
        id: metadata.user_id,
        display_name: displayName,
        avatar_url: typeof avatar === "string" ? avatar : null,
      });
    }

    let upsertResult = await admin
      .from("nocap_reviews")
      .upsert(
        {
          profile_id: metadata.user_id,
          place_id: metadata.place_id,
          body: reviewBody,
          rating,
          latitude,
          longitude,
          accuracy_meters: accuracyMeters,
          is_legit: true,
          payment_id: paymentId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "profile_id,place_id" }
      )
      .select("id, place_id, body, rating, latitude, longitude, is_legit, payment_id, created_at, updated_at, nocap_profiles!inner(id, display_name, avatar_url, bio)")
      .single();

    if (upsertResult.error && (upsertResult.error.code === "23502" || upsertResult.error.code === "23514") && rating === null) {
      upsertResult = await admin
        .from("nocap_reviews")
        .upsert(
          {
            profile_id: metadata.user_id,
            place_id: metadata.place_id,
            body: reviewBody,
            rating: 5,
            latitude,
            longitude,
            accuracy_meters: accuracyMeters,
            is_legit: true,
            payment_id: paymentId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "profile_id,place_id" }
        )
        .select("id, place_id, body, rating, latitude, longitude, is_legit, payment_id, created_at, updated_at, nocap_profiles!inner(id, display_name, avatar_url, bio)")
        .single();
    }

    const { data: newReview, error } = upsertResult;
    if (error || !newReview) {
      console.error("[Razorpay Verify] Insert review error:", error);
      return Response.json({ error: "Could not save legit review." }, { status: 500 });
    }

    return Response.json({ success: true, review: toReview(newReview) });
  }

  return Response.json({ error: "No place or review details associated with this payment." }, { status: 400 });
}

function toReview(review: Record<string, unknown>): NocapReview {
  const profile = review.nocap_profiles as {
    id: string;
    display_name: string;
    avatar_url: string | null;
    bio: string | null;
  };
  return {
    id: String(review.id),
    placeId: String(review.place_id),
    body: String(review.body),
    rating: review.rating != null ? Number(review.rating) : null,
    latitude: Number(review.latitude),
    longitude: Number(review.longitude),
    isLegit: Boolean(review.is_legit),
    paymentId: review.payment_id ? String(review.payment_id) : null,
    createdAt: String(review.created_at),
    updatedAt: String(review.updated_at),
    profile: {
      id: profile.id,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
      bio: profile.bio,
    },
  };
}
