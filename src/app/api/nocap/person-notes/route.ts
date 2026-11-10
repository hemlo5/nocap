import { NextRequest, NextResponse } from "next/server";
import { findNocapPlace } from "@/lib/nocap/places";
import { createAdminClient, getGoogleUser, isSupabaseConfigured } from "@/lib/supabase/server";
import type { NocapPersonNote } from "@/lib/nocap/community";
import {
  INITIAL_PERSON_NOTES,
  getArchivedPersonNotes,
  memoryPersonNotesStore,
} from "@/lib/nocap/person-notes";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get("placeId");

  if (!placeId) {
    // Return all person notes
    const archived = INITIAL_PERSON_NOTES;
    if (isSupabaseConfigured()) {
      try {
        const admin = createAdminClient();
        const { data, error } = await admin
          .from("nocap_person_notes")
          .select("id, place_id, person_name, description, photo_url, created_at, updated_at, nocap_profiles!inner(id, display_name, avatar_url, bio)")
          .order("created_at", { ascending: false });

        if (!error && Array.isArray(data)) {
          const dbNotes: NocapPersonNote[] = data.map(toPersonNote);
          const merged = [...memoryPersonNotesStore, ...dbNotes, ...archived];
          const unique = Array.from(new Map(merged.map((n) => [n.id, n])).values());
          return NextResponse.json({ personNotes: unique });
        }
      } catch (err) {
        console.warn("[PersonNotes API GET all] Supabase error:", err);
      }
    }
    const merged = [...memoryPersonNotesStore, ...archived];
    return NextResponse.json({ personNotes: merged });
  }

  // Filter by placeId
  const archived = getArchivedPersonNotes(placeId);

  if (isSupabaseConfigured()) {
    try {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from("nocap_person_notes")
        .select("id, place_id, person_name, description, photo_url, created_at, updated_at, nocap_profiles!inner(id, display_name, avatar_url, bio)")
        .eq("place_id", placeId)
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        const dbNotes: NocapPersonNote[] = data.map(toPersonNote);
        const inMemoryForPlace = memoryPersonNotesStore.filter((n) => n.placeId === placeId);
        const merged = [...inMemoryForPlace, ...dbNotes, ...archived];
        const unique = Array.from(new Map(merged.map((n) => [n.id, n])).values());
        return NextResponse.json({ personNotes: unique });
      }
    } catch (err) {
      console.warn("[PersonNotes API GET placeId] Supabase error:", err);
    }
  }

  const inMemoryForPlace = memoryPersonNotesStore.filter((n) => n.placeId === placeId);
  const merged = [...inMemoryForPlace, ...archived];
  const unique = Array.from(new Map(merged.map((n) => [n.id, n])).values());
  return NextResponse.json({ personNotes: unique });
}

export async function POST(request: NextRequest) {
  try {
    const user = await getGoogleUser(request);
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const placeId = typeof body.placeId === "string" ? body.placeId.trim() : "";
    const userPlaceId = typeof body.userPlaceId === "string" ? body.userPlaceId.trim() : "";
    const targetPlaceId = placeId || (userPlaceId ? `user:${userPlaceId}` : "");

    const personName = typeof body.personName === "string" ? body.personName.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const photoUrl = typeof body.photoUrl === "string" && body.photoUrl.trim() ? body.photoUrl.trim() : null;

    if (!targetPlaceId) {
      return NextResponse.json({ error: "Choose a place or dot from the map." }, { status: 400 });
    }

    if (!personName || personName.length < 2 || personName.length > 100) {
      return NextResponse.json(
        { error: "Please enter the person's name (2 to 100 characters)." },
        { status: 400 }
      );
    }

    if (!description || description.length < 3 || description.length > 1500) {
      return NextResponse.json(
        { error: "Please provide a note or description about them (at least 3 characters)." },
        { status: 400 }
      );
    }

    const authorProfile = {
      id: user?.id || `guest-${Date.now()}`,
      displayName:
        (user?.user_metadata?.full_name as string) ||
        (user?.user_metadata?.name as string) ||
        (user?.user_metadata?.user_name as string) ||
        "Local Scout",
      avatarUrl: (user?.user_metadata?.avatar_url as string) || null,
      bio: null,
    };

    // Try Supabase insert if configured
    if (isSupabaseConfigured() && user) {
      try {
        const admin = createAdminClient();

        // Ensure user profile
        const { data: existingProfile } = await admin
          .from("nocap_profiles")
          .select("id, display_name")
          .eq("id", user.id)
          .maybeSingle();

        if (!existingProfile) {
          await admin.from("nocap_profiles").upsert({
            id: user.id,
            display_name: authorProfile.displayName,
            avatar_url: authorProfile.avatarUrl,
          });
        }

        const { data, error } = await admin
          .from("nocap_person_notes")
          .insert({
            profile_id: user.id,
            place_id: targetPlaceId,
            person_name: personName,
            description,
            photo_url: photoUrl,
          })
          .select("id, place_id, person_name, description, photo_url, created_at, updated_at, nocap_profiles!inner(id, display_name, avatar_url, bio)")
          .single();

        if (!error && data) {
          const newNote = toPersonNote(data);
          memoryPersonNotesStore.unshift(newNote);
          return NextResponse.json({ personNote: newNote });
        }
      } catch (dbErr) {
        console.warn("[PersonNotes POST] Supabase insert fallback:", dbErr);
      }
    }

    // In-memory fallback
    const fallbackNote: NocapPersonNote = {
      id: `person-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      placeId: targetPlaceId,
      profile: authorProfile,
      personName,
      description,
      photoUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    memoryPersonNotesStore.unshift(fallbackNote);
    return NextResponse.json({ personNote: fallbackNote });
  } catch (err) {
    console.error("[PersonNotes API POST] Error:", err);
    return NextResponse.json({ error: "Failed to create person note" }, { status: 500 });
  }
}

function toPersonNote(row: Record<string, unknown>): NocapPersonNote {
  const rawProfile = row.nocap_profiles;
  const profile = (Array.isArray(rawProfile) ? rawProfile[0] : rawProfile) as
    | { id: string; display_name: string; avatar_url: string | null; bio: string | null }
    | undefined;

  return {
    id: String(row.id),
    placeId: String(row.place_id),
    personName: String(row.person_name),
    description: String(row.description),
    photoUrl: row.photo_url ? String(row.photo_url) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    profile: {
      id: profile?.id || "anon",
      displayName: profile?.display_name || "Anonymous",
      avatarUrl: profile?.avatar_url || null,
      bio: profile?.bio || null,
    },
  };
}
