import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Shield, MapPin, Lock, Eye, RefreshCw, Mail } from "lucide-react";
import { SiteFooter } from "@/components/nav/site-footer";

export const metadata: Metadata = {
  title: "Privacy Policy | NoCap Bengaluru",
  description: "Privacy policy for NoCap Bengaluru explaining our data handling, location usage, and community guidelines.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F6F5F2] text-zinc-950">
      <main className="flex-1 py-10 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
        {/* Back Link */}
        <Link
          href="/map"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-950 transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Map
        </Link>

        {/* Header Card */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 sm:p-8 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-950 text-white">
              <Shield className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Privacy Policy</h1>
              <p className="text-xs font-medium text-zinc-500 mt-0.5">
                NoCap Bengaluru (<span className="font-semibold text-zinc-700">nocapblr.com</span>) · Last updated: October 18, 2026
              </p>
            </div>
          </div>

          <p className="mt-5 text-sm leading-relaxed text-zinc-600">
            Welcome to <strong>NoCap Bengaluru</strong> (&ldquo;NoCap&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;). We believe in authentic, firsthand local reviews—no fake ratings, no fluff. This Privacy Policy describes how we collect, use, and protect your personal information when you use our website and discovery map.
          </p>
        </div>

        {/* Policy Content Sections */}
        <div className="mt-8 space-y-6">
          {/* Section 1 */}
          <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-2.5 text-zinc-950 mb-3">
              <Eye className="h-5 w-5 text-zinc-700" />
              <h2 className="text-lg font-bold">1. Information We Collect</h2>
            </div>
            <div className="space-y-3 text-sm leading-relaxed text-zinc-600">
              <p>When you interact with NoCap, we may collect the following types of information:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-zinc-900">Account Information:</strong> When you sign in using Google OAuth via Supabase, we collect your name, email address, and profile picture avatar.
                </li>
                <li>
                  <strong className="text-zinc-900">User-Generated Content:</strong> Any reviews, notes, ratings (1–5 stars or text-only notes), and user-pinned places that you submit to the map.
                </li>
                <li>
                  <strong className="text-zinc-900">Location Data:</strong> When you pin a new place or post a review, we request your device&apos;s current geographic coordinates (latitude and longitude) through standard browser Geolocation APIs.
                </li>
                <li>
                  <strong className="text-zinc-900">Transaction &amp; Badge Data:</strong> If you upgrade a review to a &ldquo;Legit&rdquo; status, payments are processed directly by our merchant partner, Razorpay. We receive confirmation metadata (such as review ID and payment ID); we do not store raw credit card numbers.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 2 */}
          <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-2.5 text-zinc-950 mb-3">
              <MapPin className="h-5 w-5 text-rose-600" />
              <h2 className="text-lg font-bold">2. How We Use Location Data</h2>
            </div>
            <div className="space-y-3 text-sm leading-relaxed text-zinc-600">
              <p>
                Our core promise is <em>&ldquo;no cap&rdquo;</em>—authentic experiences shared right from where they happened.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-zinc-900">On-Site Verification:</strong> We only check your location when you explicitly click &ldquo;Write a NoCap&rdquo; or &ldquo;Pin a Place&rdquo; to ensure you are physically present near the spot.
                </li>
                <li>
                  <strong className="text-zinc-900">No Continuous Background Tracking:</strong> We do <strong>not</strong> track your background movements or monitor your GPS when you are simply browsing the map.
                </li>
                <li>
                  <strong className="text-zinc-900">User Control:</strong> Location permission is strictly opt-in. You can grant or revoke location access at any time through your browser settings.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-2.5 text-zinc-950 mb-3">
              <Lock className="h-5 w-5 text-zinc-700" />
              <h2 className="text-lg font-bold">3. How Your Information Is Stored &amp; Protected</h2>
            </div>
            <div className="space-y-3 text-sm leading-relaxed text-zinc-600">
              <p>We implement industry-standard safeguards to protect your data:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-zinc-900">Authentication &amp; Database:</strong> User profiles and reviews are securely managed through <strong>Supabase</strong> with Row-Level Security (RLS) policies.
                </li>
                <li>
                  <strong className="text-zinc-900">Encryption:</strong> All communication between your device and our servers is encrypted using Transport Layer Security (HTTPS/TLS).
                </li>
                <li>
                  <strong className="text-zinc-900">Third-Party Infrastructure:</strong> Hosted on Railway with Edge proxies and Cloudflare protection.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 4 */}
          <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-2.5 text-zinc-950 mb-3">
              <RefreshCw className="h-5 w-5 text-zinc-700" />
              <h2 className="text-lg font-bold">4. Data Sharing &amp; Third-Party Services</h2>
            </div>
            <div className="space-y-3 text-sm leading-relaxed text-zinc-600">
              <p>We do not sell, rent, or monetize your personal information to third parties or advertisers. We share information only with trusted infrastructure providers required to operate the service:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong className="text-zinc-900">Google OAuth:</strong> To provide secure single sign-on without managing raw passwords.</li>
                <li><strong className="text-zinc-900">Supabase:</strong> For database and user session persistence.</li>
                <li><strong className="text-zinc-900">Razorpay:</strong> For secure checkout processing of Legit review badges.</li>
                <li><strong className="text-zinc-900">MapLibre &amp; CARTO:</strong> For rendering interactive vector basemaps.</li>
              </ul>
            </div>
          </section>

          {/* Section 5 */}
          <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-2.5 text-zinc-950 mb-3">
              <Shield className="h-5 w-5 text-zinc-700" />
              <h2 className="text-lg font-bold">5. Your Rights &amp; Choices</h2>
            </div>
            <div className="space-y-3 text-sm leading-relaxed text-zinc-600">
              <p>You have full control over your data on NoCap:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong className="text-zinc-900">Profile Edits:</strong> You can edit your display name and bio directly from your <Link href="/nocap/profile" className="text-zinc-900 font-semibold underline underline-offset-2">Profile Page</Link>.</li>
                <li><strong className="text-zinc-900">Data Deletion:</strong> You may request the deletion of your account and all associated reviews/pins at any time by contacting us.</li>
                <li><strong className="text-zinc-900">Local Storage:</strong> You can clear browser local storage to reset your visit onboarding state.</li>
              </ul>
            </div>
          </section>

          {/* Section 6 */}
          <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-2.5 text-zinc-950 mb-3">
              <Mail className="h-5 w-5 text-zinc-700" />
              <h2 className="text-lg font-bold">6. Contact Us</h2>
            </div>
            <p className="text-sm leading-relaxed text-zinc-600">
              If you have any questions, feedback, or data requests regarding this Privacy Policy, please reach out to us:
            </p>
            <div className="mt-4 rounded-xl bg-zinc-50 border border-zinc-200/70 p-4 text-xs font-mono text-zinc-700">
              Email: <span className="font-semibold text-zinc-950">nocapblr@gmail.com</span>
              <br />
              Website: <span className="font-semibold text-zinc-950">https://nocapblr.com</span>
            </div>
          </section>
        </div>

        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

