import { notFound } from "next/navigation";
import {
  resolvePlaceBySlug,
  fetchPlaceReviewsAndNotes,
} from "@/lib/nocap/place-lookup";
import { findPlacesByArea, categoryDetails } from "@/lib/nocap/places";
import { PlaceDrawer } from "@/components/nocap/place-drawer";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function InterceptedPlacePage({ params }: Props) {
  const { slug } = await params;
  const place = await resolvePlaceBySlug(slug);

  if (!place) {
    notFound();
  }

  const { reviews, personNotes } = await fetchPlaceReviewsAndNotes(place);
  const nearbyPlaces = findPlacesByArea(place.areaSlug).filter(
    (p) => p.id !== place.id
  );
  const categoryInfo = categoryDetails[place.category];

  return (
    <PlaceDrawer
      place={place}
      initialReviews={reviews}
      initialPersonNotes={personNotes}
      nearbyPlaces={nearbyPlaces}
      categoryInfo={categoryInfo}
    />
  );
}
