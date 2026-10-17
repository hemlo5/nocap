import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  MapPin,
  Compass,
  ArrowLeft,
  Share2,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  CheckCircle,
  Map as MapIcon,
  Sparkles,
} from "lucide-react";
import {
  nocapPlaces,
  findNocapPlace,
  slugifyArea,
  categoryDetails,
  findPlacesByArea,
} from "@/lib/nocap/places";
import { getLocalPlaceMentions } from "@/lib/nocap/local-evidence";
import { SiteFooter } from "@/components/nav/site-footer";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return nocapPlaces.map((place) => ({
    slug: place.id,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const place = findNocapPlace(slug);

  if (!place) {
    return {
      title: "Place Not Found | NoCapBLR",
      robots: { index: false, follow: false },
    };
  }

  const categoryName = categoryDetails[place.category]?.name ?? place.category;
  const title = `${place.name} Reviews (${place.area}, Bengaluru) — Real Takes`;
  const description = `Honest, unvarnished reviews of ${place.name} in ${place.area}, Bengaluru. Find out what locals really think before you go—no paid PR or influencer fluff.`;
  const url = `https://www.nocapblr.com/places/${place.id}`;

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
  const place = findNocapPlace(slug);

  if (!place) {
    notFound();
  }

  const mentions = await getLocalPlaceMentions(place.id);
  const areaSlug = slugifyArea(place.area);
  const nearbyPlaces = findPlacesByArea(areaSlug).filter((p) => p.id !== place.id);
  const categoryInfo = categoryDetails[place.category];

  // Schema.org structured data
  const placeSchemaType =
    place.category === "eat"
      ? "Restaurant"
      : place.category === "park"
      ? "Park"
      : "LocalBusiness";

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": placeSchemaType,
        "@id": `https://www.nocapblr.com/places/${place.id}#place`,
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
        url: `https://www.nocapblr.com/places/${place.id}`,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: "https://www.nocapblr.com",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: categoryInfo?.name ?? place.category,
            item: `https://www.nocapblr.com/categories/${place.category}`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: place.area,
            item: `https://www.nocapblr.com/areas/${areaSlug}`,
          },
          {
            "@type": "ListItem",
            position: 4,
            name: place.name,
            item: `https://www.nocapblr.com/places/${place.id}`,
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
      <div className="flex min-h-screen flex-col bg-[#F6F5F2] text-zinc-950">
        <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
          {/* Breadcrumb Navigation */}
          <nav
            aria-label="Breadcrumbs"
            className="mb-6 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-zinc-500"
          >
            <Link href="/" className="hover:text-zinc-900 transition-colors">
              Home
            </Link>
            <span>/</span>
            <Link
              href={`/categories/${place.category}`}
              className="hover:text-zinc-900 transition-colors capitalize"
            >
              {categoryInfo?.name ?? place.category}
            </Link>
            <span>/</span>
            <Link
              href={`/areas/${areaSlug}`}
              className="hover:text-zinc-900 transition-colors"
            >
              {place.area}
            </Link>
            <span>/</span>
            <span className="text-zinc-900 truncate max-w-[200px]">
              {place.name}
            </span>
          </nav>

          {/* Place Header Card */}
          <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 sm:p-10 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-800">
                <Compass className="h-3.5 w-3.5 text-zinc-600" />
                <span>{categoryInfo?.name ?? place.category}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500">
                <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                <Link
                  href={`/areas/${areaSlug}`}
                  className="hover:text-zinc-900 underline underline-offset-2"
                >
                  {place.area}, Bengaluru
                </Link>
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-950">
              {place.name}
            </h1>
            <p className="mt-2 text-sm sm:text-base text-zinc-600 font-normal">
              {place.address}
            </p>

            {/* Quick Actions Bar */}
            <div className="mt-6 flex flex-wrap items-center gap-3 pt-6 border-t border-zinc-100">
              <Link
                href={`/map?place=${place.id}`}
                className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-zinc-800 transition-all"
              >
                <MapIcon className="h-3.5 w-3.5" />
                <span>View on Live Map</span>
              </Link>
              <Link
                href={`/map?place=${place.id}&write=true`}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-xs font-bold text-zinc-900 hover:bg-zinc-50 transition-all"
              >
                <MessageSquare className="h-3.5 w-3.5 text-zinc-700" />
                <span>Write a NoCap Take</span>
              </Link>
            </div>
          </div>

          {/* Verification Callout */}
          <div className="mt-6 rounded-2xl border border-emerald-200/60 bg-emerald-50/50 p-4 sm:p-5 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed text-emerald-950">
              <strong className="font-bold">Verified on-site policy:</strong> Reviews on NoCapBLR receive our trusted verified stamp when posted directly from this venue&apos;s coordinates. No PR agencies, no sponsored influencers.
            </div>
          </div>

          {/* Real Community Reviews / Mentions */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-zinc-950">
                  What Locals Are Saying
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Unfiltered public community discussions and firsthand local takes.
                </p>
              </div>
              <span className="text-xs font-bold bg-zinc-200/70 text-zinc-800 px-2.5 py-1 rounded-full">
                {mentions.length} {mentions.length === 1 ? "take" : "takes"}
              </span>
            </div>

            {mentions.length > 0 ? (
              <div className="space-y-4">
                {mentions.map((mention) => (
                  <div
                    key={mention.id}
                    className="rounded-2xl border border-zinc-200/80 bg-white p-5 sm:p-6 shadow-xs"
                  >
                    <div className="flex items-center justify-between text-xs text-zinc-500 mb-3">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-zinc-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span>Bengaluru Local Community</span>
                        {mention.author && (
                          <span className="text-zinc-400 font-normal">
                            · u/{mention.author}
                          </span>
                        )}
                      </span>
                      {mention.permalink && (
                        <a
                          href={mention.permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-zinc-400 hover:text-zinc-700 transition-colors"
                          title="Original thread link"
                        >
                          <span>Discussion thread</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <p className="text-sm text-zinc-800 leading-relaxed font-normal whitespace-pre-line">
                      &ldquo;{mention.excerpt}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-300 bg-white/60 p-8 text-center">
                <p className="text-sm font-semibold text-zinc-700">
                  No verified notes on {place.name} yet.
                </p>
                <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
                  Been here recently? Be the first to tell Bengaluru what it&apos;s actually like.
                </p>
                <Link
                  href={`/map?place=${place.id}&write=true`}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-4 py-2 text-xs font-bold text-white hover:bg-zinc-800 transition-colors"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Leave First Honest Take</span>
                </Link>
              </div>
            )}
          </div>

          {/* More in Neighborhood */}
          {nearbyPlaces.length > 0 && (
            <div className="mt-12">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-zinc-950">
                  More Places in {place.area}
                </h2>
                <Link
                  href={`/areas/${areaSlug}`}
                  className="text-xs font-bold text-zinc-600 hover:text-zinc-950 underline underline-offset-2"
                >
                  View all in {place.area}
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {nearbyPlaces.slice(0, 6).map((nearby) => (
                  <Link
                    key={nearby.id}
                    href={`/places/${nearby.id}`}
                    className="group rounded-2xl border border-zinc-200/80 bg-white p-4 transition-all hover:border-zinc-400 hover:shadow-xs"
                  >
                    <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      {nearby.category}
                    </div>
                    <div className="font-bold text-zinc-950 group-hover:underline text-sm">
                      {nearby.name}
                    </div>
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-1">
                      {nearby.address}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  </>
);
}

