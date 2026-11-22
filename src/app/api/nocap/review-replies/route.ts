import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const reviewId = searchParams.get("reviewId");

  if (!reviewId) {
    return Response.json({ error: "reviewId is required" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return Response.json({ replies: [] });
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("nocap_review_replies")
      .select(
        "id, review_id, body, created_at, nocap_profiles!inner(id, display_name, avatar_url)"
      )
      .eq("review_id", reviewId)
      .order("created_at", { ascending: true })
      .limit(50);

    if (error) {
      console.error("[NoCap] review-replies GET error:", error.message);
      return Response.json({ replies: [] });
    }

    const replies = (data ?? []).map((row: Record<string, unknown>) => {
      const profileRaw = row.nocap_profiles as
        | { id: string; display_name: string; avatar_url: string | null }
        | undefined;
      return {
        id: String(row.id),
        reviewId: String(row.review_id),
        body: String(row.body),
        createdAt: String(row.created_at),
        profile: {
          id: profileRaw?.id ?? "anon",
          displayName: profileRaw?.display_name || "Bengaluru Local",
          avatarUrl: profileRaw?.avatar_url ?? null,
        },
      };
    });

    return Response.json({ replies }, { headers: { "Cache-Control": "no-store" } });
  } catch (err: unknown) {
    console.error("[NoCap] review-replies GET unexpected error:", err);
    return Response.json({ replies: [] });
  }
}

export async function POST(request: Request) {
  // Auth check
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return Response.json({ error: "Sign in required to reply." }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Service unavailable." }, { status: 503 });
  }

  let body: { reviewId?: string; body?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { reviewId, body: replyBody } = body;

  if (!reviewId) {
    return Response.json({ error: "reviewId is required." }, { status: 400 });
  }
  if (!replyBody || replyBody.trim().length < 1 || replyBody.trim().length > 500) {
    return Response.json(
      { error: "Reply must be between 1 and 500 characters." },
      { status: 400 }
    );
  }

  try {
    const admin = createAdminClient();

    // Verify user from token
    const {
      data: { user },
      error: authError,
    } = await admin.auth.getUser(token);

    if (authError || !user) {
      return Response.json({ error: "Invalid or expired session." }, { status: 401 });
    }

    // Ensure profile exists
    const { data: profile } = await admin
      .from("nocap_profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      return Response.json(
        { error: "Profile not found. Please complete your profile first." },
        { status: 403 }
      );
    }

    // Insert reply
    const { data: inserted, error: insertError } = await admin
      .from("nocap_review_replies")
      .insert({
        review_id: reviewId,
        profile_id: user.id,
        body: replyBody.trim(),
      })
      .select(
        "id, review_id, body, created_at, nocap_profiles!inner(id, display_name, avatar_url)"
      )
      .single();

    if (insertError) {
      console.error("[NoCap] review-replies POST error:", insertError.message);
      return Response.json(
        { error: "Could not post reply. Please try again." },
        { status: 500 }
      );
    }

    const profileRaw = inserted.nocap_profiles as
      | { id: string; display_name: string; avatar_url: string | null }
      | { id: string; display_name: string; avatar_url: string | null }[]
      | undefined;
    const p = Array.isArray(profileRaw) ? profileRaw[0] : profileRaw;

    const reply = {
      id: String(inserted.id),
      reviewId: String(inserted.review_id),
      body: String(inserted.body),
      createdAt: String(inserted.created_at),
      profile: {
        id: p?.id ?? user.id,
        displayName: p?.display_name || "Bengaluru Local",
        avatarUrl: p?.avatar_url ?? null,
      },
    };

    return Response.json({ reply }, { status: 201 });
  } catch (err: unknown) {
    console.error("[NoCap] review-replies POST unexpected error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}
