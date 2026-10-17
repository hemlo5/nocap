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
    // Dodo uses HMAC-SHA256
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", encoder.encode(webhookSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const expected = "sha256=" + Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, "0")).join("");
    if (sig !== expected) {
      console.error("[NoCap webhook] Signature mismatch");
      return new Response("Invalid signature", { status: 401 });
    }
  }

  let event: Record<string, unknown>;
  try { event = JSON.parse(body); } catch { return new Response("Bad JSON", { status: 400 }); }

  const eventType = event.type ?? event.event_type;
  console.log("[NoCap webhook] Event:", eventType);

  // Handle successful payment
  if (eventType === "payment.succeeded" || eventType === "checkout.completed") {
    const metadata = (event.metadata ?? (event.data as Record<string, unknown>)?.metadata ?? {}) as Record<string, string>;
    const reviewId = metadata.review_id;
    const paymentId = String(event.id ?? event.payment_id ?? "");

    if (reviewId) {
      const admin = createAdminClient();
      const { error } = await admin.from("nocap_reviews")
        .update({ is_legit: true, payment_id: paymentId, updated_at: new Date().toISOString() })
        .eq("id", reviewId);
      if (error) console.error("[NoCap webhook] Failed to mark legit:", error);
      else console.log("[NoCap webhook] Marked review as legit:", reviewId);
    }
  }

  return new Response("ok", { status: 200 });
}

