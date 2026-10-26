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
      if (error) console.error("[NoCap webhook] Failed to mark Crazy Tea:", error);
      else console.log("[NoCap webhook] Marked existing review as Crazy Tea:", metadata.review_id);
    }
    // Case 2: New review published via payment
    else if (metadata.place_id && metadata.user_id) {
      const reviewBody =
        metadata.body ||
        [metadata.body_part_1, metadata.body_part_2, metadata.body_part_3].filter(Boolean).join("");
      const rating = metadata.rating ? Number(metadata.rating) : 5;
      const latitude = Number(metadata.latitude) || 12.9716;
      const longitude = Number(metadata.longitude) || 77.5946;
      const accuracyMeters = Number(metadata.accuracy_meters) || 15;

      if (reviewBody) {
        // Ensure user profile exists
        const { data: userAuth } = await admin.auth.admin.getUserById(metadata.user_id);
        if (userAuth?.user) {
          const { data: existingProfile } = await admin.from("nocap_profiles").select("id, display_name").eq("id", metadata.user_id).maybeSingle();
          if (!existingProfile) {
            await admin.from("nocap_profiles").upsert({
              id: metadata.user_id,
              display_name: "Anonymous",
              avatar_url: null,
            });
          } else {
            const candidate =
              userAuth.user.user_metadata?.full_name ??
              userAuth.user.user_metadata?.name ??
              userAuth.user.user_metadata?.user_name;
            const rawGoogleName = typeof candidate === "string" && candidate.trim() ? candidate.trim().slice(0, 60) : "";
            if (rawGoogleName && existingProfile.display_name === rawGoogleName) {
              await admin.from("nocap_profiles").update({ display_name: "Anonymous", avatar_url: null }).eq("id", metadata.user_id);
            }
          }
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
          );

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
            );
        }

        if (upsertResult.error) console.error("[NoCap webhook] Failed to write Crazy Tea review:", upsertResult.error);
        else console.log("[NoCap webhook] Successfully published new Crazy Tea review for:", metadata.place_id);
      }
    }
  }

  return new Response("ok", { status: 200 });
}

