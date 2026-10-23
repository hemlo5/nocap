import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileText, CheckCircle, Scale, Shield, AlertCircle } from "lucide-react";
import { SiteFooter } from "@/components/nav/site-footer";

export const metadata: Metadata = {
  title: "Terms of Service | NoCapBLR",
  description:
    "Terms of Service governing the use of NoCapBLR (nocapblr.com), user contributions, and authentic review submissions.",
  alternates: {
    canonical: "https://www.nocapblr.com/terms",
  },
};

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F6F5F2] text-zinc-950">
      <main className="flex-1 py-10 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* Navigation Breadcrumb */}
          <div className="mb-6 flex items-center gap-2 text-xs font-semibold text-zinc-500">
            <Link href="/" className="hover:text-zinc-900 transition-colors">Home</Link>
            <span>/</span>
            <span className="text-zinc-900">Terms</span>
          </div>

          {/* Header Card */}
          <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 sm:p-12 shadow-xs">
            <div className="flex items-center gap-3 mb-6">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-950 text-white">
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Terms of Service</h1>
                <p className="text-xs font-medium text-zinc-500 mt-0.5">
                  NoCapBLR (nocapblr.com) · Effective Date: October 18, 2026
                </p>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-zinc-600">
              These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of <strong>NoCapBLR</strong> (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) accessible via <strong className="text-zinc-900">https://www.nocapblr.com</strong> and associated subdomains. By using or accessing our website and services, you agree to be bound by these Terms.
            </p>
          </div>

          {/* Sections */}
          <div className="mt-8 space-y-6">
            <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 sm:p-8 shadow-xs">
              <h2 className="text-lg font-bold text-zinc-950 mb-3">1. Platform Purpose & User Takes</h2>
              <div className="space-y-3 text-sm leading-relaxed text-zinc-600">
                <p>
                  NoCapBLR is a community platform designed to share authentic, unvarnished firsthand opinions on venues, restaurants, parks, and cultural spots in Bengaluru.
                </p>
                <p>
                  Reviews, comments, and notes posted to the platform represent the personal viewpoints of the individual author and do not reflect the opinion, endorsement, or verified factual finding of NoCapBLR.
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 sm:p-8 shadow-xs">
              <h2 className="text-lg font-bold text-zinc-950 mb-3">2. User Accounts & Google Authentication</h2>
              <div className="space-y-3 text-sm leading-relaxed text-zinc-600">
                <p>
                  Certain features, including publishing a review and customizing your profile, require signing in via Google OAuth. You agree to maintain the security of your account and are responsible for all actions taken under your credentials.
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 sm:p-8 shadow-xs">
              <h2 className="text-lg font-bold text-zinc-950 mb-3">3. Intellectual Property and Content License</h2>
              <div className="space-y-3 text-sm leading-relaxed text-zinc-600">
                <p>
                  You retain all ownership rights to any text, reviews, or media you post. By posting on NoCapBLR, you grant us a worldwide, non-exclusive, royalty-free license to host, display, index, and distribute your content within the platform and promotional channels.
                </p>
                <p>
                  You represent that you own or have obtained all necessary rights to publish the content you submit.
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 sm:p-8 shadow-xs">
              <h2 className="text-lg font-bold text-zinc-950 mb-3">4. Prohibited Uses</h2>
              <div className="space-y-3 text-sm leading-relaxed text-zinc-600">
                <p>You agree not to:</p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                  <li>Submit paid, incentivized, or commercial advertising reviews.</li>
                  <li>Post defamatory, abusive, harassing, or hate-motivated commentary targeting workers or individuals.</li>
                  <li>Falsify device GPS coordinates or engage in automated bot scraping.</li>
                  <li>Attempt to bypass security features, rate limits, or access controls.</li>
                </ul>
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 sm:p-8 shadow-xs">
              <h2 className="text-lg font-bold text-zinc-950 mb-3">5. Disclaimers & Governing Law</h2>
              <div className="space-y-3 text-sm leading-relaxed text-zinc-600">
                <p>
                  The platform is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. NoCapBLR makes no guarantees regarding the uptime, complete accuracy of third-party community notes, or business opening hours.
                </p>
                <p>
                  These Terms shall be governed by and construed in accordance with the laws of Karnataka, India. Any disputes arising shall be subject to the exclusive jurisdiction of the courts of Bengaluru.
                </p>
              </div>
            </section>
          </div>

          {/* Contact Note */}
          <div className="mt-8 text-center text-xs text-zinc-500">
            Questions regarding these Terms? Email us at{" "}
            <a href="mailto:nocapblr@gmail.com" className="font-semibold text-zinc-800 underline">
              nocapblr@gmail.com
            </a>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
