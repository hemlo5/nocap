import type { Metadata } from "next";
import Link from "next/link";
import {
  Map,
  ShieldCheck,
  Flame,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  Compass,
  MapPin,
  Sparkles,
} from "lucide-react";
import { SiteFooter } from "@/components/nav/site-footer";

export const metadata: Metadata = {
  title: "What is NoCap & Why NoCap? — The Anti-Hype Review Network",
  description:
    "Why 4.4 stars mean nothing anymore. Discover what NoCap is, why traditional review apps are broken, and how our on-site verification brings honest takes to Bengaluru.",
  alternates: {
    canonical: "https://www.nocapblr.com/why-nocap",
  },
  openGraph: {
    title: "What is NoCap & Why NoCap? — The Anti-Hype Review Network",
    description:
      "Why 4.4 stars mean nothing anymore. Influencer reels and paid PR have ruined ratings. Learn what NoCap is and why Bengaluru needs real opinions.",
    url: "https://www.nocapblr.com/why-nocap",
    siteName: "NoCapBLR",
    images: [
      {
        url: "/nocap-logo.png",
        width: 1200,
        height: 630,
        alt: "What is NoCap & Why NoCap",
      },
    ],
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "What is NoCap & Why NoCap? — The Anti-Hype Review Network",
    description:
      "Why 4.4 stars mean nothing anymore. Real people, on-site verified takes, zero paid PR.",
    images: ["/nocap-logo.png"],
  },
};

export default function WhyNocapPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "https://www.nocapblr.com/why-nocap#webpage",
        url: "https://www.nocapblr.com/why-nocap",
        name: "What is NoCap & Why NoCap?",
        description:
          "Why 4.4 stars mean nothing anymore. How NoCapBLR solves broken online ratings with on-site GPS verified reviews.",
        publisher: {
          "@id": "https://www.nocapblr.com/#organization",
        },
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
            name: "Why NoCap",
            item: "https://www.nocapblr.com/why-nocap",
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
      <main className="min-h-[calc(100dvh-3.5rem)] bg-[#F6F5F2] text-zinc-950 py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* Breadcrumbs */}
          <nav
            aria-label="Breadcrumbs"
            className="mb-6 flex items-center gap-1.5 text-xs font-semibold text-zinc-500"
          >
            <Link href="/" className="hover:text-zinc-900 transition-colors">
              Home
            </Link>
            <span>/</span>
            <span className="text-zinc-900">Why NoCap</span>
          </nav>

          {/* ── PART 1: WHAT IS NOCAP? ── */}
          <div className="rounded-3xl border border-zinc-200/80 bg-white p-8 sm:p-12 shadow-xs">
            <div className="inline-flex items-center gap-2 rounded-full bg-zinc-950 px-3.5 py-1 text-xs font-bold text-white mb-6">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>India&apos;s Next Big Review Network</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-950 leading-[1.1]">
              What is NoCap?
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-zinc-700 leading-relaxed font-normal">
              <strong>NoCapBLR</strong> is a location-bound, community-first review network built to redefine how Bengaluru discovers places. No PR agencies, no sponsored stars, and no influencer fluff.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-3 pt-6 border-t border-zinc-100">
              <div className="rounded-2xl border border-zinc-200/70 bg-[#FBFBFA] p-4">
                <span className="text-xs font-bold text-zinc-950 block mb-1">
                  1. Location-Bound Takes
                </span>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Real people share notes and reviews tied to the exact physical venue they experienced.
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200/70 bg-[#FBFBFA] p-4">
                <span className="text-xs font-bold text-zinc-950 block mb-1">
                  2. Verified On-Site Stamp
                </span>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Reviews submitted while your device is physically present at the venue receive our trusted green verification badge.
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200/70 bg-[#FBFBFA] p-4">
                <span className="text-xs font-bold text-zinc-950 block mb-1">
                  3. Zero Paid Promotions
                </span>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Venues cannot buy higher placement, delete negative critiques, or astroturf ratings.
                </p>
              </div>
            </div>
          </div>

          {/* ── PART 2: WHY NOCAP? (THE BROKEN REVIEW SYSTEM) ── */}
          <div className="mt-10 rounded-3xl border border-zinc-200/80 bg-white p-8 sm:p-12 shadow-xs">
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 border border-rose-200/60 px-3.5 py-1 text-xs font-bold text-rose-800 mb-6">
              <Flame className="h-3.5 w-3.5 text-rose-600" />
              <span>Why We Built It</span>
            </div>

            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
              The Broken Review System
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-zinc-950 mt-1 tracking-tight">
              Why 4.4 Stars Mean Nothing Anymore
            </h2>

            <p className="mt-4 text-base sm:text-lg text-zinc-600 leading-relaxed">
              Review apps have become marketing billboards. Influencers get free food and recite scripts. Meanwhile, you spend an hour in traffic to face an overhyped disappointment.
            </p>

            {/* Comparison Grid */}
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {/* Old Way */}
              <div className="rounded-2xl border border-rose-200/80 bg-rose-50/30 p-6 shadow-2xs">
                <div className="flex items-center gap-2 text-rose-700 font-bold text-base mb-4">
                  <XCircle className="h-5 w-5" />
                  <span>The Typical Review App</span>
                </div>
                <ul className="space-y-4 text-sm text-zinc-700 leading-relaxed">
                  <li className="flex items-start gap-2.5">
                    <span className="font-bold text-rose-500 mt-0.5">✗</span>
                    <span>
                      <strong>Paid PR campaigns:</strong> Agencies flood listings with fake 5-star ratings from hundreds of miles away.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="font-bold text-rose-500 mt-0.5">✗</span>
                    <span>
                      <strong>Influencer food reels:</strong> Everything is called &ldquo;a hidden gem&rdquo; for a free meal and check.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="font-bold text-rose-500 mt-0.5">✗</span>
                    <span>
                      <strong>Zero nuance:</strong> A 4.4 rating doesn&apos;t warn you about 60-minute weekend queues or terrible parking.
                    </span>
                  </li>
                </ul>
              </div>

              {/* The NoCap Way */}
              <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/30 p-6 shadow-2xs">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-base mb-4">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>The NoCapBLR Standard</span>
                </div>
                <ul className="space-y-4 text-sm text-zinc-700 leading-relaxed">
                  <li className="flex items-start gap-2.5">
                    <span className="font-bold text-emerald-600 mt-0.5">✓</span>
                    <span>
                      <strong>Verified on-site:</strong> Reviews are stamped with an authentic badge only when submitted from actual device GPS at the place.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="font-bold text-emerald-600 mt-0.5">✓</span>
                    <span>
                      <strong>Zero paid PR:</strong> No business can pay to hide honest critiques or boost promoted listings.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="font-bold text-emerald-600 mt-0.5">✓</span>
                    <span>
                      <strong>Ground truth takes:</strong> Candid observations on wait times, real vibe, and whether the hype is deserved.
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* CTAs */}
            <div className="mt-10 flex flex-wrap gap-4 pt-8 border-t border-zinc-100">
              <Link
                href="/map"
                className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-zinc-800 transition-all"
              >
                <Map className="h-4 w-4" />
                <span>Launch Interactive Map</span>
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-6 py-3 text-sm font-bold text-zinc-800 hover:bg-zinc-100 transition-all"
              >
                <span>Read Full About Story</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

