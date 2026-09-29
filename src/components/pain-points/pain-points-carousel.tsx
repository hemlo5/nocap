"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  MessageSquare,
  Compass,
} from "lucide-react";
import { SqueezeCarousel, type SqueezeSlide } from "@/components/ui/carousel-squeeze";
import type { MarketProblem, ProblemSector } from "@/lib/services/pain-points";

const SECTOR_CONFIG: Record<
  ProblemSector,
  { label: string; badgeClass: string; defaultImage: string }
> = {
  fintech: {
    label: "Fintech",
    badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    defaultImage:
      "https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=1200&q=80",
  },
  edtech: {
    label: "Edtech",
    badgeClass: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    defaultImage:
      "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80",
  },
  healthcare: {
    label: "Healthcare",
    badgeClass: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    defaultImage:
      "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=80",
  },
  logistics: {
    label: "Logistics",
    badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    defaultImage:
      "https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&w=1200&q=80",
  },
  saas: {
    label: "SaaS",
    badgeClass: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    defaultImage:
      "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80",
  },
  consumer: {
    label: "Consumer",
    badgeClass: "bg-pink-500/20 text-pink-300 border-pink-500/30",
    defaultImage:
      "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1200&q=80",
  },
  hrtech: {
    label: "HRtech",
    badgeClass: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    defaultImage:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=80",
  },
  proptech: {
    label: "Proptech",
    badgeClass: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    defaultImage:
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
  },
  agritech: {
    label: "Agritech",
    badgeClass: "bg-lime-500/20 text-lime-300 border-lime-500/30",
    defaultImage:
      "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1200&q=80",
  },
  other: {
    label: "General",
    badgeClass: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
    defaultImage:
      "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80",
  },
};

const PROBLEM_EDITORIAL_IMAGES: Record<string, string> = {
  // Proptech: High-rise urban rental apartments at dusk
  "rent-verification":
    "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
  // Fintech: Small business owner at commerce checkout counter
  "credit-small-biz":
    "https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=1200&q=80",
  // Logistics: Real urban parcel courier in transit
  "last-mile-delivery":
    "https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&w=1200&q=80",
  // Healthcare: Clinical hospital diagnostic suite
  "healthcare-access":
    "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=80",
  // HRtech: Focused 1-on-1 career interview in modern studio
  "hr-hiring-small":
    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=80",
  // Edtech: Engineering student deeply focused on code terminal
  "edtech-outcomes":
    "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80",
  // SaaS: Enterprise cloud data center infrastructure
  "saas-localization":
    "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80",
  // Food Logistics: Commercial cloud kitchen culinary prep line
  "food-waste":
    "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1200&q=80",
  // Agritech: Modern expansive agricultural crop fields
  "farm-income":
    "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1200&q=80",
  // Mental Health: Quiet, warm, serene private consultation space
  "mental-health-stigma":
    "https://images.unsplash.com/photo-1516302752625-fcc3c50ae61f?auto=format&fit=crop&w=1200&q=80",
};

type PainPointsCarouselProps = {
  problems: MarketProblem[];
};

export function PainPointsCarousel({ problems }: PainPointsCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!problems.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/60 py-20 text-center">
        <Compass className="h-10 w-10 text-zinc-600" />
        <p className="mt-3 text-sm font-medium text-zinc-400">
          No pain points found for this sector.
        </p>
        <Link
          href="/pain-points"
          className="mt-2 text-xs font-semibold text-blue-400 hover:text-violet-300 hover:underline"
        >
          View all sectors →
        </Link>
      </div>
    );
  }

  const slides: SqueezeSlide[] = problems.map((problem) => {
    const config = SECTOR_CONFIG[problem.sector] ?? SECTOR_CONFIG.other;
    const imageUrl =
      PROBLEM_EDITORIAL_IMAGES[problem.id] ?? config.defaultImage;

    return {
      id: problem.id,
      title: problem.title,
      description: `${problem.description} ${
        problem.mentionCount > 0
          ? `(${problem.mentionCount} discussions tracked across verified community threads)`
          : ""
      }`,
      image: imageUrl,
      imageAlt: problem.title,
      action: "Find startups solving this",
      href: `/?query=${encodeURIComponent(problem.sector)}`,
      overlay: (
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold backdrop-blur-md ${config.badgeClass}`}
          >
            {config.label}
          </span>
          {problem.mentionCount > 0 && (
            <span className="inline-flex items-center rounded-full border border-white/20 bg-black/60 backdrop-blur-md px-2.5 py-1 text-xs font-semibold text-white">
              {problem.mentionCount} discussions
            </span>
          )}
        </div>
      ),
    };
  });

  const currentProblem = problems[activeIndex] ?? problems[0];

  return (
    <div className="flex flex-col gap-6">
      {/* Squeeze Carousel Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-800/90 bg-[#0d0d12] p-5 shadow-2xl sm:p-7 lg:p-9">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-8 items-center justify-center rounded-md bg-blue-600/20 border border-blue-500/30 text-xs font-bold text-blue-300">
              {activeIndex + 1}/{problems.length}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Interactive Pain Point Explorer
            </span>
          </div>
          <p className="text-xs text-zinc-500">
            Hover or select slices to expand · Click action to map hiring startups
          </p>
        </div>

        <SqueezeCarousel
          slides={slides}
          defaultIndex={0}
          onIndexChange={setActiveIndex}
          height="clamp(280px, 40cqi, 440px)"
          radius={14}
          gap={16}
          slatGap={10}
          slatWidth={14}
          hoverGrow={true}
          controls={true}
          accent="#2563eb"
          accentForeground="#ffffff"
          label="Market Pain Points Carousel"
        />
      </div>

      {/* Community Evidence Bar for Active Pain Point */}
      {currentProblem && currentProblem.sources.length > 0 && (
        <div className="rounded-2xl border border-zinc-800/90 bg-[#0d0d12] p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400">
              <MessageSquare className="h-3.5 w-3.5 text-blue-400" />
              Community Discussions for &quot;{currentProblem.title}&quot;
            </span>
            <span className="text-xs text-zinc-500">
              {currentProblem.sources.length} verified thread{currentProblem.sources.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {currentProblem.sources.map((source) => (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3.5 transition hover:border-blue-500/50 hover:bg-zinc-900"
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-black ${
                      source.platform === "reddit"
                        ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    }`}
                  >
                    {source.platform === "reddit" ? "R" : "HN"}
                  </span>
                  <p className="line-clamp-2 text-xs font-medium text-zinc-300 group-hover:text-white">
                    {source.title}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-zinc-800/60 pt-2 text-[11px] text-zinc-500">
                  <span className="text-zinc-400 font-medium">↑ {source.upvotes} upvotes</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-blue-400 group-hover:text-blue-300 group-hover:underline">
                    View thread <ExternalLink className="h-3 w-3" />
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
