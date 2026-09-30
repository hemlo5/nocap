"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CircleDot,
  ClipboardList,
  GraduationCap,
  MapPinned,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  LocationSearchResult,
  NearbyJobsResponse,
  SourceProvider,
} from "@/lib/types";

type DebugFilters = {
  locationInput: string;
  locationLabel: string;
  lat: string;
  lng: string;
  radius: string;
  sourceProvider: SourceProvider | "all";
  query: string;
  employmentType: "all" | "internship" | "full_time" | "part_time" | "contract";
  showRemoteOnMap: boolean;
};

const defaultFilters: DebugFilters = {
  locationInput: "560034",
  locationLabel: "HSR Layout / Bengaluru sample",
  lat: "12.9287689",
  lng: "77.6332998",
  radius: "10",
  sourceProvider: "all",
  query: "",
  employmentType: "all",
  showRemoteOnMap: false,
};

export function CoverageDashboard() {
  const [filters, setFilters] = useState<DebugFilters>(defaultFilters);
  const [data, setData] = useState<NearbyJobsResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);

  const metrics = useMemo(() => {
    const pipeline = data?.debug?.pipeline;
    if (!pipeline) {
      return [];
    }

    return [
      {
        label: "Raw jobs fetched",
        value: pipeline.rawJobsFetched,
        icon: <ClipboardList className="h-4 w-4" />,
      },
      {
        label: "Normalized jobs",
        value: pipeline.normalizedJobs,
        icon: <BriefcaseBusiness className="h-4 w-4" />,
      },
      {
        label: "Location matched",
        value: pipeline.locationMatchedJobs,
        icon: <MapPinned className="h-4 w-4" />,
      },
      {
        label: "Unique sorted jobs",
        value: pipeline.sortedResults,
        icon: <BarChart3 className="h-4 w-4" />,
      },
      {
        label: "Dots before filters",
        value: pipeline.possibleMapDotsBeforeSorting,
        icon: <CircleDot className="h-4 w-4" />,
      },
      {
        label: "Internships sorted",
        value: pipeline.internshipsSorted,
        icon: <GraduationCap className="h-4 w-4" />,
      },
      {
        label: "Map job rows",
        value: pipeline.mapJobs,
        icon: <MapPinned className="h-4 w-4" />,
      },
      {
        label: "Dots shown after sort",
        value: pipeline.mapDotsAfterSorting,
        icon: <CircleDot className="h-4 w-4" />,
      },
      {
        label: "Not on map",
        value: data.debug?.mapExclusions.totalNotOnMap ?? 0,
        icon: <AlertTriangle className="h-4 w-4" />,
      },
    ];
  }, [data]);

  const fetchCoverage = useCallback(async (nextFilters: DebugFilters) => {
    const params = new URLSearchParams({
      lat: nextFilters.lat,
      lng: nextFilters.lng,
      radius: nextFilters.radius,
      source_provider: nextFilters.sourceProvider,
      employment_type: nextFilters.employmentType,
      work_mode: "any",
      field: "all",
      freshness: "any",
      query: nextFilters.query,
      show_remote_on_map: String(nextFilters.showRemoteOnMap),
      page: "1",
      limit: "50",
    });

    const response = await fetch(`/api/jobs/nearby?${params.toString()}`);
    if (!response.ok) {
      throw new Error("Coverage data could not be loaded.");
    }
    return (await response.json()) as NearbyJobsResponse;
  }, []);

  const resolveLocation = useCallback(
    async (nextFilters: DebugFilters): Promise<DebugFilters> => {
      const query = nextFilters.locationInput.trim();
      if (!query) {
        return nextFilters;
      }

      const response = await fetch(
        `/api/locations/search?q=${encodeURIComponent(query)}`,
      );
      if (!response.ok) {
        throw new Error("That PIN code or location could not be resolved.");
      }
      const payload = (await response.json()) as {
        results: LocationSearchResult[];
      };
      const first = payload.results[0];
      if (!first) {
        throw new Error("That PIN code or location could not be resolved.");
      }

      return {
        ...nextFilters,
        lat: String(first.lat),
        lng: String(first.lng),
        locationLabel: first.label,
      };
    },
    [],
  );

  async function loadCoverage(nextFilters = filters) {
    setStatus("loading");
    setError(null);

    try {
      const resolvedFilters = await resolveLocation(nextFilters);
      setFilters(resolvedFilters);
      setData(await fetchCoverage(resolvedFilters));
      setStatus("ready");
    } catch (loadError) {
      setData(null);
      setStatus("error");
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Coverage data could not be loaded.",
      );
    }
  }

  useEffect(() => {
    let cancelled = false;

    resolveLocation(defaultFilters)
      .then(async (resolvedFilters) => ({
        resolvedFilters,
        nextData: await fetchCoverage(resolvedFilters),
      }))
      .then(({ resolvedFilters, nextData }) => {
        if (cancelled) {
          return;
        }
        setFilters(resolvedFilters);
        setData(nextData);
        setStatus("ready");
      })
      .catch((loadError: unknown) => {
        if (cancelled) {
          return;
        }
        setData(null);
        setStatus("error");
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Coverage data could not be loaded.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [fetchCoverage, resolveLocation]);

  function submit(event: FormEvent) {
    event.preventDefault();
    loadCoverage(filters);
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-zinc-200/80 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Search Coverage</h1>
            <p className="mt-1 text-sm text-[#6B7280]">
              Live pipeline counts for the same search path used by the app.
            </p>
          </div>
          <Badge tone={status === "error" ? "amber" : "blue"}>
            {status === "loading" ? "Refreshing" : status === "ready" ? "Live" : "Idle"}
          </Badge>
        </div>

        <form
          onSubmit={submit}
          className="mt-5 grid gap-3 md:grid-cols-[minmax(220px,1.4fr)_120px_120px_120px_150px_150px_1fr_auto]"
        >
          <Input
            aria-label="PIN code or location"
            value={filters.locationInput}
            onChange={(event) =>
              setFilters({ ...filters, locationInput: event.target.value })
            }
            placeholder="PIN, city or area"
          />
          <Input
            aria-label="Latitude"
            value={filters.lat}
            onChange={(event) => setFilters({ ...filters, lat: event.target.value })}
            placeholder="Latitude"
          />
          <Input
            aria-label="Longitude"
            value={filters.lng}
            onChange={(event) => setFilters({ ...filters, lng: event.target.value })}
            placeholder="Longitude"
          />
          <Input
            aria-label="Radius"
            value={filters.radius}
            onChange={(event) =>
              setFilters({ ...filters, radius: event.target.value })
            }
            placeholder="km"
          />
          <select
            aria-label="Source"
            value={filters.sourceProvider}
            onChange={(event) =>
              setFilters({
                ...filters,
                sourceProvider: event.target.value as DebugFilters["sourceProvider"],
              })
            }
            className="h-10 rounded-lg border border-zinc-200/80 bg-white px-3 text-sm font-medium outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-950/10"
          >
            <option value="all">All sources</option>
            <option value="yc">YC only</option>
          </select>
          <select
            aria-label="Job type"
            value={filters.employmentType}
            onChange={(event) =>
              setFilters({
                ...filters,
                employmentType: event.target
                  .value as DebugFilters["employmentType"],
              })
            }
            className="h-10 rounded-lg border border-zinc-200/80 bg-white px-3 text-sm font-medium outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-950/10"
          >
            <option value="all">All jobs</option>
            <option value="internship">Internships</option>
            <option value="full_time">Full-time</option>
            <option value="part_time">Part-time</option>
            <option value="contract">Contract</option>
          </select>
          <Input
            aria-label="Keyword"
            value={filters.query}
            onChange={(event) =>
              setFilters({ ...filters, query: event.target.value })
            }
            placeholder="Keyword"
          />
          <Button type="submit" disabled={status === "loading"}>
            <Search className="h-4 w-4" />
            Run
          </Button>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={filters.showRemoteOnMap}
            onClick={() =>
              setFilters({
                ...filters,
                showRemoteOnMap: !filters.showRemoteOnMap,
              })
            }
            className="inline-flex items-center gap-2 rounded-md border border-zinc-200/80 bg-zinc-50 px-3 py-2 text-xs font-semibold text-[#111827]"
          >
            <span
              className={
                filters.showRemoteOnMap
                  ? "h-2.5 w-2.5 rounded-full bg-[#0EA5E9]"
                  : "h-2.5 w-2.5 rounded-full bg-[#9CA3AF]"
              }
            />
            Show remote on map
          </button>
          <span className="text-xs font-medium text-[#6B7280]">
            Resolved: {filters.locationLabel} ({Number(filters.lat).toFixed(4)},{" "}
            {Number(filters.lng).toFixed(4)})
          </span>
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-sm font-medium text-[#991B1B]">
            {error}
          </div>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {status === "loading" && metrics.length === 0
          ? Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-lg border border-zinc-200/80 bg-white p-4 shadow-sm"
              >
                <div className="h-3 w-24 rounded bg-[#E5E7EB]" />
                <div className="mt-4 h-6 w-16 rounded bg-[#E5E7EB]" />
              </div>
            ))
          : metrics.map((metric) => (
              <MetricCard
                key={metric.label}
                label={metric.label}
                value={metric.value}
                icon={metric.icon}
              />
            ))}
      </section>

      {data?.debug && (
        <section className="rounded-lg border border-zinc-200/80 bg-white p-4 shadow-sm">
          <PanelHeader
            icon={<CircleDot className="h-4 w-4" />}
            title="Map Dot Flow"
            subtitle="Shows where mappable company-location dots drop out before the final map"
          />
          <div className="grid gap-3 px-1 pb-1 sm:grid-cols-2 lg:grid-cols-4">
            <FlowStat
              label="Possible map rows before filters"
              value={data.debug.pipeline.possibleMapJobsBeforeSorting}
            />
            <FlowStat
              label="Possible dots before filters"
              value={data.debug.pipeline.possibleMapDotsBeforeSorting}
            />
            <FlowStat
              label="Map rows after filters"
              value={data.debug.pipeline.mapRowsAfterFiltersBeforeLimit}
            />
            <FlowStat
              label="Dots after filters"
              value={data.debug.pipeline.mapDotsAfterFiltersBeforeLimit}
            />
            <FlowStat
              label="Map rows after sorting"
              value={data.debug.pipeline.mapJobsAfterSorting}
            />
            <FlowStat
              label="Dots shown after sorting"
              value={data.debug.pipeline.mapDotsAfterSorting}
            />
            <FlowStat
              label="Dots removed by filters"
              value={data.debug.pipeline.mapDotsRemovedByFilters}
            />
            <FlowStat
              label="Dots removed by map limit"
              value={data.debug.pipeline.mapDotsRemovedByLimit}
            />
          </div>
        </section>
      )}

      {data?.debug && (
        <section className="grid gap-4 xl:grid-cols-2">
          <DotGroupTable
            title="Shown Map Dots"
            subtitle={`${data.debug.mapDotBreakdown.shownGroups.length} displayed groups sampled`}
            groups={data.debug.mapDotBreakdown.shownGroups}
          />
          <DotGroupTable
            title="Dots Removed Before Final Results"
            subtitle="Sample of mappable dots that did not survive search filters"
            groups={data.debug.mapDotBreakdown.filteredOutGroups}
            showReason
          />
        </section>
      )}

      {data?.debug && (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="rounded-lg border border-zinc-200/80 bg-white shadow-sm">
            <PanelHeader
              icon={<MapPinned className="h-4 w-4" />}
              title="Map Exclusions"
              subtitle={`${data.debug.mapExclusions.totalNotOnMap} sorted jobs are not map rows`}
            />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-y border-zinc-200/80 bg-zinc-50 text-xs uppercase text-[#6B7280]">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Reason</th>
                    <th className="px-4 py-2 text-right font-semibold">Jobs</th>
                  </tr>
                </thead>
                <tbody>
                  {data.debug.mapExclusions.byReason.map((item) => (
                    <tr key={item.reason} className="border-b border-[#F3F4F6]">
                      <td className="px-4 py-3 text-[#111827]">{item.reason}</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {item.count.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200/80 bg-white shadow-sm">
            <PanelHeader
              icon={<Building2 className="h-4 w-4" />}
              title="Source Health"
              subtitle={`${data.sources.successful}/${data.sources.total} sources succeeded`}
            />
            <div className="max-h-[360px] overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 border-y border-zinc-200/80 bg-zinc-50 text-xs uppercase text-[#6B7280]">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Source</th>
                    <th className="px-4 py-2 font-semibold">Type</th>
                    <th className="px-4 py-2 text-right font-semibold">Fetched</th>
                    <th className="px-4 py-2 text-right font-semibold">Accepted</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sources.details.map((source) => (
                    <tr
                      key={`${source.provider}:${source.source}`}
                      className="border-b border-[#F3F4F6]"
                    >
                      <td className="px-4 py-3 font-medium text-[#111827]">
                        {source.source}
                      </td>
                      <td className="px-4 py-3 text-[#6B7280]">
                        {source.sourceType ?? "ats"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {source.jobsFetched.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {source.jobsAccepted.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {data?.debug && (
        <section className="rounded-lg border border-zinc-200/80 bg-white shadow-sm">
          <PanelHeader
            icon={<AlertTriangle className="h-4 w-4" />}
            title="Excluded Sorted Jobs"
            subtitle="Sample rows from the sorted result set that did not become map rows"
          />
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="sticky top-0 border-y border-zinc-200/80 bg-zinc-50 text-xs uppercase text-[#6B7280]">
                <tr>
                  <th className="px-4 py-2 font-semibold">Job</th>
                  <th className="px-4 py-2 font-semibold">Company</th>
                  <th className="px-4 py-2 font-semibold">Source</th>
                  <th className="px-4 py-2 font-semibold">Mode</th>
                  <th className="px-4 py-2 font-semibold">Location</th>
                  <th className="px-4 py-2 font-semibold">Reason</th>
                </tr>
              </thead>
              <tbody>
                {data.debug.mapExclusions.examples.map((job) => (
                  <tr key={job.id} className="border-b border-[#F3F4F6]">
                    <td className="px-4 py-3 font-medium text-[#111827]">
                      {job.title}
                    </td>
                    <td className="px-4 py-3">{job.companyName}</td>
                    <td className="px-4 py-3 text-[#6B7280]">
                      {job.source}:{job.sourceKey}
                    </td>
                    <td className="px-4 py-3">{job.workMode}</td>
                    <td className="px-4 py-3 text-[#6B7280]">
                      {job.locationText}
                    </td>
                    <td className="px-4 py-3">{job.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-200/80 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3 text-[#6B7280]">
        <span className="text-xs font-semibold uppercase">{label}</span>
        <span className="text-[#18181B]">{icon}</span>
      </div>
      <div className="mt-3 text-2xl font-semibold text-[#111827]">
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function FlowStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-zinc-200/80 bg-zinc-50 px-3 py-3">
      <div className="text-xs font-semibold uppercase text-[#6B7280]">
        {label}
      </div>
      <div className="mt-2 text-xl font-semibold text-[#111827]">
        {value.toLocaleString()}
      </div>
    </div>
  );
}

type DotGroup = NonNullable<
  NearbyJobsResponse["debug"]
>["mapDotBreakdown"]["shownGroups"][number] & {
  reason?: string;
};

function DotGroupTable({
  title,
  subtitle,
  groups,
  showReason = false,
}: {
  title: string;
  subtitle: string;
  groups: DotGroup[];
  showReason?: boolean;
}) {
  return (
    <div className="rounded-lg border border-zinc-200/80 bg-white shadow-sm">
      <PanelHeader
        icon={<CircleDot className="h-4 w-4" />}
        title={title}
        subtitle={subtitle}
      />
      <div className="max-h-[360px] overflow-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="sticky top-0 border-y border-zinc-200/80 bg-zinc-50 text-xs uppercase text-[#6B7280]">
            <tr>
              <th className="px-4 py-2 font-semibold">Company</th>
              <th className="px-4 py-2 text-right font-semibold">Jobs</th>
              <th className="px-4 py-2 font-semibold">Location</th>
              {showReason && (
                <th className="px-4 py-2 font-semibold">Why removed</th>
              )}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr
                key={`${group.companyName}:${group.latitude}:${group.longitude}:${group.reason ?? ""}`}
                className="border-b border-[#F3F4F6]"
              >
                <td className="px-4 py-3 font-medium text-[#111827]">
                  {group.companyName}
                </td>
                <td className="px-4 py-3 text-right font-semibold">
                  {group.jobs.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-[#6B7280]">
                  {group.locationText}
                </td>
                {showReason && (
                  <td className="px-4 py-3 text-[#92400E]">{group.reason}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PanelHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3 p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-100 text-[#18181B]">
        {icon}
      </div>
      <div>
        <h2 className="font-semibold text-[#111827]">{title}</h2>
        <p className="mt-1 text-xs text-[#6B7280]">{subtitle}</p>
      </div>
    </div>
  );
}
