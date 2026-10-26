import { createAdminClient, getGoogleUser, isSupabaseConfigured } from "@/lib/supabase/server";
import type { NocapProfile } from "@/lib/nocap/community";
import { findNocapPlace } from "@/lib/nocap/places";

export async function GET(request: Request) {
  const user = await getUserOrResponse(request);
  if (user instanceof Response) return user;
  const profile = await ensureProfile(user);

  const admin = createAdminClient();
  const { data: reviewsData } = await admin
    .from("nocap_reviews")
    .select("id, place_id, body, rating, latitude, longitude, is_legit, payment_id, created_at, updated_at")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  // Collect user-place IDs if any
  const userPlaceIds: string[] = [];
  for (const r of reviewsData ?? []) {
    if (typeof r.place_id === "string" && r.place_id.startsWith("user:")) {
      userPlaceIds.push(r.place_id.slice(5));
    }
  }

  // Fetch user places if any
  const userPlacesMap = new Map<string, { name: string; address: string; category: string }>();
  if (userPlaceIds.length > 0) {
    const { data: userPlacesRows } = await admin
      .from("nocap_user_places")
      .select("id, name, address, category")
      .in("id", userPlaceIds);
    for (const up of userPlacesRows ?? []) {
      userPlacesMap.set(`user:${up.id}`, { name: up.name, address: up.address, category: up.category });
    }
  }

  const reviews = (reviewsData ?? []).map((r) => {
    let placeName = r.place_id;
    let placeAddress = "";
    let placeCategory = "other";

    if (r.place_id.startsWith("user:")) {
      const up = userPlacesMap.get(r.place_id);
      if (up) {
        placeName = up.name;
        placeAddress = up.address;
        placeCategory = up.category;
      }
    } else {
      const hp = findNocapPlace(r.place_id);
      if (hp) {
        placeName = hp.name;
        placeAddress = hp.address;
        placeCategory = hp.category;
      }
    }

    return {
      id: String(r.id),
      placeId: String(r.place_id),
      placeName,
      placeAddress,
      placeCategory,
      body: String(r.body),
      rating: r.rating != null ? Number(r.rating) : null,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      isLegit: Boolean(r.is_legit),
      paymentId: r.payment_id ? String(r.payment_id) : null,
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    };
  });

  return Response.json({ profile, reviews });
}

export async function PATCH(request: Request) {
  const user = await getUserOrResponse(request);
  if (user instanceof Response) return user;
  const input = await request.json().catch(() => null) as { displayName?: unknown; bio?: unknown; showAvatar?: unknown } | null;
  const rawDisplayName = typeof input?.displayName === "string" ? input.displayName.trim() : "";
  const displayName = rawDisplayName.length > 0 ? rawDisplayName.slice(0, 60) : "Anonymous";
  const bio = typeof input?.bio === "string" ? input.bio.trim() : "";
  if (bio.length > 240) {
    return Response.json({ error: "Use a bio up to 240 characters." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: existing } = await admin.from("nocap_profiles").select("id, display_name, avatar_url, bio").eq("id", user.id).maybeSingle();

  let avatarUrl: string | null = null;
  if (input && typeof input.showAvatar === "boolean") {
    avatarUrl = input.showAvatar ? avatarFromUser(user) : null;
  } else if (existing?.avatar_url) {
    avatarUrl = existing.avatar_url;
  }

  const { data, error } = await admin.from("nocap_profiles")
    .upsert({ id: user.id, display_name: displayName, bio: bio || null, avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .select("id, display_name, avatar_url, bio").single();
  if (error || !data) return Response.json({ error: "Could not save your profile." }, { status: 500 });
  return Response.json({ profile: toProfile(data, user) });
}

async function getUserOrResponse(request: Request) {
  if (!isSupabaseConfigured()) return Response.json({ error: "Supabase is not configured." }, { status: 503 });
  const user = await getGoogleUser(request);
  return user ?? Response.json({ error: "Sign in with Google to continue." }, { status: 401 });
}

async function ensureProfile(user: { id: string; user_metadata: Record<string, unknown> }) {
  const admin = createAdminClient();
  const { data: existing } = await admin.from("nocap_profiles").select("id, display_name, avatar_url, bio").eq("id", user.id).maybeSingle();
  if (existing) {
    const rawGoogleName = nameFromUser(user);
    if (existing.display_name === rawGoogleName) {
      const { data: updated } = await admin.from("nocap_profiles")
        .update({ display_name: "Anonymous", avatar_url: null, updated_at: new Date().toISOString() })
        .eq("id", user.id)
        .select("id, display_name, avatar_url, bio")
        .single();
      return toProfile(updated ?? existing, user);
    }
    return toProfile(existing, user);
  }

  const displayName = "Anonymous";
  const { data } = await admin.from("nocap_profiles")
    .upsert({ id: user.id, display_name: displayName, avatar_url: null })
    .select("id, display_name, avatar_url, bio").single();
  return toProfile(data ?? { id: user.id, display_name: displayName, avatar_url: null, bio: null }, user);
}

function nameFromUser(user: { user_metadata: Record<string, unknown> }) {
  const candidate = user.user_metadata.full_name ?? user.user_metadata.name ?? user.user_metadata.user_name;
  return typeof candidate === "string" && candidate.trim() ? candidate.trim().slice(0, 60) : "NoCap local";
}

function avatarFromUser(user: { user_metadata: Record<string, unknown> }) {
  const candidate = user.user_metadata.avatar_url ?? user.user_metadata.picture;
  return typeof candidate === "string" ? candidate : null;
}

function toProfile(profile: { id: string; display_name: string; avatar_url: string | null; bio: string | null }, user?: { user_metadata: Record<string, unknown> }): NocapProfile {
  return {
    id: profile.id,
    displayName: profile.display_name || "Anonymous",
    avatarUrl: profile.avatar_url,
    bio: profile.bio,
    googleAvatarUrl: user ? avatarFromUser(user) : null,
  };
}
