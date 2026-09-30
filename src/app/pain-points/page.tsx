import { getMarketProblems } from "@/lib/services/pain-points";
import { RefreshCw, AlertCircle, Compass } from "lucide-react";
import type { Metadata } from "next";
import type { ProblemSector } from "@/lib/services/pain-points";
import { PainPointsCarousel } from "@/components/pain-points/pain-points-carousel";

export const metadata: Metadata = {
  title: "Market Pain Points — hemlo",
  description:
    "Real market problems surfaced from Reddit and Hacker News — whitespace gaps and opportunities worth solving in India.",
};

export const revalidate = 21600;

const SECTOR_TABS: { value: ProblemSector | "all"; label: string }[] = [
  { value: "all", label: "All Sectors" },
  { value: "fintech", label: "Fintech" },
  { value: "edtech", label: "Edtech" },
  { value: "healthcare", label: "Healthcare" },
  { value: "logistics", label: "Logistics" },
  { value: "saas", label: "SaaS" },
  { value: "consumer", label: "Consumer" },
  { value: "hrtech", label: "HRtech" },
  { value: "proptech", label: "Proptech" },
  { value: "agritech", label: "Agritech" },
];

export default async function PainPointsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const activeSector = (
    typeof params.sector === "string" ? params.sector : "all"
  ) as ProblemSector | "all";

  let data: Awaited<ReturnType<typeof getMarketProblems>> | null = null;
  let fetchError: string | null = null;
  try {
    data = await getMarketProblems();
  } catch (err) {
    fetchError = err instanceof Error ? err.message : "Failed to load";
  }

  const problems =
    data?.problems.filter(
      (p) => activeSector === "all" || p.sector === activeSector,
    ) ?? [];

  return (
    <div className="min-h-screen w-full flex-1 bg-[#070709] text-white">
      {/* Header */}
      <div className="border-b border-zinc-800/80 bg-[#09090c] w-full">
        <div className="mx-auto max-w-screen-xl px-4 py-8 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-500 shadow-md">
                <Compass className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                    Market Pain Points
                  </h1>
                  <span className="rounded-full bg-zinc-500/10 px-2.5 py-0.5 text-xs font-bold text-zinc-500 border border-zinc-300/20">
                    Demand Signals
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-400">
                  Unfiltered frustrations and unmet gaps surfaced from Reddit and Hacker News in India.
                </p>
              </div>
            </div>

            {data && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                <span className="flex items-center gap-1.5 text-zinc-400">
                  <RefreshCw className="h-3 w-3 text-zinc-500" />
                  Synced {new Date(data.fetchedAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
                <span>·</span>
                <span>{data.sourcesScanned} community threads indexed</span>
              </div>
            )}
          </div>

          {/* Sector Navigation Filter Tabs - Pure Text, No Emojis */}
          <nav
            className="mt-6 flex gap-2 overflow-x-auto pb-1"
            aria-label="Filter by sector"
          >
            {SECTOR_TABS.map((tab) => {
              const isSelected = activeSector === tab.value;
              return (
                <a
                  key={tab.value}
                  href={
                    tab.value === "all"
                      ? "/pain-points"
                      : `/pain-points?sector=${tab.value}`
                  }
                  className={[
                    "shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition-all",
                    isSelected
                      ? "bg-white text-black shadow-lg shadow-white/10 scale-[1.02]"
                      : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:text-white hover:bg-zinc-800",
                  ].join(" ")}
                  aria-current={isSelected ? "page" : undefined}
                >
                  {tab.label}
                </a>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Container */}
      <div className="mx-auto max-w-screen-xl px-4 py-8 sm:px-6 w-full">
        {fetchError && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            {fetchError}
          </div>
        )}

        <div className="mb-6 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3">
          <p className="text-xs text-zinc-400 leading-relaxed">
            <strong className="text-zinc-200">Whitespace Discovery:</strong> Squeeze carousel surfaces problem spaces where consumers and businesses report missing solutions. Select slices to explore and identify startups solving them.
          </p>
        </div>

        {/* Carousel */}
        <PainPointsCarousel problems={problems} />
      </div>
    </div>
  );
}
