import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { NocapReview } from "@/lib/nocap/community";

const DODO_API_KEY = process.env.DODO_PAYMENTS_API_KEY;
const DODO_BASE =
  process.env.DODO_PAYMENTS_BASE_URL ||
  (DODO_API_KEY?.startsWith("test_") ? "https://test.dodopayments.com" : "https://live.dodopayments.com");

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return Response.json({ error: "Supabase not configured." }, { status: 503 });

  const input = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const paymentId = typeof input?.paymentId === "string" ? input.paymentId.trim() : null;
  const sessionId = typeof input?.sessionId === "string" ? input.sessionId.trim() : null;

  if (!paymentId && !sessionId) {
    return Response.json({ error: "Missing paymentId or sessionId." }, { status: 400 });
  }

  const admin = createAdminClient();

  // 1. Check if review is already recorded in DB (e.g. from webhook)
  if (paymentId) {
    const { data: existingReview } = await admin
      .from("nocap_reviews")
      .select("id, place_id, body, rating, latitude, longitude, is_legit, payment_id, created_at, updated_at, nocap_profiles!inner(id, display_name, avatar_url, bio)")
      .eq("payment_id", paymentId)
      .maybeSingle();

    if (existingReview) {
      return Response.json({ success: true, review: toReview(existingReview) });
    }
  }

  // 2. If not yet in DB, verify directly with Dodo Payments API
  if (!DODO_API_KEY) {
    return Response.json({ error: "Dodo API key not configured." }, { status: 503 });
  }

  let paymentData: Record<string, unknown> | null = null;
  let metadata: Record<string, string> = {};
  let resolvedPaymentId = paymentId ?? "";

  try {
    if (paymentId) {
      const res = await fetch(`${DODO_BASE}/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${DODO_API_KEY}` },
      });
      if (res.ok) {
        paymentData = (await res.json()) as Record<string, unknown>;
      }
    } else if (sessionId) {
      const res = await fetch(`${DODO_BASE}/checkouts/${sessionId}`, {
        headers: { Authorization: `Bearer ${DODO_API_KEY}` },
      });
      if (res.ok) {
        const session = (await res.json()) as Record<string, unknown>;
        paymentData = session;
        resolvedPaymentId = String(session.payment_id ?? sessionId);
      }
    }
  } catch (err) {
    console.error("[Verify Payment] Error fetching from Dodo:", err);
  }

  if (!paymentData) {
    return Response.json({ error: "Could not retrieve payment details." }, { status: 404 });
  }

  const status = String(paymentData.payment_status ?? paymentData.status ?? "");
  const isPaid = status === "succeeded" || status === "completed" || status === "paid";

  if (!isPaid) {
    return Response.json({ error: `Payment not completed (status: ${status}).` }, { status: 400 });
  }

  metadata = (paymentData.metadata as Record<string, string>) ?? {};

  // Handle existing review upgrade
  if (metadata.review_id) {
    const { data: updatedReview, error } = await admin
      .from("nocap_reviews")
      .update({ is_legit: true, payment_id: resolvedPaymentId, updated_at: new Date().toISOString() })
      .eq("id", metadata.review_id)
      .select("id, place_id, body, rating, latitude, longitude, is_legit, payment_id, created_at, updated_at, nocap_profiles!inner(id, display_name, avatar_url, bio)")
      .single();

    if (error || !updatedReview) {
      return Response.json({ error: "Could not update review status." }, { status: 500 });
    }
    return Response.json({ success: true, review: toReview(updatedReview) });
  }

  // Handle new legit review creation
  if (metadata.place_id && metadata.user_id) {
    const reviewBody =
      metadata.body ||
      [metadata.body_part_1, metadata.body_part_2, metadata.body_part_3].filter(Boolean).join("");
    const rating = metadata.rating ? Number(metadata.rating) : 5;
    const latitude = Number(metadata.latitude);
    const longitude = Number(metadata.longitude);
    const accuracyMeters = Number(metadata.accuracy_meters) || 50;

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

    const { data: insertedReview, error } = await admin
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
          payment_id: resolvedPaymentId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "profile_id,place_id" }
      )
      .select("id, place_id, body, rating, latitude, longitude, is_legit, payment_id, created_at, updated_at, nocap_profiles!inner(id, display_name, avatar_url, bio)")
      .single();

    if (error || !insertedReview) {
      console.error("[Verify Payment] Error inserting review:", error);
      return Response.json({ error: "Could not publish legit review." }, { status: 500 });
    }

    return Response.json({ success: true, review: toReview(insertedReview) });
  }

  return Response.json({ error: "No review metadata found in payment." }, { status: 400 });
}

function toReview(review: Record<string, unknown>): NocapReview {
  const profile = review.nocap_profiles as { id: string; display_name: string; avatar_url: string | null; bio: string | null };
  return {
    id: String(review.id),
    placeId: String(review.place_id),
    body: String(review.body),
    rating: review.rating != null ? Number(review.rating) : 5,
    latitude: Number(review.latitude),
    longitude: Number(review.longitude),
    isLegit: Boolean(review.is_legit),
    paymentId: review.payment_id ? String(review.payment_id) : null,
    createdAt: String(review.created_at),
    updatedAt: String(review.updated_at),
    profile: { id: profile.id, displayName: profile.display_name, avatarUrl: profile.avatar_url, bio: profile.bio },
  };
}

