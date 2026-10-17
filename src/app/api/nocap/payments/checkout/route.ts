import { createAdminClient, getGoogleUser, isSupabaseConfigured } from "@/lib/supabase/server";

const DODO_API_KEY = process.env.DODO_PAYMENTS_API_KEY!;
const DODO_PRODUCT_ID = process.env.DODO_PAYMENTS_PRODUCT_ID!;
// Use test endpoint until go-live
const DODO_BASE = "https://test.dodopayments.com";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return Response.json({ error: "Not configured." }, { status: 503 });
  if (!DODO_API_KEY || !DODO_PRODUCT_ID) return Response.json({ error: "Payment not configured." }, { status: 503 });

  const user = await getGoogleUser(request);
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });

  const input = await request.json().catch(() => null) as Record<string, unknown> | null;
  const reviewId = typeof input?.reviewId === "string" ? input.reviewId : null;
  const origin = typeof input?.origin === "string" ? input.origin : "https://localhost:3000";

  if (!reviewId) return Response.json({ error: "Missing reviewId." }, { status: 400 });

  // Verify the review belongs to this user
  const admin = createAdminClient();
  const { data: review } = await admin.from("nocap_reviews")
    .select("id, profile_id, is_legit")
    .eq("id", reviewId)
    .single();

  if (!review) return Response.json({ error: "Review not found." }, { status: 404 });
  if (review.profile_id !== user.id) return Response.json({ error: "Not your review." }, { status: 403 });
  if (review.is_legit) return Response.json({ error: "Already legit." }, { status: 400 });

  // Get user email from Supabase auth
  const { data: userData } = await admin.auth.admin.getUserById(user.id);
  const email = userData?.user?.email ?? "unknown@nocap.app";
  const name = (user.user_metadata?.full_name ?? user.user_metadata?.name ?? "NoCap User") as string;

  // Create Dodo checkout session
  const checkoutRes = await fetch(`${DODO_BASE}/checkouts`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${DODO_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      product_cart: [{ product_id: DODO_PRODUCT_ID, quantity: 1 }],
      customer: { email, name },
      billing_address: { country: "IN" },
      metadata: { review_id: reviewId, user_id: user.id },
      return_url: `${origin}/map?legit=success&review_id=${reviewId}`,
    }),
  });

  if (!checkoutRes.ok) {
    const err = await checkoutRes.text();
    console.error("Dodo checkout error:", err);
    return Response.json({ error: "Could not create payment session." }, { status: 500 });
  }

  const session = await checkoutRes.json() as { checkout_url: string; id: string };
  return Response.json({ checkoutUrl: session.checkout_url, sessionId: session.id });
}

