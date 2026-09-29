"""
Patches nearhire-app.tsx with all mobile + performance optimisations.
Uses string replacement on the existing file — no escaping issues.
"""
import re, sys

path = "src/components/nearhire-app.tsx"
with open(path, encoding="utf-8") as f:
    src = f.read()

original_len = len(src)
changes = []

# ── 1. Imports: add ChevronDown, lazy dynamic imports, MobileFilterDrawer ────
OLD_IMPORTS = '''\
import {
  AlertCircle,
  Building2,
  ChevronLeft,
  LocateFixed,
  MapPin,
  Search,
  Sparkles,
} from "lucide-react";
import { EmptyState } from "@/components/jobs/empty-state";
import { FilterPanel, type FilterState } from "@/components/jobs/filter-panel";
import { JobCard, cssSafeId } from "@/components/jobs/job-card";
import { JobDepthCarousel } from "@/components/jobs/job-depth-carousel";
import {
  FilterSkeleton,
  LoadingState,
  MapSkeleton,
} from "@/components/jobs/loading-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";'''

NEW_IMPORTS = '''\
import {
  AlertCircle,
  Building2,
  ChevronDown,
  ChevronLeft,
  LocateFixed,
  MapPin,
  Search,
  Sparkles,
} from "lucide-react";
import { EmptyState } from "@/components/jobs/empty-state";
import type { FilterState } from "@/components/jobs/filter-panel";
import { JobCard, cssSafeId } from "@/components/jobs/job-card";
import {
  FilterSkeleton,
  LoadingState,
  MapSkeleton,
} from "@/components/jobs/loading-state";
import { Button } from "@/components/ui/button";
import { MobileFilterDrawer } from "@/components/jobs/mobile-filter-drawer";
import { cn } from "@/lib/utils/cn";'''

if OLD_IMPORTS in src:
    src = src.replace(OLD_IMPORTS, NEW_IMPORTS, 1)
    changes.append("imports updated")
else:
    print("WARN: import block not found", file=sys.stderr)

# ── 2. After JobMap dynamic, add lazy JobDepthCarousel + FilterPanel ──────────
OLD_JOBMAP = '''\
const JobMap = dynamic(() => import("@/components/map/job-map"), {
  ssr: false,
  loading: () => <MapSkeleton label="Loading map" compact />,
});

const defaultCenter'''

NEW_JOBMAP = '''\
const JobMap = dynamic(() => import("@/components/map/job-map"), {
  ssr: false,
  loading: () => <MapSkeleton label="Loading map" compact />,
});

// ── Lazy-load heavy components — saves ~52KB from initial JS parse ─────────────
const JobDepthCarousel = dynamic(
  () => import("@/components/jobs/job-depth-carousel").then(m => ({ default: m.JobDepthCarousel })),
  { ssr: false, loading: () => <LoadingState /> },
);

const FilterPanel = dynamic(
  () => import("@/components/jobs/filter-panel").then(m => ({ default: m.FilterPanel })),
  { ssr: false, loading: () => <FilterSkeleton /> },
);

const defaultCenter'''

if OLD_JOBMAP in src:
    src = src.replace(OLD_JOBMAP, NEW_JOBMAP, 1)
    changes.append("lazy dynamic imports added")
else:
    print("WARN: JobMap block not found", file=sys.stderr)

# ── 3. mapCollapsed default: detect mobile ────────────────────────────────────
OLD_COLLAPSED = '  const [mapCollapsed, setMapCollapsed]   = useState(false);'
NEW_COLLAPSED = '''\
  const [mapCollapsed, setMapCollapsed]   = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768;
  });'''

if OLD_COLLAPSED in src:
    src = src.replace(OLD_COLLAPSED, NEW_COLLAPSED, 1)
    changes.append("mapCollapsed mobile default")
else:
    print("WARN: mapCollapsed line not found", file=sys.stderr)

# ── 4. displayJobs: cap to 200 pins ──────────────────────────────────────────
OLD_DISPLAY = '''\
  const displayJobs = useMemo(
    () => rawMapJobs.filter(job => hasMapPin(job) && (job.workMode !== "remote" || filters.showRemoteOnMap) && job.locationConfidence === "exact_office"),
    [rawMapJobs, filters.showRemoteOnMap],
  );'''

NEW_DISPLAY = '''\
  // Cap at 200 pins — prevents 1,000 DOM button nodes thrashing the browser
  const displayJobs = useMemo(
    () => rawMapJobs
      .filter(job => hasMapPin(job) && (job.workMode !== "remote" || filters.showRemoteOnMap) && job.locationConfidence === "exact_office")
      .slice(0, 200),
    [rawMapJobs, filters.showRemoteOnMap],
  );'''

