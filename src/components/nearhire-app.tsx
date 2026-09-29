"use client";

import dynamic from "next/dynamic";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandLoading,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Component,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
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
import { cn } from "@/lib/utils/cn";
import type {
  Coordinates,
  CoverageSummary,
  LocationSearchResult,
  MapEntitiesResponse,
  MapEntity,
  NearbyJobsResponse,
  NormalizedJob,
} from "@/lib/types";

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

const defaultCenter: Coordinates = { lat: 12.948, lng: 77.642 };

const defaultFilters: FilterState = {
  sourceProvider: "all",
  employmentType: "all",
  workMode: "any",
  field: "all",
  radius: 40,
  salaryMin: null,
  freshness: "any",
  query: "",
  startupOnly: false,
  studentRelevantOnly: false,
  startupRoleType: "all",
  showRemoteOnMap: false,
};

const SUPPRESS_WARN = /Investor layer|Startup layer|Event layer|degraded|layer/i;

function hasMapPin(job: NormalizedJob): boolean {
  return typeof job.latitude === "number" && typeof job.longitude === "number";
}

type Hub = { name: string; sub: string; loc: LocationSearchResult };

const QUICK_HUBS: Hub[] = [
  { name: "HSR Layout",        sub: "Sector 1-7 · Silk Board",            loc: { label: "HSR Layout, Bengaluru, Karnataka, India",                                                  lat: 12.9121, lng: 77.6446, city: "Bengaluru", state: "Karnataka", country: "India" } },
  { name: "Koramangala",       sub: "4th-7th Block · Startup Hub",         loc: { label: "Koramangala, Bengaluru, Karnataka, India",                                                 lat: 12.9352, lng: 77.6245, city: "Bengaluru", state: "Karnataka", country: "India" } },
  { name: "Indiranagar",       sub: "100ft Rd · 12th Main · CMH Rd",       loc: { label: "Indiranagar, Bengaluru, Karnataka, India",                                                 lat: 12.9784, lng: 77.6408, city: "Bengaluru", state: "Karnataka", country: "India" } },
  { name: "Bellandur / ORR",   sub: "Ecospace · EGL · RMZ Ecoworld",       loc: { label: "Bellandur, Outer Ring Road, Bengaluru, Karnataka, India",                                  lat: 12.9304, lng: 77.6784, city: "Bengaluru", state: "Karnataka", country: "India" } },
  { name: "Whitefield",        sub: "ITPL · EPIP Zone · Hoodi · Hope Farm", loc: { label: "Whitefield, Bengaluru, Karnataka, India",                                                 lat: 12.9698, lng: 77.75,   city: "Bengaluru", state: "Karnataka", country: "India" } },
  { name: "Manyata Tech Park", sub: "Nagavara · Hebbal · Thanisandra",     loc: { label: "Manyata Embassy Business Park, Bengaluru, Karnataka, India",                               lat: 13.0498, lng: 77.6205, city: "Bengaluru", state: "Karnataka", country: "India" } },
  { name: "Electronic City",   sub: "Phase 1 & 2 · Infosys · Wipro",      loc: { label: "Electronic City, Bengaluru, Karnataka, India",                                              lat: 12.8452, lng: 77.6602, city: "Bengaluru", state: "Karnataka", country: "India" } },
  { name: "BTM Layout",        sub: "1st & 2nd Stage · Madiwala",          loc: { label: "BTM Layout, Bengaluru, Karnataka, India",                                                  lat: 12.9166, lng: 77.6101, city: "Bengaluru", state: "Karnataka", country: "India" } },
  { name: "Sarjapur Road",     sub: "Kasavanahalli · Doddakannelli",       loc: { label: "Sarjapur Road, Bengaluru, Karnataka, India",                                               lat: 12.908,  lng: 77.674,  city: "Bengaluru", state: "Karnataka", country: "India" } },
  { name: "Kothanur / Hennur", sub: "North Bengaluru · 560077",            loc: { label: "Kothanur, Hennur Main Road, Bengaluru, Karnataka 560077, India",                           lat: 13.0612, lng: 77.6521, city: "Bengaluru", state: "Karnataka", country: "India" } },
  { name: "Marathahalli",      sub: "ORR Bridge · Kundalahalli Colony",    loc: { label: "Marathahalli, Bengaluru, Karnataka, India",                                                lat: 12.9569, lng: 77.7011, city: "Bengaluru", state: "Karnataka", country: "India" } },
  { name: "MG Road / CBD",     sub: "Brigade Rd · Church St · Ulsoor",     loc: { label: "MG Road, Bengaluru, Karnataka 560001, India",                                             lat: 12.975,  lng: 77.608,  city: "Bengaluru", state: "Karnataka", country: "India" } },
];

