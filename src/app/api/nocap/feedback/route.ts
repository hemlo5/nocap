import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, getGoogleUser, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  FeedbackCategory,
  FeedbackItem,
  INITIAL_FEEDBACK_ITEMS,
} from "@/lib/nocap/feedback";

// Memory store for newly created items if Supabase table is not yet provisioned
const memoryFeedbackStore: FeedbackItem[] = [];

export async function GET(request: NextRequest) {
  try {
    if (isSupabaseConfigured()) {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from("nocap_feedback")
        .select("*")
        .order("upvotes_count", { ascending: false })
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        const dbItems: FeedbackItem[] = data.map((row) => ({
          id: row.id,
          title: row.title,
          description: row.description,
          category: row.category as FeedbackCategory,
          status: row.status,
          upvotesCount: row.upvotes_count ?? 1,
          authorName: row.author_name || "Anonymous",
          authorAvatar: row.author_avatar || null,
          adminResponse: row.admin_response || null,
          deviceInfo: row.device_info || null,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));

        // Merge with any in-memory items created in this runtime session
        const all = [...memoryFeedbackStore, ...dbItems];
        const unique = Array.from(new Map(all.map((item) => [item.id, item])).values());
        return NextResponse.json({ items: unique });
      }
    }
  } catch (err) {
    console.error("[Feedback API GET] Error querying Supabase:", err);
  }

  // Fallback to seed items + in-memory store
  const merged = [...memoryFeedbackStore, ...INITIAL_FEEDBACK_ITEMS];
  const unique = Array.from(new Map(merged.map((item) => [item.id, item])).values());
  return NextResponse.json({ items: unique });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const rawCategory = typeof body.category === "string" ? body.category.toLowerCase().trim() : "feature";
    const authorEmail = typeof body.authorEmail === "string" ? body.authorEmail.trim() : null;
    const deviceInfo = typeof body.deviceInfo === "string" ? body.deviceInfo.trim() : null;

    if (title.length < 3 || title.length > 140) {
      return NextResponse.json(
        { error: "Title must be between 3 and 140 characters." },
        { status: 400 }
      );
    }

    if (description.length < 8 || description.length > 2000) {
      return NextResponse.json(
        { error: "Description must be between 8 and 2000 characters." },
        { status: 400 }
      );
    }

    const validCategories: FeedbackCategory[] = ["feature", "bug", "improvement", "other"];
    const category: FeedbackCategory = validCategories.includes(rawCategory as FeedbackCategory)
      ? (rawCategory as FeedbackCategory)
      : "feature";

    // Attempt to identify user if logged in with Google
    let profileId: string | null = null;
    let authorName = typeof body.authorName === "string" && body.authorName.trim() ? body.authorName.trim() : "Anonymous";
    let authorAvatar: string | null = null;

    try {
      if (isSupabaseConfigured()) {
        const user = await getGoogleUser(request);
        if (user) {
          profileId = user.id;
          const admin = createAdminClient();
          const { data: profile } = await admin
            .from("nocap_profiles")
            .select("display_name, avatar_url")
            .eq("id", user.id)
            .single();

          if (profile) {
            authorName = profile.display_name || user.email?.split("@")[0] || authorName;
            authorAvatar = profile.avatar_url || null;
          }
        }
      }
    } catch {
      // Continue with provided author name
    }

    const newItem: FeedbackItem = {
      id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title,
      description,
      category,
      status: "under_review",
      upvotesCount: 1,
      authorName: authorName.slice(0, 50),
      authorAvatar,
      adminResponse: null,
      deviceInfo: deviceInfo ? deviceInfo.slice(0, 100) : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Attempt persistence in Supabase
    if (isSupabaseConfigured()) {
      try {
        const admin = createAdminClient();
        const { data, error } = await admin
          .from("nocap_feedback")
          .insert({
            profile_id: profileId,
            author_name: newItem.authorName,
            author_email: authorEmail ? authorEmail.slice(0, 120) : null,
            author_avatar: newItem.authorAvatar,
            category: newItem.category,
            title: newItem.title,
            description: newItem.description,
            status: newItem.status,
            upvotes_count: 1,
            device_info: newItem.deviceInfo,
          })
          .select("*")
          .single();

        if (!error && data) {
          newItem.id = data.id;
        }
      } catch (dbErr) {
        console.warn("[Feedback API POST] Database insert skipped or table not yet created:", dbErr);
      }
    }

    // Keep in memory store so it remains accessible immediately
    memoryFeedbackStore.unshift(newItem);

    return NextResponse.json({ success: true, item: newItem }, { status: 201 });
  } catch (err) {
    console.error("[Feedback API POST] Unexpected error:", err);
    return NextResponse.json({ error: "Could not submit feedback." }, { status: 500 });
  }
}