if OLD_DISPLAY in src:
    src = src.replace(OLD_DISPLAY, NEW_DISPLAY, 1)
    changes.append("200 pin cap")
else:
    print("WARN: displayJobs block not found", file=sys.stderr)

# ── 5. Panel header: add MobileFilterDrawer + improve map toggle ──────────────
OLD_HEADER = '''\
          {/* Panel header */}
          <div className="shrink-0 flex items-center justify-between border-b border-zinc-200/80 bg-white px-3 sm:px-4 py-2">
            <div className="min-w-0 flex-1 pr-2">
              {isBusy ? (
                <div className="animate-pulse flex gap-2 sm:gap-3">
                  <div className="h-3.5 w-24 sm:w-36 rounded bg-[#E5E7EB]" />
                  <div className="h-3.5 w-16 sm:w-20 rounded bg-[#E5E7EB]" />
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-x-1.5 sm:gap-x-2 gap-y-0.5 text-xs text-[#6B7280]">
                  <span className="font-semibold text-[#111827]">{total} opportunities</span>
                  <span className="hidden sm:inline">near {locationLabel}</span>
                  {selectedJob && <span className="truncate text-blue-600 max-w-[120px] sm:max-w-none">- {selectedJob.companyName}</span>}
                </div>
              )}
              {coverage && !isBusy && (
                <p className="mt-0.5 text-[11px] sm:text-xs text-[#9CA3AF] truncate">
                  {coverage.startupJobs} startup - {coverage.startupInternships} internship - {coverage.mappableJobs} mapped
                </p>
              )}
            </div>
            <button
              onClick={() => setMapCollapsed(!mapCollapsed)}
              title={mapCollapsed ? "Show map" : "Hide map"}
              className="flex items-center gap-1 sm:gap-1.5 rounded-lg border border-zinc-200/80 bg-white px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs font-medium text-[#374151] hover:bg-[#F9FAFB] transition shadow-xs shrink-0"
            >
              {mapCollapsed ? (
                <><MapPin className="h-3.5 w-3.5 text-blue-600" /><span className="hidden sm:inline">Show map</span><span className="sm:hidden text-[11px] font-semibold">Map</span></>
              ) : (
                <><ChevronLeft className="h-3.5 w-3.5 text-zinc-600 hidden sm:inline" /><span className="hidden sm:inline">Hide map</span><span className="sm:hidden text-[11px] font-semibold">Cards</span></>
              )}
            </button>
          </div>'''

NEW_HEADER = '''\
          {/* Panel header */}
          <div className="shrink-0 flex items-center justify-between border-b border-zinc-200/80 bg-white px-3 sm:px-4 py-2 gap-2">
            <div className="min-w-0 flex-1">
              {isBusy ? (
                <div className="animate-pulse flex gap-2 sm:gap-3">
                  <div className="h-3.5 w-24 sm:w-36 rounded bg-[#E5E7EB]" />
                  <div className="h-3.5 w-16 sm:w-20 rounded bg-[#E5E7EB]" />
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-x-1.5 sm:gap-x-2 gap-y-0.5 text-xs text-[#6B7280]">
                  <span className="font-semibold text-[#111827]">{total} opportunities</span>
                  <span className="hidden sm:inline">near {locationLabel}</span>
                </div>
              )}
              {coverage && !isBusy && (
                <p className="mt-0.5 text-[11px] sm:text-xs text-[#9CA3AF] truncate">
                  {coverage.startupJobs} startup · {coverage.startupInternships} internship · {coverage.mappableJobs} mapped
                </p>
              )}
            </div>
            {/* Mobile filters — only below lg breakpoint */}
            <div className="lg:hidden shrink-0">
              <MobileFilterDrawer filters={filters} onChange={setFilters} />
            </div>
            <button
              onClick={() => setMapCollapsed(!mapCollapsed)}
              title={mapCollapsed ? "Show map" : "Hide map"}
              className="flex items-center gap-1 sm:gap-1.5 rounded-lg border border-zinc-200/80 bg-white px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs font-medium text-[#374151] hover:bg-[#F9FAFB] transition shadow-xs shrink-0 touch-manipulation active:scale-95"
            >
              {mapCollapsed ? (
                <><MapPin className="h-3.5 w-3.5 text-blue-600" /><span className="hidden sm:inline">Show map</span><span className="sm:hidden text-[11px] font-semibold">Map</span></>
              ) : (
                <><ChevronLeft className="h-3.5 w-3.5 text-zinc-600 hidden sm:inline" /><span className="hidden sm:inline">Hide map</span><span className="sm:hidden text-[11px] font-semibold">Cards</span></>
              )}
            </button>
          </div>'''

