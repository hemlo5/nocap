import { createAdminClient, getGoogleUser, isSupabaseConfigured } from "@/lib/supabase/server";
import type { NocapUserPlace } from "@/lib/nocap/community";
import type { NocapPlaceCategory } from "@/lib/nocap/places";

const BENGALURU_BOUNDS = { latMin: 12.72, latMax: 13.2, lngMin: 77.34, lngMax: 77.9 };

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return Response.json({ error: "Supabase is not configured." }, { status: 503 });
  const user = await getGoogleUser(request);
  if (!user) return Response.json({ error: "Sign in with Google to pin a place." }, { status: 401 });

  const input = await request.json().catch(() => null) as Record<string, unknown> | null;

  const name = typeof input?.name === "string" ? input.name.trim() : "";
  const rawCategory = typeof input?.category === "string" ? input.category.trim() : "other";
  const customCategory = typeof input?.customCategory === "string" ? input.customCategory.trim() : "";
  const category = (rawCategory === "other" && customCategory ? customCategory : rawCategory).slice(0, 50);
  const address = typeof input?.address === "string" ? input.address.trim() : "";
  const latitude = Number(input?.latitude);
  const longitude = Number(input?.longitude);

  if (!name || name.length < 2 || name.length > 80)
    return Response.json({ error: "Place name must be 2–80 characters." }, { status: 400 });
  if (!category || category.length < 1)
    return Response.json({ error: "Pick or enter a category." }, { status: 400 });
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude))
    return Response.json({ error: "Invalid coordinates." }, { status: 400 });
  if (latitude < BENGALURU_BOUNDS.latMin || latitude > BENGALURU_BOUNDS.latMax ||
      longitude < BENGALURU_BOUNDS.lngMin || longitude > BENGALURU_BOUNDS.lngMax)
    return Response.json({ error: "Pin must be within Bengaluru." }, { status: 400 });

  // 1km location check for creating new pins / dots
  const userLat = Number(input?.userLatitude ?? input?.userLat);
  const userLng = Number(input?.userLongitude ?? input?.userLng);
  if (Number.isFinite(userLat) && Number.isFinite(userLng)) {
    const distanceMeters = distanceBetween(userLat, userLng, latitude, longitude);
    if (distanceMeters > 1000) {
      return Response.json(
        { error: `You can only pin places within 1km of your current location. (Distance: ${(distanceMeters / 1000).toFixed(1)} km)` },
        { status: 403 }
      );
    }
  } else {
    return Response.json(
      { error: "Your current location is required to pin a place within 1km." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Ensure profile exists
  const { data: existingProfile } = await admin.from("nocap_profiles").select("id, display_name").eq("id", user.id).maybeSingle();
  if (!existingProfile) {
    await admin.from("nocap_profiles").upsert({ id: user.id, display_name: "Anonymous", avatar_url: null });
  } else {
    const candidate = user.user_metadata.full_name ?? user.user_metadata.name ?? user.user_metadata.user_name;
    const rawGoogleName = typeof candidate === "string" && candidate.trim() ? candidate.trim().slice(0, 60) : "";
    if (rawGoogleName && existingProfile.display_name === rawGoogleName) {
      await admin.from("nocap_profiles").update({ display_name: "Anonymous", avatar_url: null }).eq("id", user.id);
    }
  }

  let insertResult = await admin.from("nocap_user_places")
    .insert({ profile_id: user.id, name, category, address, latitude, longitude })
    .select("id, profile_id, name, category, address, latitude, longitude, created_at, nocap_profiles!inner(id, display_name, avatar_url, bio)")
    .single();

  if (insertResult.error && insertResult.error.code === "23514") {
    // If nocap_user_places_category_check constraint only allows 4 categories, fallback to culture
    const fallbackAddress = address ? `${address} (${category})` : category;
    insertResult = await admin.from("nocap_user_places")
      .insert({ profile_id: user.id, name, category: "culture", address: fallbackAddress, latitude, longitude })
      .select("id, profile_id, name, category, address, latitude, longitude, created_at, nocap_profiles!inner(id, display_name, avatar_url, bio)")
      .single();
  }

  const { data, error } = insertResult;
  if (error || !data) {
    console.error("user-places insert error:", error);
    return Response.json({ error: "Could not save your place." }, { status: 500 });
  }

  return Response.json({ place: toUserPlace(data) });
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) return Response.json({ userPlaces: [], place: null, reviews: [] });
  const admin = createAdminClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  // Single user-place detail (with reviews)
  if (id) {
    const { data: placeRow } = await admin.from("nocap_user_places")
      .select("id, profile_id, name, category, address, latitude, longitude, created_at, nocap_profiles!inner(id, display_name, avatar_url, bio)")
      .eq("id", id)
      .single();
    if (!placeRow) return Response.json({ place: null, reviews: [], supabaseConfigured: true }, { status: 404 });

    const { data: reviewRows } = await admin.from("nocap_reviews")
      .select("id, place_id, body, rating, latitude, longitude, accuracy_meters, is_legit, payment_id, created_at, updated_at, nocap_profiles!inner(id, display_name, avatar_url, bio)")
      .eq("place_id", `user:${id}`)
      .order("is_legit", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);

    const reviews = (reviewRows ?? []).map((r: Record<string, unknown>) => {
      const p = r.nocap_profiles as { id: string; display_name: string; avatar_url: string | null; bio: string | null };
      return { id: String(r.id), placeId: String(r.place_id), profile: { id: p.id, displayName: p.display_name, avatarUrl: p.avatar_url, bio: p.bio }, body: String(r.body), rating: r.rating != null ? Number(r.rating) : null, latitude: Number(r.latitude), longitude: Number(r.longitude), isLegit: Boolean(r.is_legit), paymentId: r.payment_id ? String(r.payment_id) : null, createdAt: String(r.created_at), updatedAt: String(r.updated_at) };
    });

    return Response.json({ place: toUserPlace(placeRow as Record<string, unknown>), reviews, supabaseConfigured: true });
  }

  // All user places
  const { data } = await admin.from("nocap_user_places")
    .select("id, profile_id, name, category, address, latitude, longitude, created_at, nocap_profiles!inner(id, display_name, avatar_url, bio)")
    .order("created_at", { ascending: false })
    .limit(500);
  return Response.json({ userPlaces: (data ?? []).map(toUserPlace) });
}

function toUserPlace(row: Record<string, unknown>): NocapUserPlace {
  const profile = row.nocap_profiles as { id: string; display_name: string; avatar_url: string | null; bio: string | null };
  return {
    id: String(row.id),
    profileId: String(row.profile_id),
    profile: { id: profile.id, displayName: profile.display_name || "Anonymous", avatarUrl: profile.avatar_url, bio: profile.bio },
    name: String(row.name),
    category: row.category as NocapPlaceCategory,
    address: String(row.address ?? ""),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    createdAt: String(row.created_at),
  };
}

function distanceBetween(latitudeA: number, longitudeA: number, latitudeB: number, longitudeB: number) {
  const radians = Math.PI / 180;
  const latitudeDistance = (latitudeB - latitudeA) * radians;
  const longitudeDistance = (longitudeB - longitudeA) * radians;
  const a =
    Math.sin(latitudeDistance / 2) ** 2 +
    Math.cos(latitudeA * radians) * Math.cos(latitudeB * radians) * Math.sin(longitudeDistance / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
