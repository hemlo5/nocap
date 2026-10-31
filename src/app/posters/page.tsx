import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPin, Sparkles } from "lucide-react";
import { SiteFooter } from "@/components/nav/site-footer";
import { PostersGallery } from "@/components/nocap/posters-gallery";
import { POSTERS_DATA } from "@/lib/nocap/posters";

const url = "https://nocapblr.com/posters";

export const metadata: Metadata = {
  title: "The Official NoCapBLR Street Posters Gallery | Bengaluru Campaign",
  description:
    "Explore the complete archive of original street posters pasted across Bengaluru that powered NoCapBLR's grassroots launch to 10,000 active users on day one.",
  alternates: { canonical: url },
  openGraph: {
    title: "NoCapBLR Street Posters | Bengaluru Guerrilla Campaign Archive",
    description:
      "The 9 unfiltered street posters that launched NoCapBLR across Bengaluru on October 25, 2026.",
    url,
    type: "article",
    images: [
      {
        url: "/posters/1.png",
        width: 1080,
        height: 1350,
        alt: "NoCapBLR Street Poster: Potholes deeper than your ex?",
      },
    ],
  },
};

export default function PostersPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "The Official NoCapBLR Street Posters Gallery",
    description:
      "The complete archive of original street posters pasted across Bengaluru during the NoCapBLR grassroots launch.",
    datePublished: "2026-10-25",
    dateModified: "2026-10-31",
    mainEntityOfPage: url,
    author: {
      "@type": "Person",
      name: "Aniket Vaishu",
      url: "https://www.aniket.social/",
    },
    publisher: {
      "@id": "https://nocapblr.com/#organization",
    },
    image: POSTERS_DATA.map((p) => `https://nocapblr.com${p.src}`),
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F6F5F2] text-zinc-950">
      <main id="main-content" className="flex-1 px-4 py-10 sm:px-6 sm:py-16">
        <article className="mx-auto max-w-6xl">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />

          {/* Header Eyebrow & Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-red-700">
              Guerrilla street archive
            </p>
            <span className="text-zinc-300">·</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/80 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
              <Sparkles className="h-3 w-3" />
              10,000 Day-One Users
            </span>
          </div>

          {/* Main Title & Lead */}
          <div className="mt-5 grid gap-10 border-b border-zinc-300 pb-10 lg:grid-cols-[1.15fr_.85fr] lg:items-end">
            <h1 className="text-4xl font-black leading-[1.04] tracking-tight sm:text-6xl text-zinc-950">
              The posters that launched NoCapBLR across Bengaluru.
            </h1>
            <p className="text-base leading-7 text-zinc-600 sm:text-lg">
              On October 25, 2026, NoCapBLR recorded 10,000 active users on its
              very first day following a grassroots street poster campaign led by
              founder Aniket Vaishu. These 9 bold, unfiltered posters were
              pasted across IT corridors, college hostels, metro gates, and
              nightlife streets to spark real, hype-free local conversations.
            </p>
          </div>

          {/* Campaign Narrative Context */}
          <div className="mt-10 grid gap-6 rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 lg:grid-cols-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-red-700">
                01 · The Premise
              </span>
              <h2 className="mt-2 text-lg font-black text-zinc-950">
                Physical posters for a digital map
              </h2>
              <p className="mt-2 text-xs leading-5 text-zinc-600">
                In a city saturated with generic online ads and influencer hype,
                physical street posters brought the product directly to where
                decisions happen: on the pavement, outside cafes, at bus stops,
                and near tech parks.
              </p>
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-red-700">
                02 · The Unfiltered Topics
              </span>
              <h2 className="mt-2 text-lg font-black text-zinc-950">
                Speaking Bengaluru&apos;s real dialect
              </h2>
              <p className="mt-2 text-xs leading-5 text-zinc-600">
                From crater-sized potholes and toxic startup hours to hostel mess
                food and women&apos;s night safety, each poster articulated a
                friction point that locals experience every day without filter.
              </p>
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-red-700">
                03 · Instant QR Conversion
              </span>
              <h2 className="mt-2 text-lg font-black text-zinc-950">
                Scan, discover, and expose
              </h2>
              <p className="mt-2 text-xs leading-5 text-zinc-600">
                Every single poster featured a direct, prominent QR code. A
                quick scan opened NoCapBLR instantly without app installs,
                allowing anyone to read candid notes and drop their own takes.
              </p>
            </div>
          </div>

          {/* Interactive Poster Gallery */}
          <div className="mt-14">
            <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-zinc-950 sm:text-3xl">
                  Complete Street Poster Archive
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Click any poster to inspect full resolution, read the location context, or download.
                </p>
              </div>
              <Link
                href="/map"
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-xs font-bold text-zinc-900 hover:border-zinc-500 transition-colors shadow-2xs"
              >
                <MapPin className="h-3.5 w-3.5 text-red-600" />
                <span>See pinned places on map</span>
              </Link>
            </div>

            <PostersGallery />
          </div>

          {/* Story & Context Deep Dive */}
          <div className="mx-auto mt-16 max-w-3xl space-y-8 border-t border-zinc-300 pt-12 text-base leading-8 text-zinc-700">
            <section>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-950">
                How a guerrilla campaign turned into 10,000 active users
              </h2>
              <p className="mt-3">
                When founder Aniket Vaishu set out to introduce NoCapBLR, the goal
                was not to run another sponsored Instagram ad campaign. Bengaluru
                is flooded with polished marketing reels where every mediocre
                coffee spot is called an &ldquo;aesthetic hidden gem&rdquo; and
                every commercial venue claims five stars.
              </p>
              <p className="mt-4">
                The street posters were intentionally tactile, high-contrast, and
                provocative. Placed across high-footfall youth corridors—from
                Indiranagar and Koramangala to KJC, Manyata Tech Park, and
                Electronic City—they stood out amidst city clutter. Pedestrians
                stopped, took photos, scanned the QR codes, and shared them on
                their WhatsApp groups and Instagram stories.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-950">
                Turning viral street attention into genuine place context
              </h2>
              <p className="mt-3">
                Attention alone does not build a durable product. What mattered
                most on launch day was what happened after people scanned: they
                discovered an interactive map of Bengaluru populated with
                unvarnished community observations. Commuters pinned broken
                roads and unlit stretches; students documented campus cafes;
                workers left honest takes on local spots.
              </p>
              <p className="mt-4">
                The posters are now preserved here as the official visual
                record of NoCapBLR&apos;s beginning: a product founded on the
                belief that before you spend your time, commute, or money, you
                deserve to know the real truth.
              </p>
            </section>
          </div>

          {/* Cross-page Navigation & Backlinks */}
          <div className="mt-14 border-t border-zinc-300 pt-8">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Related campaign stories &amp; links
            </h3>
            <div className="mt-4 flex flex-wrap gap-4 text-sm font-bold text-red-700">
              <Link
                href="/campaigns/bengaluru-street-campaign"
                className="hover:underline flex items-center gap-1"
              >
                <span>Read the Bengaluru street campaign case study</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <span className="text-zinc-300">·</span>
              <Link
                href="/campaigns/behind-the-campaign"
                className="hover:underline flex items-center gap-1"
              >
                <span>Behind the campaign principles</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <span className="text-zinc-300">·</span>
              <Link
                href="/founder/aniket-vaishu"
                className="hover:underline flex items-center gap-1"
              >
                <span>Meet founder Aniket Vaishu</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <span className="text-zinc-300">·</span>
              <Link
                href="/newsroom/nocapblr-reaches-10000-active-users-on-day-one"
                className="hover:underline flex items-center gap-1"
              >
                <span>Official Day One milestone announcement</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}

