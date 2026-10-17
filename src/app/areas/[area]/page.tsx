import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, ArrowRight, Map as MapIcon, Compass } from "lucide-react";
import {
  getAllAreas,
  findPlacesByArea,
  categoryDetails,
} from "@/lib/nocap/places";
import { SiteFooter } from "@/components/nav/site-footer";

type Props = {
  params: Promise<{ area: string }>;
};

export async function generateStaticParams() {
  return getAllAreas().map((area) => ({
    area: area.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { area } = await params;
  const allAreas = getAllAreas();
  const currentArea = allAreas.find((a) => a.slug === area);

  if (!currentArea) {
    return {
      title: "Neighborhood Not Found | NoCapBLR",
      robots: { index: false, follow: false },
    };
  }

  const title = `${currentArea.name}, Bengaluru Reviews — Real Takes & Local Spots`;
  const description = `Explore unfiltered community reviews of food, streets, parks, and cultural spaces in ${currentArea.name}, Bengaluru. Real local takes with zero paid PR.`;
  const url = `https://www.nocapblr.com/areas/${currentArea.slug}`;

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
          alt: `${currentArea.name} Bengaluru on NoCapBLR`,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/nocap-logo.png"],
    },
  };
}

export default async function AreaPage({ params }: Props) {
  const { area } = await params;
  const allAreas = getAllAreas();
  const currentArea = allAreas.find((a) => a.slug === area);

  if (!currentArea) {
    notFound();
  }

  const places = findPlacesByArea(currentArea.slug);
  const otherAreas = allAreas.filter((a) => a.slug !== currentArea.slug).slice(0, 10);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ItemList",
        name: `Places in ${currentArea.name}, Bengaluru`,
        description: `Unfiltered community reviews of venues and spots across ${currentArea.name}.`,
        numberOfItems: places.length,
        itemListElement: places.map((place, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: place.name,
          url: `https://www.nocapblr.com/places/${place.id}`,
        })),
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
            name: "Neighborhoods",
            item: "https://www.nocapblr.com/#neighborhoods",
          },
          {
            "@type": "ListItem",
            position: 3,
            name: currentArea.name,
            item: `https://www.nocapblr.com/areas/${currentArea.slug}`,
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
          <div className="mx-auto max-w-5xl">
          {/* Breadcrumbs */}
          <nav
            aria-label="Breadcrumbs"
            className="mb-6 flex items-center gap-1.5 text-xs font-semibold text-zinc-500"
          >
            <Link href="/" className="hover:text-zinc-900 transition-colors">
              Home
            </Link>
            <span>/</span>
            <span className="text-zinc-900">{currentArea.name}</span>
          </nav>

          {/* Header Card */}
          <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 sm:p-10 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-800">
                <MapPin className="h-3.5 w-3.5 text-zinc-600" />
                <span>Bengaluru Neighborhood Guide</span>
              </span>
              <Link
                href="/map"
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-bold text-zinc-900 hover:bg-zinc-50 transition-colors"
              >
                <MapIcon className="h-3.5 w-3.5" />
                <span>Open in Map</span>
              </Link>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-zinc-950">
              {currentArea.name}, Bengaluru
            </h1>
            <p className="mt-2 text-sm sm:text-base text-zinc-600 max-w-2xl leading-relaxed">
              Curated list of verified spots and firsthand community reviews in {currentArea.name}. Find out what people actually think before heading over.
            </p>
          </div>

          {/* Places Grid */}
          <div className="mt-8">
            <h2 className="text-lg font-bold text-zinc-950 mb-4">
              Spots in {currentArea.name} ({places.length})
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {places.map((place) => {
                const categoryInfo = categoryDetails[place.category];
                return (
                  <Link
                    key={place.id}
                    href={`/places/${place.id}`}
                    className="group flex flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-5 transition-all hover:border-zinc-400 hover:shadow-xs"
                  >
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1 inline-block">
                        {categoryInfo?.name ?? place.category}
                      </span>
                      <h3 className="text-base font-bold text-zinc-950 group-hover:underline">
                        {place.name}
                      </h3>
                      <p className="mt-1 text-xs text-zinc-500 line-clamp-2">
                        {place.address}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between pt-3 border-t border-zinc-100 text-xs font-bold text-zinc-900 group-hover:text-zinc-950">
                      <span>Read honest takes</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Other Neighborhoods */}
          <div className="mt-12">
            <h2 className="text-base font-bold text-zinc-950 mb-3">
              Explore More Bengaluru Neighborhoods
            </h2>
            <div className="flex flex-wrap gap-2">
              {otherAreas.map((oa) => (
                <Link
                  key={oa.slug}
                  href={`/areas/${oa.slug}`}
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 transition-colors"
                >
                  {oa.name} <span className="text-zinc-400">({oa.count})</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  </>
);
}

