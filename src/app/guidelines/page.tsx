import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldAlert, CheckCircle2, XCircle, AlertTriangle, Scale, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Community Guidelines | NoCapBLR",
  description:
    "Our standards for authentic, honest, and useful local reviews. Learn about on-site verification, anti-PR policies, and community moderation on NoCapBLR.",
  alternates: {
    canonical: "https://www.nocapblr.com/guidelines",
  },
};

export default function GuidelinesPage() {
  return (
    <main className="min-h-[calc(100dvh-3.5rem)] bg-[#F6F5F2] text-zinc-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-xs font-semibold text-zinc-500">
          <Link href="/" className="hover:text-zinc-900 transition-colors">Home</Link>
          <span>/</span>
          <span className="text-zinc-900">Guidelines</span>
        </div>

        {/* Header Card */}
        <div className="rounded-3xl border border-zinc-200/80 bg-white p-8 sm:p-12 shadow-xs">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200/60 px-3.5 py-1 text-xs font-bold text-emerald-800 mb-6">
            <Scale className="h-3.5 w-3.5 text-emerald-600" />
            <span>Community Trust & Integrity</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-950">
            NoCapBLR Community Guidelines
          </h1>
          <p className="mt-3 text-base sm:text-lg text-zinc-600 leading-relaxed font-normal">
            The power of NoCapBLR relies entirely on truth. We are building India&apos;s most reliable local opinion network. To keep it that way, every member agrees to adhere to the standards outlined below.
          </p>
        </div>

        {/* Do's and Don'ts */}
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {/* Do's */}
          <div className="rounded-2xl border border-emerald-200/80 bg-white p-6 shadow-xs">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-base mb-4">
              <CheckCircle2 className="h-5 w-5" />
              <span>What We Champion</span>
            </div>
            <ul className="space-y-3 text-sm text-zinc-700 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="font-bold text-emerald-600">✓</span>
                <span><strong>Firsthand experience:</strong> Share what you actually ordered, saw, or felt while you were there.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-emerald-600">✓</span>
                <span><strong>Nuance & specific details:</strong> Mention peak wait times, seating vibes, parking difficulties, or standout menu items.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-emerald-600">✓</span>
                <span><strong>Constructive honesty:</strong> It&apos;s completely fine to say a place is overhyped or not worth the price, as long as it reflects genuine experience.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-emerald-600">✓</span>
                <span><strong>On-site check-ins:</strong> Use device location when submitting reviews to earn the &ldquo;Verified on-site&rdquo; community badge.</span>
              </li>
            </ul>
          </div>

          {/* Don'ts */}
          <div className="rounded-2xl border border-rose-200/80 bg-white p-6 shadow-xs">
            <div className="flex items-center gap-2 text-rose-700 font-bold text-base mb-4">
              <XCircle className="h-5 w-5" />
              <span>Zero-Tolerance Violations</span>
            </div>
            <ul className="space-y-3 text-sm text-zinc-700 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="font-bold text-rose-600">✗</span>
                <span><strong>Paid PR & Astroturfing:</strong> Review campaigns managed by marketing agencies, restaurant staff, or compensated creators will be deleted and banned.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-rose-600">✗</span>
                <span><strong>Personal attacks & hate:</strong> Criticize food, service, and ambiance—never harass or dox individual workers or servers.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-rose-600">✗</span>
                <span><strong>Fabricated takes:</strong> Leaving reviews for venues you have never stepped foot into is strictly prohibited.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-rose-600">✗</span>
                <span><strong>Spam & promo links:</strong> Any promotional URLs, discount codes, or third-party affiliate spam will be automatically stripped.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Verification System Breakdown */}
        <div className="mt-8 rounded-3xl border border-zinc-200/80 bg-white p-8 sm:p-10 shadow-xs space-y-4">
          <h2 className="text-xl font-bold text-zinc-950">How the &ldquo;Verified On-Site&rdquo; Badge Works</h2>
          <p className="text-sm text-zinc-600 leading-relaxed">
            When you click &ldquo;Write a NoCap&rdquo; on any place page or map dot, your browser requests permission to read your current location. If your device coordinates match the verified venue boundary (within 1,500 meters), your take is permanently stamped with a <strong>Verified on-site</strong> badge.
          </p>
          <p className="text-sm text-zinc-600 leading-relaxed">
            Notes submitted without location verification are still welcome, but they do not receive the verified badge, giving users full transparency on proximity credibility.
          </p>
        </div>

        {/* Reporting and Appeals */}
        <div className="mt-8 rounded-2xl border border-zinc-200/80 bg-zinc-100/70 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <h2 className="text-base font-bold text-zinc-950">Report a Violation or Request a Correction</h2>
            <p className="text-xs text-zinc-600 mt-1">
              If you represent a venue or noticed a guideline violation, email our moderation team with evidence.
            </p>
          </div>
          <a
            href="mailto:contact@nocapblr.com?subject=Moderation%20Report"
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-zinc-200 px-4 py-2.5 text-xs font-bold text-zinc-900 shadow-2xs hover:bg-zinc-50 transition-colors"
          >
            <Mail className="h-4 w-4 text-zinc-700" />
            <span>contact@nocapblr.com</span>
          </a>
        </div>
      </div>
    </main>
  );
}

