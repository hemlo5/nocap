import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid body." }, { status: 400 });
    }

    const feedbackId = typeof body.feedbackId === "string" ? body.feedbackId : "";
    const action = body.action === "unvote" ? "unvote" : "upvote";
    const voterId = typeof body.voterId === "string" && body.voterId.trim() ? body.voterId.trim() : "anon";

    if (!feedbackId) {
      return NextResponse.json({ error: "Feedback ID is required." }, { status: 400 });
    }

    let upvotesCount = typeof body.currentCount === "number" ? body.currentCount : 1;
    if (action === "upvote") {
      upvotesCount += 1;
    } else {
      upvotesCount = Math.max(0, upvotesCount - 1);
    }

    // Persist to Supabase if configured and table exists
    if (isSupabaseConfigured()) {
      try {
        const admin = createAdminClient();

        if (action === "upvote") {
          await admin.from("nocap_feedback_votes").upsert(
            { feedback_id: feedbackId, voter_id: voterId },
            { onConflict: "feedback_id,voter_id" }
          );
        } else {
          await admin
            .from("nocap_feedback_votes")
            .delete()
            .match({ feedback_id: feedbackId, voter_id: voterId });
        }

        // Update total counter on feedback item
        const { data: updated } = await admin
          .from("nocap_feedback")
          .update({
            upvotes_count: upvotesCount,
            updated_at: new Date().toISOString(),
          })
          .eq("id", feedbackId)
          .select("upvotes_count")
          .single();

        if (updated && typeof updated.upvotes_count === "number") {
          upvotesCount = updated.upvotes_count;
        }
      } catch (err) {
        console.warn("[Feedback Vote API] Supabase vote sync skipped:", err);
      }
    }

    return NextResponse.json({ success: true, feedbackId, action, upvotesCount });
  } catch (err) {
    console.error("[Feedback Vote API] Error:", err);
    return NextResponse.json({ error: "Could not record vote." }, { status: 500 });
  }
}
