import {
  resolvePlaceBySlug,
  fetchPlaceReviewsAndNotes,
} from "@/lib/nocap/place-lookup";
import { findPlacesByArea } from "@/lib/nocap/places";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return Response.json({ error: "slug is required" }, { status: 400 });
  }

  const place = await resolvePlaceBySlug(slug);
  if (!place) {
    return Response.json({ error: "Place not found" }, { status: 404 });
  }

  const { reviews, personNotes } = await fetchPlaceReviewsAndNotes(place);
  const nearbyPlaces = findPlacesByArea(place.areaSlug)
    .filter((p) => p.id !== place.id)
    .slice(0, 6);

  return Response.json(
    { place, reviews, personNotes, nearbyPlaces },
    { headers: { "Cache-Control": "no-store" } }
  );
}
