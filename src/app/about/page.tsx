import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Compass, ShieldCheck, MapPin, Zap, Flame, Award, HeartHandshake, Map } from "lucide-react";
import { SiteFooter } from "@/components/nav/site-footer";

export const metadata: Metadata = {
  title: "About NoCapBLR",
  description:
    "We're fixing broken reviews. No paid PR, no sponsored stars, no influencer fluff. Real local opinions and location-verified reviews across Bengaluru.",
  alternates: {
    canonical: "https://nocapblr.com/about",
  },
};

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F6F5F2] text-zinc-950">
      <main className="flex-1 py-10 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* Navigation Breadcrumb */}
          <div className="mb-6 flex items-center gap-2 text-xs font-semibold text-zinc-500">
            <Link href="/" className="hover:text-zinc-900 transition-colors">Home</Link>
            <span>/</span>
            <span className="text-zinc-900">About</span>
          </div>

          {/* Hero Card */}
          <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 sm:p-12 shadow-xs">
            <div className="inline-flex items-center gap-2 rounded-full bg-zinc-950 px-3.5 py-1 text-xs font-bold text-white mb-6">
              <Flame className="h-3.5 w-3.5 text-amber-400" />
              <span>The Anti-Hype Movement</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-950 leading-[1.1]">
              India’s Next Big <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-500 bg-clip-text text-transparent">
                Review Network.
              </span>
            </h1>

            <p className="mt-6 text-base sm:text-xl text-zinc-600 leading-relaxed font-normal">
              Everyone knows standard online ratings are broken. Every cafe has 4.4 stars. Every influencer’s reel calls a mediocre spot &ldquo;a hidden gem.&rdquo; Real people show up, wait 45 minutes in traffic, pay ₹600, and leave disappointed.
            </p>

            <p className="mt-4 text-sm sm:text-lg text-zinc-800 font-medium leading-relaxed">
              NoCapBLR is built to change that. <strong>Before you go, know.</strong> Real people. Real opinions. No cap.
            </p>

            <div className="mt-8 flex flex-wrap gap-4 pt-6 border-t border-zinc-100">
              <Link
                href="/map"
                className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-zinc-800 transition-all"
              >
                <Map className="h-4 w-4" />
                <span>Launch Bengaluru Map</span>
              </Link>
              <Link
                href="/guidelines"
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-3 text-sm font-bold text-zinc-800 hover:bg-zinc-100 transition-all"
              >
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Community Guidelines</span>
              </Link>
            </div>
          </div>

          {/* Core Pillars Grid */}
          <div className="mt-8 sm:mt-10 grid gap-6 sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-100 text-zinc-950 mb-4">
                <MapPin className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-zinc-950">On-Site Verification</h2>
              <p className="mt-2 text-xs sm:text-sm text-zinc-600 leading-relaxed">
                Reviews can be stamped with a &ldquo;Verified on-site&rdquo; badge only when submitted from your device’s physical GPS coordinates at the place. No bot farms writing reviews from 2,000 km away.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-100 text-zinc-950 mb-4">
                <Award className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-zinc-950">Zero Paid PR</h2>
              <p className="mt-2 text-xs sm:text-sm text-zinc-600 leading-relaxed">
                Restaurants and venues cannot pay us to delete negative opinions, feature promoted listings, or artificially inflate ratings. What the community says stays.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-100 text-zinc-950 mb-4">
                <Zap className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-zinc-950">Ground Truth Consensus</h2>
              <p className="mt-2 text-xs sm:text-sm text-zinc-600 leading-relaxed">
                We synthesize unfiltered public discussions from Bengaluru locals alongside firsthand live check-ins so you get the unvarnished reality before stepping out.
              </p>
            </div>
          </div>

          {/* The Story / Manifesto */}
          <div className="mt-8 sm:mt-10 rounded-3xl border border-zinc-200/80 bg-white p-6 sm:p-10 shadow-xs space-y-6 text-zinc-700 leading-relaxed text-sm sm:text-base">
            <h2 className="text-2xl font-black text-zinc-950 tracking-tight">
              Why Bengaluru Deserves Better Than Influencer Fluff
            </h2>
            <p>
              Bengaluru is one of the most culturally vibrant, food-obsessed, and dynamic cities in the world. From legendary heritage tiffin rooms in Malleshwaram and Basavanagudi to cutting-edge craft breweries in Indiranagar and Koramangala, the city’s pulse lives in its local spaces.
            </p>
            <p>
              Yet discovery tools have surrendered to algorithmic feeds and PR agencies. You see reels filmed with professional lighting where creators are fed complimentary meals and instructed on exactly what adjectives to recite. Meanwhile, the ordinary customer encounters an hour-long queue, lukewarm sambar, and non-existent parking.
            </p>
            <p className="font-semibold text-zinc-950">
              NoCapBLR represents a return to authenticity:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm">
              <li><strong>Nuance over numbers:</strong> A 1-to-5 star average tells you nothing about wait times, seating comfort, or whether the ghee roast is actually crispy today. Detailed, candid takes tell the whole story.</li>
              <li><strong>Transparent sourcing:</strong> We clearly label original user reviews versus archived local discussions. No stolen reviews, no hidden sponsored tags.</li>
              <li><strong>Neighborhood-first discovery:</strong> Explore your specific pocket—whether it’s HSR Layout, Jayanagar, Whitefield, or Central Bengaluru.</li>
            </ul>
          </div>

          {/* Contact & Governance */}
          <div className="mt-8 sm:mt-10 rounded-2xl border border-zinc-200/80 bg-zinc-100/70 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <h2 className="text-base font-bold text-zinc-950">Have questions, feedback, or a partnership inquiry?</h2>
              <p className="text-xs text-zinc-600 mt-1">We read every message and take moderation reports seriously.</p>
            </div>
            <a
              href="mailto:nocapblr@gmail.com"
              className="inline-flex items-center gap-2 rounded-xl bg-white border border-zinc-200 px-4 py-2.5 text-xs font-bold text-zinc-900 shadow-2xs hover:bg-zinc-50 transition-colors"
            >
              <HeartHandshake className="h-4 w-4 text-zinc-700" />
              <span>nocapblr@gmail.com</span>
            </a>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
