import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Compass, ArrowRight, Map as MapIcon, Utensils, Footprints, Trees, Theater } from "lucide-react";
import {
  nocapPlaceCategories,
  categoryDetails,
  findPlacesByCategory,
  slugifyArea,
  type NocapPlaceCategory,
} from "@/lib/nocap/places";
import { SiteFooter } from "@/components/nav/site-footer";

type Props = {
  params: Promise<{ category: string }>;
};

const categoryIcons: Record<string, typeof Utensils> = {
  eat: Utensils,
  street: Footprints,
  park: Trees,
  culture: Theater,
};

export async function generateStaticParams() {
  return nocapPlaceCategories.map((category) => ({
    category,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const info = categoryDetails[category];

  if (!info) {
    return {
      title: "Category Not Found | NoCapBLR",
      robots: { index: false, follow: false },
    };
  }

  const title = `${info.name} in Bengaluru — Real Reviews, No Fluff`;
  const description = `${info.description} Browse authentic opinions on Bengaluru ${info.name.toLowerCase()} with NoCapBLR.`;
  const url = `https://www.nocapblr.com/categories/${category}`;

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
          alt: `${info.name} Bengaluru on NoCapBLR`,
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

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const info = categoryDetails[category];

  if (!info) {
    notFound();
  }

  const places = findPlacesByCategory(category);
  const Icon = categoryIcons[category] ?? Compass;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ItemList",
        name: `${info.name} in Bengaluru`,
        description: info.description,
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
            name: "Categories",
            item: "https://www.nocapblr.com/#categories",
          },
          {
            "@type": "ListItem",
            position: 3,
            name: info.name,
            item: `https://www.nocapblr.com/categories/${category}`,
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
            <span className="text-zinc-900">{info.name}</span>
          </nav>

          {/* Header Card */}
          <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 sm:p-10 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-zinc-950 text-white">
                <Icon className="h-6 w-6" />
              </span>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Bengaluru Category Guide
                </span>
                <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-zinc-950">
                  {info.name}
                </h1>
              </div>
            </div>

            <p className="text-sm sm:text-base text-zinc-600 max-w-2xl leading-relaxed">
              {info.description}
            </p>

            {/* Category Nav Tabs */}
            <div className="mt-6 flex flex-wrap gap-2 pt-6 border-t border-zinc-100">
              {nocapPlaceCategories.map((catKey) => {
                const isActive = catKey === category;
                return (
                  <Link
                    key={catKey}
                    href={`/categories/${catKey}`}
                    className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                      isActive
                        ? "bg-zinc-950 text-white shadow-xs"
                        : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                    }`}
                  >
                    {categoryDetails[catKey]?.name ?? catKey}
                  </Link>
                );
              })}
              <Link
                href="/map"
                className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-900 hover:bg-zinc-50 transition-colors"
              >
                <MapIcon className="h-3.5 w-3.5" />
                <span>Open in Map</span>
              </Link>
            </div>
          </div>

          {/* Places Grid */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-zinc-950">
                All {info.name} Spots ({places.length})
              </h2>
              <span className="text-xs font-medium text-zinc-500">
                Sorted by neighborhood
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {places.map((place) => {
                const areaSlug = slugifyArea(place.area);
                return (
                  <Link
                    key={place.id}
                    href={`/places/${place.id}`}
                    className="group flex flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-5 transition-all hover:border-zinc-400 hover:shadow-xs"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold text-zinc-500 mb-2">
                        <span className="inline-flex items-center gap-1 text-zinc-700">
                          <MapPin className="h-3 w-3 text-zinc-400" />
                          <span>{place.area}</span>
                        </span>
                      </div>
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
        </div>
      </main>
      <SiteFooter />
    </div>
  </>
);
}

