import type { Metadata } from "next";
import Link from "next/link";
import {
  Map,
  Search,
  Sparkles,
  MapPin,
  Flame,
  ShieldCheck,
  ArrowRight,
  Compass,
  Utensils,
  Footprints,
  Trees,
  Theater,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ChevronDown,
} from "lucide-react";
import {
  nocapPlaces,
  getAllAreas,
  nocapPlaceCategories,
  categoryDetails,
  slugifyArea,
} from "@/lib/nocap/places";
import { SiteFooter } from "@/components/nav/site-footer";
import { LandingGate } from "@/components/home/landing-gate";

export const metadata: Metadata = {
  title: "NoCapBLR — Real Reviews of Places, Without the Hype",
  description:
    "Before you go, know. Discover Bengaluru places through honest, location-verified community opinions without paid PR or influencer fluff.",
  alternates: {
    canonical: "https://www.nocapblr.com",
  },
};

export default function HomePage() {
  const topAreas = getAllAreas().slice(0, 10);

  // Curated iconic places to showcase real Bengaluru spots
  const spotlightIds = [
    "ctr-malleshwaram",
    "rameshwaram-cafe",
    "church-street",
    "toit",
    "cubbon-park",
    "vidyarthi-bhavan",
  ];
  const spotlightPlaces = spotlightIds
    .map((id) => nocapPlaces.find((p) => p.id === id))
    .filter(Boolean);

  const categoryIcons: Record<string, typeof Utensils> = {
    eat: Utensils,
    street: Footprints,
    park: Trees,
    culture: Theater,
  };

  return (
    <>
      {/* Instant client-side redirect for returning visitors who have already seen the landing page */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            try {
              if (!window.location.search.includes('landing=1') && localStorage.getItem('nocap_seen_landing') === 'true') {
                window.location.replace('/map');
              }
            } catch (e) {}
          `,
        }}
      />
      <LandingGate />

      <div className="min-h-screen bg-[#F6F5F2] text-zinc-950 flex flex-col">
        {/* ── HERO SECTION ── */}
        <section className="relative overflow-hidden pt-12 pb-14 sm:pt-20 sm:pb-20 border-b border-zinc-200/80 bg-white">
          {/* Subtle background glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
          >
            <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-amber-200 to-rose-200 opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
          </div>

          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
            {/* Brand Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-1.5 text-xs font-bold text-zinc-800 shadow-2xs mb-6">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>India&apos;s Next Big Review Network</span>
              <span className="text-zinc-400">·</span>
              <span className="text-zinc-500">Bengaluru Edition</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-zinc-950 leading-[1.08]">
              Before You Go, <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-zinc-950 via-zinc-800 to-zinc-600 bg-clip-text text-transparent">
                Know.
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-zinc-600 max-w-2xl mx-auto leading-relaxed">
              Good place or just hype? Skip the paid influencer reels. Explore Bengaluru through unfiltered, location-verified community opinions.
            </p>

            {/* Quick Search Bar */}
            <div className="mt-8 max-w-xl mx-auto">
              <form action="/map" method="GET" className="relative flex items-center">
                <Search className="absolute left-4 h-5 w-5 text-zinc-400 pointer-events-none" />
                <input
                  type="text"
                  name="q"
                  placeholder="Search places (e.g. CTR, Church Street, Toit, Cubbon Park)..."
                  className="w-full rounded-2xl border border-zinc-300 bg-zinc-50/80 py-4 pl-12 pr-28 text-sm text-zinc-950 placeholder-zinc-400 shadow-sm transition-all focus:border-zinc-950 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-950"
                />
                <button
                  type="submit"
                  className="absolute right-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-zinc-800 transition-colors"
                >
                  Find
                </button>
              </form>
            </div>

            {/* Action CTAs */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/map"
                className="inline-flex items-center gap-2 rounded-2xl bg-zinc-950 px-6 py-3.5 text-sm font-bold text-white shadow-md hover:bg-zinc-800 transition-all transform hover:-translate-y-0.5"
              >
                <Map className="h-4 w-4" />
                <span>Launch Live Map</span>
              </Link>
              <a
                href="#spotlights"
                className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-6 py-3.5 text-sm font-bold text-zinc-800 shadow-2xs hover:bg-zinc-50 transition-all"
              >
                <Flame className="h-4 w-4 text-amber-500" />
                <span>Check Iconic Takes</span>
              </a>
            </div>

            {/* Quick Category Chips */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
              {nocapPlaceCategories.map((cat) => {
                const Icon = categoryIcons[cat] ?? Compass;
                return (
                  <Link
                    key={cat}
                    href={`/categories/${cat}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-700 shadow-2xs hover:border-zinc-400 hover:text-zinc-950 transition-colors"
                  >
                    <Icon className="h-3.5 w-3.5 text-zinc-500" />
                    <span>{categoryDetails[cat]?.name ?? cat}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── BENGALURU SPOTLIGHTS: REAL TAKES ── */}
        <section id="spotlights" className="py-16 sm:py-20 bg-white border-b border-zinc-200/80">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Iconic Bengaluru Places
                </span>
                <h2 className="text-2xl sm:text-4xl font-black text-zinc-950 mt-1">
                  Good Place or Just Hype?
                </h2>
                <p className="text-sm text-zinc-600 mt-1">
                  What people in Bengaluru actually say about the most talked-about spots.
                </p>
              </div>
              <Link
                href="/map"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-900 hover:underline"
              >
                <span>Explore all 79 spots on the map</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {spotlightPlaces.map((place) => {
                if (!place) return null;
                return (
                  <div
                    key={place.id}
                    className="flex flex-col justify-between rounded-3xl border border-zinc-200/80 bg-[#FBFBFA] p-6 shadow-xs hover:border-zinc-400 hover:shadow-sm transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
                        <span className="inline-flex items-center gap-1 font-semibold text-zinc-700">
                          <MapPin className="h-3 w-3 text-zinc-400" />
                          <span>{place.area}</span>
                        </span>
                        <span className="capitalize text-zinc-400 font-medium">
                          {place.category}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-zinc-950">
                        {place.name}
                      </h3>
                      <p className="text-xs text-zinc-500 mt-1 line-clamp-1">
                        {place.address}
                      </p>

                      <div className="mt-4 rounded-xl bg-white border border-zinc-200/60 p-3.5 text-xs text-zinc-700 leading-relaxed italic">
                        &ldquo;Before you go, check real wait times and community feedback on NoCapBLR.&rdquo;
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between pt-4 border-t border-zinc-200/60">
                      <Link
                        href={`/places/${place.id}`}
                        className="text-xs font-bold text-zinc-950 hover:underline inline-flex items-center gap-1"
                      >
                        <span>Read honest takes</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                      <Link
                        href={`/map?place=${place.id}`}
                        className="rounded-lg bg-zinc-950 px-2.5 py-1 text-2xs font-bold text-white hover:bg-zinc-800 transition-colors"
                      >
                        View on Map
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── HOW NOCAP WORKS ── */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Simple & Transparent
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-zinc-950 mt-1">
              How NoCapBLR Works
            </h2>
            <p className="mt-2 text-sm sm:text-base text-zinc-600 max-w-xl mx-auto">
              Built for people who want the real story.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 sm:p-8 shadow-xs text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-zinc-100 text-base font-black text-zinc-950 mb-4">
                1
              </span>
              <h3 className="text-base font-bold text-zinc-950">Search or Browse Map</h3>
              <p className="mt-2 text-xs text-zinc-600 leading-relaxed">
                Find iconic eateries, peaceful parks, vibrant shopping streets, and cultural venues across Bengaluru.
              </p>
            </div>

            <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 sm:p-8 shadow-xs text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-zinc-100 text-base font-black text-zinc-950 mb-4">
                2
              </span>
              <h3 className="text-base font-bold text-zinc-950">Read Ground Truth Takes</h3>
              <p className="mt-2 text-xs text-zinc-600 leading-relaxed">
                Unfiltered community observations and real experiences—so you know whether the hype is real before stepping out.
              </p>
            </div>

            <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 sm:p-8 shadow-xs text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-zinc-100 text-base font-black text-zinc-950 mb-4">
                3
              </span>
              <h3 className="text-base font-bold text-zinc-950">Check In & Contribute</h3>
              <p className="mt-2 text-xs text-zinc-600 leading-relaxed">
                Drop your firsthand review while at the venue to earn the &ldquo;Verified on-site&rdquo; community badge.
              </p>
            </div>
          </div>
        </section>

        {/* ── NEIGHBORHOOD EXPLORER ── */}
        <section id="neighborhoods" className="py-16 sm:py-20 bg-white border-t border-zinc-200/80">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Local Hubs
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-zinc-950 mt-1">
                Explore by Bengaluru Neighborhood
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-zinc-600">
                Discover reviews in your exact corner of the city.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              {topAreas.map((area) => (
                <Link
                  key={area.slug}
                  href={`/areas/${area.slug}`}
                  className="group rounded-2xl border border-zinc-200/80 bg-[#FBFBFA] p-4 text-center transition-all hover:border-zinc-400 hover:bg-white hover:shadow-xs"
                >
                  <div className="text-sm font-bold text-zinc-950 group-hover:underline">
                    {area.name}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {area.count} {area.count === 1 ? "spot" : "spots"}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── THE BROKEN REVIEW SYSTEM (SEO ENGINE & EXPANDABLE MANIFESTO) ── */}
        {/* Full HTML content indexed by Google, tucked in an elegant expandable card so users aren't overwhelmed */}
        <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
          <details className="group rounded-3xl border border-zinc-200/80 bg-white p-6 sm:p-8 shadow-xs transition-all">
            <summary className="cursor-pointer list-none flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Behind NoCapBLR
                </span>
                <h2 className="text-lg sm:text-xl font-black text-zinc-950 mt-0.5">
                  The Broken Review System & The NoCap Standard
                </h2>
                <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
                  Why 4.4 stars mean nothing anymore and how our on-site verification changes local discovery.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-800 shrink-0">
                <span className="hidden sm:inline group-open:hidden">Read comparison</span>
                <span className="hidden sm:inline hidden group-open:inline">Hide comparison</span>
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-zinc-100 text-zinc-700 transition-transform group-open:rotate-180">
                  <ChevronDown className="h-4 w-4" />
                </span>
              </div>
            </summary>

            <div className="mt-8 pt-8 border-t border-zinc-100">
              <div className="mb-6">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  The Broken Review System
                </span>
                <h3 className="text-2xl font-black text-zinc-950 mt-1">
                  Why 4.4 Stars Mean Nothing Anymore
                </h3>
                <p className="mt-2 text-sm text-zinc-600 leading-relaxed max-w-2xl">
                  Review apps have become marketing billboards. Influencers get free food and recite scripts. Meanwhile, you spend an hour in traffic to face an overhyped disappointment.
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                {/* Old Way */}
                <div className="rounded-2xl border border-rose-200/80 bg-rose-50/20 p-5 sm:p-6">
                  <div className="flex items-center gap-2 text-rose-700 font-bold text-sm mb-3">
                    <XCircle className="h-4 w-4" />
                    <span>The Typical Review App</span>
                  </div>
                  <ul className="space-y-3 text-xs sm:text-sm text-zinc-600 leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-rose-500">✗</span>
                      <span><strong>Paid PR campaigns:</strong> Agencies flood listings with fake 5-star ratings from hundreds of miles away.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-rose-500">✗</span>
                      <span><strong>Influencer food reels:</strong> Everything is called &ldquo;a hidden gem&rdquo; for a free meal and check.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-rose-500">✗</span>
                      <span><strong>Zero nuance:</strong> A 4.4 rating doesn&apos;t warn you about 60-minute weekend queues or terrible parking.</span>
                    </li>
                  </ul>
                </div>

                {/* The NoCap Way */}
                <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/20 p-5 sm:p-6">
                  <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm mb-3">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>The NoCapBLR Standard</span>
                  </div>
                  <ul className="space-y-3 text-xs sm:text-sm text-zinc-600 leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-emerald-600">✓</span>
                      <span><strong>Verified on-site:</strong> Reviews are stamped with an authentic badge only when submitted from actual device GPS at the place.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-emerald-600">✓</span>
                      <span><strong>Zero paid PR:</strong> No business can pay to hide honest critiques or boost promoted listings.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-emerald-600">✓</span>
                      <span><strong>Ground truth takes:</strong> Candid observations on wait times, real vibe, and whether the hype is deserved.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </details>
        </section>

        {/* ── FINAL MANIFESTO CALLOUT ── */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center">
          <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-8 sm:p-14 text-white shadow-xl">
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
              Ready to Discover Places Without the BS?
            </h2>
            <p className="mt-4 text-sm sm:text-base text-zinc-400 max-w-xl mx-auto leading-relaxed">
              Join thousands of Bengaluru locals exploring places through real opinions. No paid endorsements. Just real people.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/map"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-xs font-bold text-zinc-950 shadow-sm hover:bg-zinc-100 transition-colors"
              >
                <Map className="h-4 w-4" />
                <span>Open the Live Map</span>
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-6 py-3.5 text-xs font-bold text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                <span>Why We Started NoCap</span>
              </Link>
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <SiteFooter />
      </div>
    </>
  );
}
