import { createAdminClient } from "@/lib/supabase/server";

// Dodo sends webhook events when payment succeeds
// Set your webhook secret in Dodo dashboard → Webhooks → Signing Secret
// then add DODO_PAYMENTS_WEBHOOK_SECRET to .env

export async function POST(request: Request) {
  const body = await request.text();
  const webhookSecret = process.env.DODO_PAYMENTS_WEBHOOK_SECRET;

  // Verify signature if secret is set
  if (webhookSecret) {
    const sig = request.headers.get("webhook-signature") ?? request.headers.get("x-webhook-signature") ?? "";
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(webhookSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const expected = "sha256=" + Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, "0")).join("");
    if (sig !== expected) {
      console.error("[NoCap webhook] Signature mismatch");
      return new Response("Invalid signature", { status: 401 });
    }
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(body);
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  const eventType = event.type ?? event.event_type;
  console.log("[NoCap webhook] Event:", eventType);

  // Handle successful payment
  if (eventType === "payment.succeeded" || eventType === "checkout.completed") {
    const data = (event.data as Record<string, unknown>) ?? event;
    const metadata = ((data.metadata ?? event.metadata) as Record<string, string>) ?? {};
    const paymentId = String(data.payment_id ?? data.id ?? event.payment_id ?? event.id ?? "");
    const admin = createAdminClient();

    // Case 1: Existing review upgrade
    if (metadata.review_id) {
      const { error } = await admin
        .from("nocap_reviews")
        .update({ is_legit: true, payment_id: paymentId, updated_at: new Date().toISOString() })
        .eq("id", metadata.review_id);
      if (error) console.error("[NoCap webhook] Failed to mark legit:", error);
      else console.log("[NoCap webhook] Marked existing review as legit:", metadata.review_id);
    }
    // Case 2: New review published via payment
    else if (metadata.place_id && metadata.user_id) {
      const reviewBody =
        metadata.body ||
        [metadata.body_part_1, metadata.body_part_2, metadata.body_part_3].filter(Boolean).join("");
      const rating = metadata.rating ? Number(metadata.rating) : 5;
      const latitude = Number(metadata.latitude);
      const longitude = Number(metadata.longitude);
      const accuracyMeters = Number(metadata.accuracy_meters) || 50;

      if (reviewBody && Number.isFinite(latitude) && Number.isFinite(longitude)) {
        // Ensure user profile exists
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

        const { error } = await admin.from("nocap_reviews").upsert(
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
        );

        if (error) console.error("[NoCap webhook] Failed to write legit review:", error);
        else console.log("[NoCap webhook] Successfully published new legit review for:", metadata.place_id);
      }
    }
  }

  return new Response("ok", { status: 200 });
}