// ─── cmdk-powered location search box ────────────────────────────────────────
interface SearchBoxProps {
  inputValue: string;
  onInputChange: (v: string) => void;
  onSelectLocation: (loc: LocationSearchResult) => void;
  onSubmitSearch: () => void;
  onUseMyLocation: () => void;
  busy: boolean;
}

function LocationSearchBox({
  inputValue,
  onInputChange,
  onSelectLocation,
  onSubmitSearch,
  onUseMyLocation,
  busy,
}: SearchBoxProps) {
  const [open, setOpen]       = useState(false);
  const [preds, setPreds]     = useState<LocationSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const triggerRef            = useRef<HTMLButtonElement>(null);

  // Fetch predictions debounced at 120ms
  useEffect(() => {
    const q = inputValue.trim();
    if (!q) { setPreds([]); setLoading(false); return; }
    let alive = true;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/locations/search?q=${encodeURIComponent(q)}`);
        const d = (await r.json()) as { results: LocationSearchResult[] };
        if (alive) setPreds(d.results ?? []);
      } catch { if (alive) setPreds([]); }
      finally   { if (alive) setLoading(false); }
    }, 120);
    return () => { alive = false; clearTimeout(t); };
  }, [inputValue]);

  const pick = useCallback((loc: LocationSearchResult) => {
    onInputChange(loc.label);
    onSelectLocation(loc);
    setOpen(false);
  }, [onInputChange, onSelectLocation]);

  const showDropdown = open && (loading || preds.length > 0 || inputValue.trim().length >= 2 || !inputValue.trim());

  return (
    <div className="flex items-center gap-1.5 ml-1 sm:ml-3 flex-1 min-w-0 max-w-[200px] xs:max-w-[260px] sm:max-w-lg">
      {/* Popover wraps the input + dropdown */}
      <Popover open={showDropdown} onOpenChange={setOpen}>
        <PopoverTrigger asChild ref={triggerRef}>
          {/* invisible 0-height trigger; the real input is the Command's input */}
          <span className="sr-only" />
        </PopoverTrigger>

        {/* The whole search widget */}
        <div className="relative flex-1 min-w-0">
          <Command
            shouldFilter={false}
            className="relative"
            onKeyDown={e => {
              if (e.key === "Escape") { setOpen(false); e.preventDefault(); }
            }}
          >
            {/* ── Input ── */}
            <div className="relative flex items-center">
              <MapPin aria-hidden className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-blue-600 z-10" />
              <CommandInput
                placeholder="Area, tech park or PIN in Bengaluru…"
                value={inputValue}
                onValueChange={v => { onInputChange(v); if (v.trim()) setOpen(true); }}
                onFocus={() => setOpen(true)}
                onKeyDown={e => {
                  if (e.key === "Enter" && preds.length === 0) {
                    setOpen(false);
                    onSubmitSearch();
                  }
                }}
                className={cn(
                  /* Tailwind can't override color in dark mode if parent is text-white, so we force both */
                  "h-8 w-full rounded-lg border border-zinc-200 pl-8 pr-6 text-xs font-medium",
                  "bg-white shadow-xs outline-none transition-all duration-150",
                  "placeholder:text-zinc-400 placeholder:font-normal",
                  "focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20",
                  /* Force text colour so it's always visible regardless of parent (nav has text-white on dark page) */
                  "[color:#111827!important] [background-color:#f9fafb!important]",
                  "focus:[background-color:#ffffff!important]",
                )}
              />
              {/* clear button */}
              {inputValue && !loading && (
                <button
                  type="button"
                  className="absolute right-2 flex items-center text-zinc-400 hover:text-zinc-700 transition-colors"
                  onMouseDown={e => { e.preventDefault(); onInputChange(""); setPreds([]); }}
                  title="Clear"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M6 4.586L1.707.293.293 1.707 4.586 6 .293 10.293l1.414 1.414L6 7.414l4.293 4.293 1.414-1.414L7.414 6l4.293-4.293L10.293.293z"/>
                  </svg>
                </button>
              )}
              {loading && (
                <div className="absolute right-2 flex items-center">
                  <svg className="animate-spin h-3.5 w-3.5 text-blue-500" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                </div>
              )}
            </div>

            {/* ── Dropdown ── */}
            {showDropdown && (
              <div
                className="absolute top-full left-0 z-[9999] mt-1.5 w-[320px] xs:w-[380px] sm:w-[460px] rounded-xl border border-zinc-200/90 bg-white shadow-2xl overflow-hidden"
                style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)" }}
              >
                <CommandList className="max-h-[420px] overflow-y-auto overscroll-contain">
                  {loading && (
                    <CommandLoading>
                      <div className="flex items-center gap-2.5 px-4 py-3 text-xs text-zinc-500">
                        <svg className="animate-spin h-3.5 w-3.5 text-blue-500 shrink-0" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                        Searching Bengaluru neighborhoods…
                      </div>
                    </CommandLoading>
                  )}

                  {/* Live prediction results */}
                  {preds.length > 0 && (
                    <CommandGroup heading={
                      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                        <Search className="h-2.5 w-2.5" />
                        Predictions
                      </span>
                    }>
                      {preds.map((p, i) => {
                        const parts     = p.label.split(",");
                        const primary   = parts[0]?.trim() ?? p.label;
                        const secondary = parts.slice(1).join(",").trim();
                        return (
                          <CommandItem
                            key={`${p.lat}-${p.lng}-${i}`}
                            value={`pred-${i}-${primary}`}
                            onSelect={() => pick(p)}
                            className="flex items-start gap-2.5 px-3 py-2 cursor-pointer aria-selected:bg-blue-50/80 aria-selected:text-blue-900"
                          >
                            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 aria-selected:bg-blue-600">
                              <MapPin className="h-3.5 w-3.5 text-blue-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-zinc-900 truncate">{primary}</div>
                              {secondary && <div className="text-[11px] text-zinc-500 truncate mt-0.5">{secondary}</div>}
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  )}

                  {/* No-results hint */}
                  {!loading && preds.length === 0 && inputValue.trim().length >= 2 && (
                    <CommandEmpty className="px-4 py-3 text-xs text-zinc-500">
                      No match for <span className="font-bold text-zinc-800">“{inputValue.trim()}”</span> — press Search or pick a hub below.
                    </CommandEmpty>
                  )}

                  {/* Divider */}
                  <CommandSeparator className="bg-zinc-100" />

                  {/* Popular Hubs */}
                  <CommandGroup heading={
                    <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                      <Sparkles className="h-2.5 w-2.5 text-amber-500" />
                      Popular Tech Hubs
                    </span>
                  }>
                    <div className="grid grid-cols-2 gap-1.5 px-2 py-1.5">
                      {QUICK_HUBS.map(hub => (
                        <CommandItem
                          key={hub.name}
                          value={`hub-${hub.name}`}
                          onSelect={() => pick(hub.loc)}
                          className="flex flex-col items-start gap-0.5 rounded-lg border border-zinc-200/80 bg-zinc-50 px-2.5 py-1.5 cursor-pointer aria-selected:bg-blue-50/90 aria-selected:border-blue-200 hover:bg-blue-50/80 hover:border-blue-200 transition-colors"
                        >
                          <div className="flex items-center gap-1.5 w-full">
                            <Building2 className="h-3 w-3 text-zinc-400 shrink-0" />
                            <span className="text-[11px] font-bold text-zinc-800 truncate">{hub.name}</span>
                          </div>
                          <span className="text-[10px] text-zinc-400 pl-4.5 truncate block w-full">{hub.sub}</span>
                        </CommandItem>
                      ))}
                    </div>
                  </CommandGroup>
                </CommandList>
              </div>
            )}
          </Command>
        </div>
      </Popover>

      {/* Search button */}
      <button
        type="button"
        onClick={() => { setOpen(false); onSubmitSearch(); }}
        disabled={busy}
        className="h-8 flex items-center gap-1.5 px-2.5 text-xs font-semibold bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 active:scale-95 transition-all disabled:opacity-60 shrink-0 shadow-xs"
        title="Search this area"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{busy ? "Searching…" : "Search"}</span>
      </button>

      {/* My Location button */}
      <button
        type="button"
        onClick={() => { setOpen(false); onUseMyLocation(); }}
        disabled={busy}
        className="h-8 flex items-center gap-1.5 px-2 text-xs font-medium bg-white text-zinc-700 border border-zinc-200 rounded-lg hover:bg-zinc-50 hover:text-zinc-950 active:scale-95 transition-all disabled:opacity-60 shrink-0 shadow-xs"
        title="Use GPS location"
      >
        <LocateFixed className="h-3.5 w-3.5 text-blue-600" />
        <span className="hidden md:inline">My location</span>
      </button>
    </div>
  );
}


// ─── Main NearHireApp ─────────────────────────────────────────────────────────
export function NearHireApp() {
  const [locationInput, setLocationInput] = useState("Bengaluru, Karnataka");
  const [location, setLocation]           = useState<LocationSearchResult | null>(null);
  const [filters, setFilters]             = useState<FilterState>(defaultFilters);
  const [jobs, setJobs]                   = useState<NormalizedJob[]>([]);
  const [rawMapJobs, setRawMapJobs]       = useState<NormalizedJob[]>([]);
  const [mapEntities, setMapEntities]     = useState<MapEntity[]>([]);
  const [total, setTotal]                 = useState(0);
  const [coverage, setCoverage]           = useState<CoverageSummary | null>(null);
  const [warnings, setWarnings]           = useState<string[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [status, setStatus]               = useState<"loading" | "locating" | "ready" | "error">("loading");
  const [error, setError]                 = useState<string | null>(null);
  const [mapCollapsed, setMapCollapsed]   = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768;
  });
  const [mounted, setMounted]             = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const lastEntityKey = useRef<string>("");
  const skipFirst     = useRef(true);
  const center        = location ? { lat: location.lat, lng: location.lng } : defaultCenter;
  const isBusy        = status === "loading" || status === "locating";

  // Cap at 200 pins — prevents 1,000 DOM button nodes thrashing the browser
  const displayJobs = useMemo(
    () => rawMapJobs
      .filter(job => hasMapPin(job) && (job.workMode !== "remote" || filters.showRemoteOnMap) && job.locationConfidence === "exact_office")
      .slice(0, 200),
    [rawMapJobs, filters.showRemoteOnMap],
  );

  const displayEntities = useMemo(
    () => mapEntities.filter(e => typeof e.latitude === "number" && typeof e.longitude === "number" && (e.locationConfidence === "exact_office" || e.type === "radar")),
    [mapEntities],
  );

  const fetchEntities = useCallback(async () => {
    const key = "bengaluru-all-entities";
    if (key === lastEntityKey.current) return;
    lastEntityKey.current = key;
    try {
      const p = new URLSearchParams({ lat: "12.9480", lng: "77.6420", radius: "50", layers: "startup,investor,radar", limit: "250" });
      const res = await fetch(`/api/map/entities?${p}`);
      if (!res.ok) return;
      const data = (await res.json()) as MapEntitiesResponse;
      setMapEntities(data.entities ?? []);
    } catch { /* non-fatal */ }
  }, []);

  const fetchJobs = useCallback(async (coords: Coordinates, nextFilters: FilterState) => {
    setStatus("loading"); setError(null);
    const params = new URLSearchParams({
      lat: String(coords.lat), lng: String(coords.lng), radius: String(nextFilters.radius),
      source_provider: nextFilters.sourceProvider, employment_type: nextFilters.employmentType,
      work_mode: nextFilters.workMode, field: nextFilters.field, freshness: nextFilters.freshness,
      query: nextFilters.query, startup_only: String(nextFilters.startupOnly),
      student_relevant: String(nextFilters.studentRelevantOnly), startup_role_type: nextFilters.startupRoleType,
      show_remote_on_map: String(nextFilters.showRemoteOnMap), page: "1", limit: "50",
    });
    if (nextFilters.salaryMin) params.set("salary_min", String(nextFilters.salaryMin));
    try {
      const res  = await fetch(`/api/jobs/nearby?${params}`);
      if (!res.ok) throw new Error("Unable to load opportunities right now.");
      const data = (await res.json()) as NearbyJobsResponse;
      setJobs(data.jobs); setRawMapJobs(data.mapJobs); setTotal(data.total);
      setCoverage(data.coverage);
      setWarnings((data.warnings ?? []).filter(w => !SUPPRESS_WARN.test(w)));
      setSelectedJobId(data.jobs.find(hasMapPin)?.id ?? data.mapJobs[0]?.id ?? data.jobs[0]?.id ?? null);
      setStatus("ready");
      void fetchEntities();
    } catch (err) {
      setJobs([]); setRawMapJobs([]); setTotal(0); setCoverage(null);
      setError(err instanceof Error ? err.message : "Unable to load opportunities.");
      setStatus("error");
    }
  }, [fetchEntities]);

  useEffect(() => { fetchJobs(defaultCenter, defaultFilters); void fetchEntities(); }, []); // eslint-disable-line

  useEffect(() => {
    if (skipFirst.current) { skipFirst.current = false; return; }
    const handle = window.setTimeout(() => fetchJobs(center, filters), 600);
    return () => window.clearTimeout(handle);
  }, [filters, location]); // eslint-disable-line

  useEffect(() => {
    if (!selectedJobId) return;
    document.getElementById(`job-card-${cssSafeId(selectedJobId)}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedJobId]);

  const jumpToLocation = useCallback((loc: LocationSearchResult) => {
    setLocation(loc);
    setLocationInput(loc.label);
    lastEntityKey.current = "";
  }, []);

  async function searchLocation() {
    const q = locationInput.trim();
    if (!q) { setError("Enter a city, area or PIN code."); return; }
    setStatus("locating"); setError(null);
    try {
      const res  = await fetch(`/api/locations/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error("Could not find that location.");
      const data = (await res.json()) as { results: LocationSearchResult[] };
      const first = data.results[0];
      if (!first) throw new Error("No results found. Try a different area or PIN code.");
      jumpToLocation(first);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not find that location.");
      setStatus("error");
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) { setError("Geolocation not supported."); return; }
    setStatus("locating"); setError(null);
    navigator.geolocation.getCurrentPosition(
      pos => { jumpToLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: "My location" }); },
      ()  => { setError("Location permission was not granted."); setStatus("error"); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const selectedJob   = useMemo(() => jobs.find(j => j.id === selectedJobId) ?? rawMapJobs.find(j => j.id === selectedJobId) ?? null, [jobs, rawMapJobs, selectedJobId]);
  const locationLabel = location?.label ?? "Bengaluru, Karnataka";

  if (!mounted) {
    return (
      <main className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-1 flex-col overflow-hidden bg-[#F7F8FB] text-zinc-900">
        <div className="flex flex-1 items-center justify-center bg-white">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#111827] border-t-transparent" />
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-1 flex-col overflow-hidden bg-[#F7F8FB] text-zinc-900">

      {/* Portal: inject search into nav slot */}
      {mounted && typeof document !== "undefined" && (() => {
        const slot = document.getElementById("nav-search-slot");
        if (!slot) return null;
        return createPortal(
          <LocationSearchBox
            inputValue={locationInput}
            onInputChange={setLocationInput}
            onSelectLocation={jumpToLocation}
            onSubmitSearch={searchLocation}
            onUseMyLocation={useMyLocation}
            busy={isBusy}
          />,
          slot,
        );
      })()}

      {/* Error banner */}
      {error && (
        <div className="shrink-0 flex items-center gap-2 border-b border-red-200 bg-red-50/90 px-3 sm:px-4 py-1.5 text-xs font-medium text-red-700">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}

      <div className="relative flex flex-col lg:flex-row min-h-0 flex-1 h-full overflow-hidden bg-white">
        {/* Left: jobs panel */}
        <section className={cn(
          "order-2 lg:order-1 flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-white transition-[width,flex] duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]",
          mapCollapsed ? "flex-1 w-full" : "w-full lg:w-[480px] lg:shrink-0 lg:flex-none",
        )}>
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
          </div>

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
          </div>

          {/* Cards */}
          <div className="relative min-h-0 flex-1 h-full overflow-hidden bg-white">
            <div className={cn("absolute inset-0 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]", mapCollapsed ? "opacity-100 pointer-events-auto z-10 translate-y-0" : "opacity-0 pointer-events-none z-0 translate-y-3")}>
              {isBusy ? <LoadingState /> : jobs.length === 0 ? (
                <EmptyState radius={filters.radius} onExpand={() => setFilters({ ...filters, radius: 50 })} onReset={() => setFilters(defaultFilters)} />
              ) : (
                <JobDepthCarousel jobs={jobs} selectedJobId={selectedJobId} onSelectJob={setSelectedJobId} userCoords={center} userLocationLabel={locationLabel} />
              )}
            </div>
            <div className={cn("absolute inset-0 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]", mapCollapsed ? "opacity-0 pointer-events-none z-0 -translate-y-3" : "opacity-100 pointer-events-auto z-10 translate-y-0")}>
              <div className="grid h-full min-h-0 flex-1 lg:overflow-hidden lg:grid-cols-[172px_minmax(0,1fr)]">
                {/* Desktop-only filter sidebar — mobile uses MobileFilterDrawer */}
                <div className="hidden lg:contents">
                  {isBusy ? <FilterSkeleton /> : <FilterPanel filters={filters} onChange={setFilters} />}
                </div>
                <div className="min-h-0 h-full overflow-y-auto">
                  {isBusy ? <LoadingState /> : jobs.length === 0 ? (
                    <EmptyState radius={filters.radius} onExpand={() => setFilters({ ...filters, radius: 50 })} onReset={() => setFilters(defaultFilters)} />
                  ) : (
                    <div className="space-y-3 p-3 sm:p-4">
                      {jobs.map(job => (
                        <JobCard key={job.id} job={job} selected={job.id === selectedJobId} onSelect={j => setSelectedJobId(j.id)} expanded={false} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right: Map */}
        <section className={cn(
          "order-1 lg:order-2 min-h-0 overflow-hidden border-b border-zinc-200/80 lg:border-b-0 lg:border-l transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]",
          mapCollapsed ? "h-0 lg:h-full lg:w-0 lg:flex-none opacity-0 pointer-events-none -translate-y-4 lg:translate-y-0 lg:translate-x-12 border-none" : "h-[45dvh] sm:h-[42dvh] lg:h-full lg:flex-1 opacity-100 translate-y-0 lg:translate-x-0",
        )}>
          <div className="h-full w-full relative min-h-0">
            <MapErrorBoundary>
              <JobMap jobs={displayJobs} entities={displayEntities} center={center} selectedJobId={selectedJobId} onSelectJob={id => setSelectedJobId(id)} loading={isBusy} />
            </MapErrorBoundary>
          </div>
        </section>
      </div>
    </main>
  );
}

class MapErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: unknown) { console.warn("Map rendering issue:", error); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center bg-[#F9FAFB] p-6 text-center text-zinc-500">
          <MapPin className="mb-2 h-8 w-8 text-zinc-400" />
          <p className="text-sm font-medium text-zinc-700">Map view unavailable</p>
          <p className="mt-1 text-xs text-zinc-500">You can still browse and filter all opportunities in the list.</p>
          <Button size="sm" variant="secondary" className="mt-4" onClick={() => this.setState({ hasError: false })}>Retry Map</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
