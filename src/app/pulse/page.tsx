import { getStartupPulse } from "@/lib/services/startup-pulse";
import { Activity, RefreshCw, AlertCircle, ExternalLink, ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import type { StoryCategory, PulseStory } from "@/lib/services/startup-pulse";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = {
  title: "Startup Pulse — hemlo",
  description: "Bengaluru startup stories, funding rounds, and what is booming in the Indian ecosystem.",
};

export const revalidate = 3600;

const CATEGORY_TABS: { value: StoryCategory | "all"; label: string }[] = [
  { value: "all", label: "All stories" },
  { value: "funding", label: "Funding" },
  { value: "launch", label: "Launches" },
  { value: "trend", label: "Trending" },
  { value: "news", label: "News" },
];

const CATEGORY_META: Record<StoryCategory, { label: string; className: string }> = {
  funding: { label: "Funding", className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  launch: { label: "Launch", className: "bg-zinc-50 text-[#18181B] ring-[#18181B]/20" },
  trend: { label: "Trending", className: "bg-amber-50 text-amber-700 ring-amber-600/20" },
  news: { label: "News", className: "bg-zinc-100 text-zinc-700 ring-zinc-200/80" },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function StoryCard({ story }: { story: PulseStory }) {
  const cat = CATEGORY_META[story.category] ?? CATEGORY_META.news;

  return (
    <article className="group relative flex flex-col justify-between rounded-xl border border-zinc-200/80 bg-white p-4 shadow-2xs transition-all duration-150 ease-out hover:border-zinc-300 hover:shadow-xs">
      <div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex min-w-0 items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://www.google.com/s2/favicons?domain=${story.sourceDomain}&sz=32`}
              alt={story.source}
              width={14}
              height={14}
              className="h-3.5 w-3.5 shrink-0 rounded-xs"
            />
            <span className="truncate text-xs font-medium text-zinc-500">{story.source}</span>
            <span className="text-xs text-zinc-300">·</span>
            <time dateTime={story.publishedAt} className="shrink-0 text-[11px] text-zinc-400">
              {timeAgo(story.publishedAt)}
            </time>
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
              cat.className,
            )}
          >
            {cat.label}
          </span>
        </div>

        {story.imageUrl && (
          <div className="mb-3 overflow-hidden rounded-lg bg-zinc-100 aspect-video max-h-40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={story.imageUrl}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              loading="lazy"
            />
          </div>
        )}

        <h3 className="text-sm font-semibold leading-snug text-zinc-900 line-clamp-3 group-hover:text-[#18181B] transition-colors">
          <a
            href={story.url}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-visible:outline-none focus-visible:underline"
          >
            {story.title}
          </a>
        </h3>

        {story.description && (
          <p className="mt-1.5 text-xs leading-relaxed text-zinc-500 line-clamp-2">
            {story.description}
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-end pt-2 border-t border-zinc-100">
        <a
          href={story.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[11px] font-medium text-zinc-400 transition-colors group-hover:text-[#18181B]"
        >
          <span>Read on {story.source}</span>
          <ArrowUpRight className="h-3 w-3" aria-hidden />
        </a>
      </div>
    </article>
  );
}

export default async function PulsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const activeCategory = (typeof params.category === "string" ? params.category : "all") as
    | StoryCategory
    | "all";

  let data: Awaited<ReturnType<typeof getStartupPulse>> | null = null;
  let fetchError: string | null = null;
  try {
    data = await getStartupPulse();
  } catch (err) {
    fetchError = err instanceof Error ? err.message : "Failed to load";
  }

  const stories =
    data?.stories.filter((s) => activeCategory === "all" || s.category === activeCategory) ?? [];

  return (
    <main className="min-h-screen bg-[#F7F8FB] text-zinc-900 pb-16">
      {/* Header */}
      <div className="border-b border-zinc-200/80 bg-white">
        <div className="mx-auto max-w-screen-xl px-4 py-8 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-2xs">
                <Activity className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-zinc-900">Startup Pulse</h1>
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
                </div>
                <p className="mt-0.5 text-xs sm:text-sm text-zinc-500">
                  Curated funding rounds, launches, and ecosystem momentum in Bengaluru & India
                </p>
              </div>
            </div>

            {data && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
                <span className="flex items-center gap-1.5 font-medium text-zinc-500">
                  <RefreshCw className="h-3 w-3" aria-hidden />
                  Synced {new Date(data.fetchedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span>·</span>
                <span>{data.stories.length} stories scanned</span>
              </div>
            )}
          </div>

          {/* Category tabs */}
          <nav className="mt-6 flex gap-1.5 overflow-x-auto pb-1" aria-label="Filter by category">
            {CATEGORY_TABS.map((tab) => {
              const isSelected = activeCategory === tab.value;
              return (
                <a
                  key={tab.value}
                  href={tab.value === "all" ? "/pulse" : `/pulse?category=${tab.value}`}
                  className={cn(
                    "shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150 active:scale-[0.98]",
                    isSelected
                      ? "bg-zinc-900 text-white shadow-2xs"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900",
                  )}
                  aria-current={isSelected ? "page" : undefined}
                >
                  {tab.label}
                </a>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-screen-xl px-4 py-8 sm:px-6">
        {fetchError && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-xs font-medium text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{fetchError}</span>
          </div>
        )}

        {stories.length === 0 && !fetchError && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-300 bg-white py-20 text-center">
            <Activity className="h-8 w-8 text-zinc-400" />
            <p className="text-sm font-medium text-zinc-600">No stories found for this category.</p>
            <a href="/pulse" className="text-xs font-semibold text-[#18181B] hover:underline">
              View all stories →
            </a>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {stories.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      </div>
    </main>
  );
}