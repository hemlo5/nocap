"use client";

import dynamic from "next/dynamic";
import {
  Component,
  FormEvent,
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
  ChevronLeft,
  LocateFixed,
  MapPin,
  Search,
  Sparkles,
} from "lucide-react";
import { LocationSearchBox } from "@/components/nav/location-search-box";
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

const defaultCenter: Coordinates = { lat: 12.9480, lng: 77.6420 };

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

const SUPPRESS_WARN =
  /Investor layer|Startup layer|Event layer|degraded|layer/i;

function hasMapPin(job: NormalizedJob): boolean {
  return typeof job.latitude === "number" && typeof job.longitude === "number";
}

export function NearHireApp() {
  const [locationInput, setLocationInput] = useState("Bengaluru, Karnataka");
  const [location, setLocation] = useState<LocationSearchResult | null>(null);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [jobs, setJobs] = useState<NormalizedJob[]>([]);
  const [rawMapJobs, setRawMapJobs] = useState<NormalizedJob[]>([]);
  const [mapEntities, setMapEntities] = useState<MapEntity[]>([]);
  const [total, setTotal] = useState(0);
  const [coverage, setCoverage] = useState<CoverageSummary | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "loading" | "locating" | "ready" | "error"
  >("loading");
  const [error, setError] = useState<string | null>(null);
  const [mapCollapsed, setMapCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const lastEntityKey = useRef<string>("");
  const skipFirst = useRef(true);
  const center = location
    ? { lat: location.lat, lng: location.lng }
    : defaultCenter;
  const isBusy = status === "loading" || status === "locating";

  const displayJobs = useMemo(
    () =>
      rawMapJobs.filter(
        (job) =>
          hasMapPin(job) &&
          (job.workMode !== "remote" || filters.showRemoteOnMap) &&
          job.locationConfidence === "exact_office",
      ),
    [rawMapJobs, filters.showRemoteOnMap],
  );

  const displayEntities = useMemo(
    () =>
      mapEntities.filter(
        (e) =>
          typeof e.latitude === "number" &&
          typeof e.longitude === "number" &&
          (e.locationConfidence === "exact_office" || e.type === "radar"),
      ),
    [mapEntities],
  );

  const fetchEntities = useCallback(async () => {
    const key = "bengaluru-all-entities";
    if (key === lastEntityKey.current) return;
    lastEntityKey.current = key;
    try {
      const p = new URLSearchParams({
        lat: "12.9480",
        lng: "77.6420",
        radius: "50",
        layers: "startup,investor,radar",
        limit: "250",
      });
      const res = await fetch(`/api/map/entities?${p}`);
      if (!res.ok) return;
      const data = (await res.json()) as MapEntitiesResponse;
      setMapEntities(data.entities ?? []);
    } catch {
      /* non-fatal */
    }
  }, []);

  const fetchJobs = useCallback(
    async (coords: Coordinates, nextFilters: FilterState) => {
      setStatus("loading");
      setError(null);
      const params = new URLSearchParams({
        lat: String(coords.lat),
        lng: String(coords.lng),
        radius: String(nextFilters.radius),
        source_provider: nextFilters.sourceProvider,
        employment_type: nextFilters.employmentType,
        work_mode: nextFilters.workMode,
        field: nextFilters.field,
        freshness: nextFilters.freshness,
        query: nextFilters.query,
        startup_only: String(nextFilters.startupOnly),
        student_relevant: String(nextFilters.studentRelevantOnly),
        startup_role_type: nextFilters.startupRoleType,
        show_remote_on_map: String(nextFilters.showRemoteOnMap),
        page: "1",
        limit: "50",
      });
      if (nextFilters.salaryMin)
        params.set("salary_min", String(nextFilters.salaryMin));
      try {
        const res = await fetch(`/api/jobs/nearby?${params}`);
        if (!res.ok) throw new Error("Unable to load opportunities right now.");
        const data = (await res.json()) as NearbyJobsResponse;
        const nextMapJobs = data.mapJobs;
        setJobs(data.jobs);
        setRawMapJobs(nextMapJobs);
        setTotal(data.total);
        setCoverage(data.coverage);
        setWarnings(
          (data.warnings ?? []).filter((w) => !SUPPRESS_WARN.test(w)),
        );
        setSelectedJobId(
          data.jobs.find(hasMapPin)?.id ??
            nextMapJobs[0]?.id ??
            data.jobs[0]?.id ??
            null,
        );
        setStatus("ready");
        void fetchEntities();
      } catch (err) {
        setJobs([]);
        setRawMapJobs([]);
        setTotal(0);
        setCoverage(null);
        setError(
          err instanceof Error ? err.message : "Unable to load opportunities.",
        );
        setStatus("error");
      }
    },
    [fetchEntities],
  );

  useEffect(() => {
    fetchJobs(defaultCenter, defaultFilters);
    void fetchEntities();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    const handle = window.setTimeout(() => fetchJobs(center, filters), 600);
    return () => window.clearTimeout(handle);
  }, [filters, location]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedJobId) return;
    document
      .getElementById(`job-card-${cssSafeId(selectedJobId)}`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedJobId]);

  const selectLocation = useCallback(
    async (selected: LocationSearchResult) => {
      setLocation(selected);
      setLocationInput(selected.label);
      lastEntityKey.current = "";
      await fetchJobs({ lat: selected.lat, lng: selected.lng }, filters);
    },
    [fetchJobs, filters],
  );

  async function searchLocation(queryOverride?: string | FormEvent) {
    if (queryOverride && typeof queryOverride !== "string" && "preventDefault" in queryOverride) {
      queryOverride.preventDefault();
    }
    const q = (typeof queryOverride === "string" ? queryOverride : locationInput).trim();
    if (!q) {
      setError("Enter a city, area or PIN code.");
      return;
    }
    setStatus("locating");
    setError(null);
    try {
      const res = await fetch(
        `/api/locations/search?q=${encodeURIComponent(q)}`,
      );
      if (!res.ok) throw new Error("Could not find that location.");
      const data = (await res.json()) as { results: LocationSearchResult[] };
      const first = data.results[0];
      if (!first)
        throw new Error("No results found. Try a different area or PIN code.");
      await selectLocation(first);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not find that location.",
      );
      setStatus("error");
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation not supported.");
      return;
    }
    setStatus("locating");
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        await selectLocation({ ...coords, label: "My location" });
      },
      () => {
        setError("Location permission was not granted.");
        setStatus("error");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const selectedJob = useMemo(
    () =>
      jobs.find((j: NormalizedJob) => j.id === selectedJobId) ??
      rawMapJobs.find((j: NormalizedJob) => j.id === selectedJobId) ??
      null,
    [jobs, rawMapJobs, selectedJobId],
  );

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
      {mounted && typeof document !== "undefined" && (() => {
        const slot = document.getElementById("nav-search-slot");
        if (!slot) return null;
        return createPortal(
          <LocationSearchBox
            value={locationInput}
            onChange={setLocationInput}
            onSelectLocation={selectLocation}
            onSearchSubmit={searchLocation}
            onUseMyLocation={useMyLocation}
            isBusy={isBusy}
          />,
          slot,
        );
      })()}

      {error && (
        <div className="shrink-0 flex items-center gap-2 border-b border-red-200 bg-red-50/90 px-3 sm:px-4 py-1.5 text-xs font-medium text-red-700">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}

      <div className="relative flex flex-col lg:flex-row min-h-0 flex-1 h-full overflow-hidden bg-white">
        <section
          className={cn(
            "order-2 lg:order-1 flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-white transition-[width,flex] duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]",
            mapCollapsed
              ? "flex-1 w-full"
              : "w-full lg:w-[480px] lg:shrink-0 lg:flex-none",
          )}
        >
          <div className="shrink-0 flex items-center justify-between border-b border-zinc-200/80 bg-white px-3 sm:px-4 py-2">
            <div className="min-w-0 flex-1 pr-2">
              {isBusy ? (
                <div className="animate-pulse flex gap-2 sm:gap-3">
                  <div className="h-3.5 w-24 sm:w-36 rounded bg-[#E5E7EB]" />
                  <div className="h-3.5 w-16 sm:w-20 rounded bg-[#E5E7EB]" />
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-x-1.5 sm:gap-x-2 gap-y-0.5 text-xs text-[#6B7280]">
                  <span className="font-semibold text-[#111827]">
                    {total} opportunities
                  </span>
                  <span className="hidden sm:inline">near {locationLabel}</span>
                  {selectedJob && (
                    <span className="truncate text-blue-600 max-w-[120px] sm:max-w-none">
                      - {selectedJob.companyName}
                    </span>
                  )}
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
                <>
                  <MapPin className="h-3.5 w-3.5 text-blue-600" />
                  <span className="hidden sm:inline">Show map</span>
                  <span className="sm:hidden text-[11px] font-semibold">Map</span>
                </>
              ) : (
                <>
                  <ChevronLeft className="h-3.5 w-3.5 text-zinc-600 hidden sm:inline" />
                  <span className="hidden sm:inline">Hide map</span>
                  <span className="sm:hidden text-[11px] font-semibold">Cards</span>
                </>
              )}
            </button>
          </div>

          {/* Quick tech hubs pill bar */}
          <div className="shrink-0 flex items-center gap-1.5 overflow-x-auto px-3 sm:px-4 py-1.5 bg-[#FAFBFD] border-b border-zinc-100 no-scrollbar">
            <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 mr-0.5">
              <Sparkles className="h-3 w-3 text-amber-500" />
              Hubs
            </span>
            {[
              {
                name: "HSR Layout",
                lat: 12.9121,
                lng: 77.6446,
                label: "HSR Layout, Bengaluru, Karnataka, India",
                city: "Bengaluru",
                state: "Karnataka",
                country: "India",
              },
              {
                name: "Koramangala",
                lat: 12.9352,
                lng: 77.6245,
                label: "Koramangala, Bengaluru, Karnataka, India",
                city: "Bengaluru",
                state: "Karnataka",
                country: "India",
              },
              {
                name: "Indiranagar",
                lat: 12.9784,
                lng: 77.6408,
                label: "Indiranagar, Bengaluru, Karnataka, India",
                city: "Bengaluru",
                state: "Karnataka",
                country: "India",
              },
              {
                name: "Bellandur / ORR",
                lat: 12.9304,
                lng: 77.6784,
                label:
                  "Bellandur, Outer Ring Road, Bengaluru, Karnataka, India",
                city: "Bengaluru",
                state: "Karnataka",
                country: "India",
              },
              {
                name: "Whitefield",
                lat: 12.9698,
                lng: 77.75,
                label: "Whitefield, Bengaluru, Karnataka, India",
                city: "Bengaluru",
                state: "Karnataka",
                country: "India",
              },
              {
                name: "Manyata",
                lat: 13.0498,
                lng: 77.6205,
                label:
                  "Manyata Embassy Business Park, Nagavara, Bengaluru, Karnataka, India",
                city: "Bengaluru",
                state: "Karnataka",
                country: "India",
              },
              {
                name: "Electronic City",
                lat: 12.8452,
                lng: 77.6602,
                label: "Electronic City, Bengaluru, Karnataka, India",
                city: "Bengaluru",
                state: "Karnataka",
                country: "India",
              },
              {
                name: "BTM Layout",
                lat: 12.9166,
                lng: 77.6101,
                label: "BTM Layout, Bengaluru, Karnataka, India",
                city: "Bengaluru",
                state: "Karnataka",
                country: "India",
              },
              {
                name: "Sarjapur Rd",
                lat: 12.908,
                lng: 77.674,
                label: "Sarjapur Road, Bengaluru, Karnataka, India",
                city: "Bengaluru",
                state: "Karnataka",
                country: "India",
              },
              {
                name: "Kothanur",
                lat: 13.0612,
                lng: 77.6521,
                label:
                  "Kothanur, Hennur Main Road, Bengaluru, Karnataka 560077, India",
                city: "Bengaluru",
                state: "Karnataka",
                country: "India",
              },
            ].map((hub) => {
              const active =
                Math.abs(center.lat - hub.lat) < 0.02 &&
                Math.abs(center.lng - hub.lng) < 0.02;
              return (
                <button
                  key={hub.name}
                  type="button"
                  onClick={() => selectLocation(hub)}
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer",
                    active
                      ? "bg-zinc-900 text-white shadow-xs"
                      : "bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:text-zinc-950 hover:bg-zinc-50",
                  )}
                >
                  {hub.name}
                </button>
              );
            })}
          </div>

          <div className="relative min-h-0 flex-1 h-full overflow-hidden bg-white">
            <div
              className={cn(
                "absolute inset-0 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]",
                mapCollapsed
                  ? "opacity-100 pointer-events-auto z-10 translate-y-0"
                  : "opacity-0 pointer-events-none z-0 translate-y-3",
              )}
            >
              {isBusy ? (
                <LoadingState />
              ) : jobs.length === 0 ? (
                <EmptyState
                  radius={filters.radius}
                  onExpand={() => setFilters({ ...filters, radius: 50 })}
                  onReset={() => setFilters(defaultFilters)}
                />
              ) : (
                <JobDepthCarousel
                  jobs={jobs}
                  selectedJobId={selectedJobId}
                  onSelectJob={setSelectedJobId}
                  userCoords={center}
                  userLocationLabel={locationLabel}
                />
              )}
            </div>

            <div
              className={cn(
                "absolute inset-0 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]",
                mapCollapsed
                  ? "opacity-0 pointer-events-none z-0 -translate-y-3"
                  : "opacity-100 pointer-events-auto z-10 translate-y-0",
              )}
            >
              <div className="grid h-full min-h-0 flex-1 lg:overflow-hidden lg:grid-cols-[172px_minmax(0,1fr)]">
                {isBusy ? (
                  <FilterSkeleton />
                ) : (
                  <FilterPanel filters={filters} onChange={setFilters} />
                )}
                <div className="min-h-0 h-full overflow-y-auto">
                  {isBusy ? (
                    <LoadingState />
                  ) : jobs.length === 0 ? (
                    <EmptyState
                      radius={filters.radius}
                      onExpand={() => setFilters({ ...filters, radius: 50 })}
                      onReset={() => setFilters(defaultFilters)}
                    />
                  ) : (
                    <div className="space-y-3 p-3 sm:p-4">
                      {jobs.map((job) => (
                        <JobCard
                          key={job.id}
                          job={job}
                          selected={job.id === selectedJobId}
                          onSelect={(j) => setSelectedJobId(j.id)}
                          expanded={false}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          className={cn(
            "order-1 lg:order-2 min-h-0 overflow-hidden border-b border-zinc-200/80 lg:border-b-0 lg:border-l transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]",
            mapCollapsed
              ? "h-0 lg:h-full lg:w-0 lg:flex-none opacity-0 pointer-events-none -translate-y-4 lg:translate-y-0 lg:translate-x-12 border-none"
              : "h-[34dvh] sm:h-[38dvh] lg:h-full lg:flex-1 opacity-100 translate-y-0 lg:translate-x-0",
          )}
        >
          <div className="h-full w-full relative min-h-0">
            <MapErrorBoundary>
              <JobMap
                jobs={displayJobs}
                entities={displayEntities}
                center={center}
                selectedJobId={selectedJobId}
                onSelectJob={(id) => setSelectedJobId(id)}
                loading={isBusy}
              />
            </MapErrorBoundary>
          </div>
        </section>
      </div>
    </main>
  );
}

class MapErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    console.warn("Map rendering issue:", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center bg-[#F9FAFB] p-6 text-center text-zinc-500">
          <MapPin className="mb-2 h-8 w-8 text-zinc-400" />
          <p className="text-sm font-medium text-zinc-700">Map view unavailable</p>
          <p className="mt-1 text-xs text-zinc-500">
            You can still browse and filter all opportunities in the list.
          </p>
          <Button
            size="sm"
            variant="secondary"
            className="mt-4"
            onClick={() => this.setState({ hasError: false })}
          >
            Retry Map
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}