import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Compass, MessageSquare, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { FeedbackBoard } from "@/components/feedback/feedback-board";
import { SiteFooter } from "@/components/nav/site-footer";
import { FeedbackCategory, FeedbackItem, INITIAL_FEEDBACK_ITEMS } from "@/lib/nocap/feedback";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const revalidate = 60; // Revalidate every 60 seconds

const url = "https://nocapblr.com/feedback";

export const metadata: Metadata = {
  title: "Feedback & Feature Requests | NoCapBLR Community Roadmap",
  description:
    "Suggest new features, report bugs, and upvote ideas for NoCapBLR. Help us build the most candid, useful local discovery platform for Bengaluru.",
  alternates: {
    canonical: url,
  },
  openGraph: {
    title: "NoCapBLR Community Feedback & Feature Board",
    description:
      "Vote on new features, report bugs, and shape the future of Bengaluru's unfiltered local review network.",
    url,
    siteName: "NoCapBLR",
    type: "website",
    images: [
      {
        url: "/nocap-logo.png",
        width: 1200,
        height: 630,
        alt: "NoCapBLR Feedback Board",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NoCapBLR Community Feedback & Feature Board",
    description: "Submit ideas, report bugs, and upvote features on the public NoCapBLR roadmap.",
    images: ["/nocap-logo.png"],
  },
};

async function getFeedbackItems(): Promise<FeedbackItem[]> {
  try {
    if (isSupabaseConfigured()) {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from("nocap_feedback")
        .select("*")
        .order("upvotes_count", { ascending: false })
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((row) => ({
          id: row.id,
          title: row.title,
          description: row.description,
          category: row.category as FeedbackCategory,
          status: row.status,
          upvotesCount: row.upvotes_count ?? 1,
          authorName: row.author_name || "Anonymous",
          authorAvatar: row.author_avatar || null,
          adminResponse: row.admin_response || null,
          deviceInfo: row.device_info || null,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));
      }
    }
  } catch (err) {
    console.error("[FeedbackPage] Error loading feedback items:", err);
  }

  return INITIAL_FEEDBACK_ITEMS;
}

export default async function FeedbackPage() {
  const initialItems = await getFeedbackItems();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "NoCapBLR Community Feedback & Feature Roadmap",
    description:
      "Public feedback and bug tracking board for the NoCapBLR Bengaluru place discovery platform.",
    url,
    publisher: {
      "@id": "https://nocapblr.com/#organization",
    },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://nocapblr.com",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Feedback Board",
          item: url,
        },
      ],
    },
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F6F5F2] text-zinc-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="flex-1 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Breadcrumb & Navigation */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
              <Link href="/" className="transition-colors hover:text-zinc-900">
                Home
              </Link>
              <span>/</span>
              <span className="text-zinc-900">Feedback & Roadmap</span>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/map"
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-2xs transition-colors hover:bg-zinc-50 hover:text-zinc-950"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Map
              </Link>
            </div>
          </div>

          {/* Hero Banner Card */}
          <div className="relative mb-10 overflow-hidden rounded-3xl border border-zinc-200/90 bg-white p-6 sm:p-10 shadow-xs">
            <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-gradient-to-br from-red-100/40 via-amber-100/30 to-transparent blur-2xl" />

            <div className="relative z-10 max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-red-200/80 bg-red-50/80 px-3 py-1 text-xs font-bold text-red-900">
                <Sparkles className="h-3.5 w-3.5 text-red-600" />
                <span>Open Community Roadmap</span>
              </div>

              <h1 className="mt-4 text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl md:text-5xl">
                What should we build next for{" "}
                <span className="bg-gradient-to-r from-red-700 via-zinc-900 to-zinc-800 bg-clip-text text-transparent">
                  Bengaluru?
                </span>
              </h1>

              <p className="mt-4 text-base leading-relaxed text-zinc-600 sm:text-lg">
                NoCapBLR is built for real people, not algorithms. Have a feature idea, spotted a bug,
                or want a new neighborhood insight? Post it here, upvote what you care about, and watch
                our team build it live into production.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-4 text-xs font-medium text-zinc-500">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>No login required to submit or vote</span>
                </div>
                <span className="text-zinc-300">•</span>
                <div className="flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-amber-600" />
                  <span>Devs review weekly</span>
                </div>
                <span className="text-zinc-300">•</span>
                <div className="flex items-center gap-1.5">
                  <Compass className="h-4 w-4 text-blue-600" />
                  <span>Direct status updates on cards</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Feedback Board Component */}
          <FeedbackBoard initialItems={initialItems} />

          {/* Philosophy / Guidelines Section */}
          <div className="mt-16 rounded-3xl border border-zinc-200/90 bg-white p-6 sm:p-8 shadow-xs">
            <h2 className="text-lg font-bold text-zinc-950">How We Prioritize Features</h2>
            <div className="mt-4 grid gap-6 sm:grid-cols-3">
              <div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 font-bold text-red-700">
                  1
                </div>
                <h3 className="mt-3 text-sm font-bold text-zinc-900">Community Upvotes</h3>
                <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                  Submissions with the most community upvotes move straight to our sprint planning
                  queue for rapid review.
                </p>
              </div>

              <div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 font-bold text-amber-700">
                  2
                </div>
                <h3 className="mt-3 text-sm font-bold text-zinc-900">Local Bengaluru Utility</h3>
                <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                  Features that solve real on-the-ground pain points (parking reality, Wi-Fi speeds, late-night safety)
                  get highest priority.
                </p>
              </div>

              <div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 font-bold text-emerald-700">
                  3
                </div>
                <h3 className="mt-3 text-sm font-bold text-zinc-900">Transparent Updates</h3>
                <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                  Whenever an item moves to In Progress or Shipped, we post an official note right on
                  its card with the changelog.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