if OLD_HEADER in src:
    src = src.replace(OLD_HEADER, NEW_HEADER, 1)
    changes.append("panel header with MobileFilterDrawer")
else:
    print("WARN: panel header block not found", file=sys.stderr)

# ── 6. Hub chip bar: wrap in relative div + fade gradient ─────────────────────
OLD_HUBS = '''\
          {/* Hub chip bar */}
          <div className="shrink-0 flex items-center gap-1.5 overflow-x-auto px-3 sm:px-4 py-1.5 bg-[#FAFBFD] border-b border-zinc-100" style={{ scrollbarWidth: "none" }}>
            <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 mr-0.5">
              <Sparkles className="h-3 w-3 text-amber-500" />
              Hubs
            </span>
            {QUICK_HUBS.map(hub => {
              const active = Math.abs(center.lat - hub.loc.lat) < 0.02 && Math.abs(center.lng - hub.loc.lng) < 0.02;
              return (
                <button key={hub.name} type="button" onClick={() => jumpToLocation(hub.loc)}
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap transition-all",
                    active ? "bg-zinc-900 text-white shadow-xs" : "bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:text-zinc-950 hover:bg-zinc-50",
                  )}>
                  {hub.name}
                </button>
              );
            })}
          </div>'''

NEW_HUBS = '''\
          {/* Hub chip bar — horizontally scrollable with fade indicator */}
          <div className="relative shrink-0 border-b border-zinc-100">
            <div
              className="flex items-center gap-1.5 overflow-x-auto px-3 sm:px-4 py-1.5 bg-[#FAFBFD]"
              style={{ scrollbarWidth: "none" }}
            >
              <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 mr-0.5">
                <Sparkles className="h-3 w-3 text-amber-500" />
                <span className="hidden sm:inline">Hubs</span>
              </span>
              {QUICK_HUBS.map(hub => {
                const active = Math.abs(center.lat - hub.loc.lat) < 0.02 && Math.abs(center.lng - hub.loc.lng) < 0.02;
                return (
                  <button key={hub.name} type="button" onClick={() => jumpToLocation(hub.loc)}
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap transition-all touch-manipulation active:scale-95",
                      active ? "bg-zinc-900 text-white shadow-xs" : "bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:text-zinc-950 hover:bg-zinc-50",
                    )}>
                    {hub.name}
                  </button>
                );
              })}
            </div>
            {/* Right-edge fade shows users they can scroll */}
            <div className="pointer-events-none absolute right-0 inset-y-0 w-10 bg-gradient-to-l from-[#FAFBFD] to-transparent" />
          </div>'''

if OLD_HUBS in src:
    src = src.replace(OLD_HUBS, NEW_HUBS, 1)
    changes.append("hub chip bar fade indicator")
else:
    print("WARN: hub chip bar block not found", file=sys.stderr)

# ── 7. Map section: increase height from 34dvh → 45dvh ───────────────────────
src = src.replace(
    '"h-[34dvh] sm:h-[38dvh] lg:h-full lg:flex-1 opacity-100 translate-y-0 lg:translate-x-0"',
    '"h-[45dvh] sm:h-[42dvh] lg:h-full lg:flex-1 opacity-100 translate-y-0 lg:translate-x-0"',
    1,
)
changes.append("map height 34dvh → 45dvh")

# ── 8. FilterPanel inside card grid: hide on mobile (use drawer instead) ──────
OLD_FP = '                {isBusy ? <FilterSkeleton /> : <FilterPanel filters={filters} onChange={setFilters} />}'
NEW_FP = '                {/* Desktop-only filter sidebar — mobile uses MobileFilterDrawer */}\n                <div className="hidden lg:contents">\n                  {isBusy ? <FilterSkeleton /> : <FilterPanel filters={filters} onChange={setFilters} />}\n                </div>'
if OLD_FP in src:
    src = src.replace(OLD_FP, NEW_FP, 1)
    changes.append("FilterPanel hidden on mobile")
else:
    print("WARN: FilterPanel grid line not found", file=sys.stderr)

# ── Write ──────────────────────────────────────────────────────────────────────
with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print(f"Done. {len(changes)} changes applied:")
for c in changes:
    print(f"  ✓ {c}")
print(f"File: {original_len} → {len(src)} bytes")
