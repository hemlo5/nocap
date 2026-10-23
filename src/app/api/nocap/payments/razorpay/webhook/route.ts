import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const bodyText = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (webhookSecret) {
    const expected = crypto.createHmac("sha256", webhookSecret).update(bodyText).digest("hex");
    if (expected !== signature) {
      console.error("[Razorpay Webhook] Signature mismatch");
      return new Response("Invalid signature", { status: 401 });
    }
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(bodyText);
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  const eventType = String(event.event ?? "");
  console.log("[Razorpay Webhook] Event received:", eventType);

  if (eventType === "payment.captured" || eventType === "order.paid") {
    const payload = (event.payload as Record<string, unknown>) ?? {};
    const payment = (payload.payment as Record<string, unknown>)?.entity as Record<string, unknown> | undefined;
    const order = (payload.order as Record<string, unknown>)?.entity as Record<string, unknown> | undefined;

    const paymentId = String(payment?.id ?? "");
    const notes = ((payment?.notes ?? order?.notes ?? {}) as Record<string, string>);

    if (!paymentId || !notes.user_id) {
      return new Response("OK - Ignored event without notes", { status: 200 });
    }

    const admin = createAdminClient();

    // Check existing
    if (notes.review_id) {
      await admin
        .from("nocap_reviews")
        .update({ is_legit: true, payment_id: paymentId, updated_at: new Date().toISOString() })
        .eq("id", notes.review_id);
    } else if (notes.place_id && notes.user_id) {
      const reviewBody = notes.body || "";
      const rating = notes.rating ? Number(notes.rating) : 5;
      const latitude = Number(notes.latitude) || 12.9716;
      const longitude = Number(notes.longitude) || 77.5946;
      const accuracyMeters = Number(notes.accuracy_meters) || 15;

      await admin.from("nocap_reviews").upsert(
        {
          profile_id: notes.user_id,
          place_id: notes.place_id,
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
    }
  }

  return new Response("OK", { status: 200 });
}

