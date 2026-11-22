import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  nocapPlaces,
  findPlacesByArea,
  categoryDetails,
} from "@/lib/nocap/places";
import {
  resolvePlaceBySlug,
  fetchPlaceReviewsAndNotes,
} from "@/lib/nocap/place-lookup";
import { PlacePageView } from "@/components/nocap/place-page-view";

type Props = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = true;

export async function generateStaticParams() {
  return nocapPlaces.map((place) => ({
    slug: place.id,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const place = await resolvePlaceBySlug(slug);

  if (!place) {
    return {
      title: "Place Not Found | NoCapBLR",
      robots: { index: false, follow: false },
    };
  }

  const title = `${place.name} Reviews (${place.area}, Bengaluru) — Real Takes`;
  const description = `Honest, unvarnished reviews of ${place.name} in ${place.area}, Bengaluru. Find out what locals really think before you go—no paid PR or influencer fluff.`;
  const url = `https://nocapblr.com/places/${place.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: "NoCapBLR",
      images: [
        {
          url: "/nocap-logo.png",
          width: 1200,
          height: 630,
          alt: `${place.name} on NoCapBLR`,
        },
      ],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/nocap-logo.png"],
    },
  };
}

export default async function PlacePage({ params }: Props) {
  const { slug } = await params;
  const place = await resolvePlaceBySlug(slug);

  if (!place) {
    notFound();
  }

  const { reviews, personNotes } = await fetchPlaceReviewsAndNotes(place);
  const nearbyPlaces = findPlacesByArea(place.areaSlug).filter((p) => p.id !== place.id);
  const categoryInfo = categoryDetails[place.category];

  // Determine Schema.org place type
  const lowerName = place.name.toLowerCase();
  const placeSchemaType =
    lowerName.includes("university") || lowerName.includes("college") || lowerName.includes("institute")
      ? "EducationalOrganization"
      : place.category === "eat"
      ? "Restaurant"
      : place.category === "park"
      ? "Park"
      : "LocalBusiness";

  // Calculate review metrics for Schema.org
  const ratedReviews = reviews.filter((r) => typeof r.rating === "number" && r.rating > 0);
  const avgRating = ratedReviews.length
    ? (ratedReviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) / ratedReviews.length).toFixed(1)
    : null;

  const placeJsonLd: Record<string, unknown> = {
    "@type": placeSchemaType,
    "@id": `https://nocapblr.com/places/${place.slug}#place`,
    name: place.name,
    address: {
      "@type": "PostalAddress",
      streetAddress: place.address,
      addressLocality: "Bengaluru",
      addressRegion: "Karnataka",
      addressCountry: "IN",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: place.latitude,
      longitude: place.longitude,
    },
    url: `https://nocapblr.com/places/${place.slug}`,
  };

  if (avgRating && ratedReviews.length > 0) {
    placeJsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: avgRating,
      reviewCount: ratedReviews.length,
      bestRating: "5",
      worstRating: "1",
    };
  }

  if (reviews.length > 0) {
    placeJsonLd.review = reviews.slice(0, 5).map((r) => ({
      "@type": "Review",
      author: {
        "@type": "Person",
        name: r.profile?.displayName || "Bengaluru Scout",
      },
      reviewBody: r.body,
      ...(r.rating ? { reviewRating: { "@type": "Rating", ratingValue: r.rating } } : {}),
      datePublished: r.createdAt,
    }));
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      placeJsonLd,
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: "https://nocapblr.com",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: place.categoryName,
            item: `https://nocapblr.com/categories/${place.category}`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: place.area,
            item: `https://nocapblr.com/areas/${place.areaSlug}`,
          },
          {
            "@type": "ListItem",
            position: 4,
            name: place.name,
            item: `https://nocapblr.com/places/${place.slug}`,
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PlacePageView
        place={place}
        initialReviews={reviews}
        initialPersonNotes={personNotes}
        nearbyPlaces={nearbyPlaces}
        categoryInfo={categoryInfo}
      />
    </>
  );
}
