import { getEnabledSources, getSourceById } from "@/lib/sources";
import { getSourceConfigs } from "@/lib/sources/default-sources";
import type {
  CompanySummary,
  Coordinates,
  CoverageSummary,
  JobSource,
  NearbyJobsQuery,
  NearbyJobsResponse,
  NormalizedJob,
  SearchDebugSummary,
  SourceHealth,
  SourceHealthSummary,
} from "@/lib/types";
import {
  classifyStartupRoleType,
  classifyStudentRelevant,
} from "@/lib/classifiers";
import { attachBestCoordinates } from "@/lib/services/geocoding";
import { dedupeJobs } from "@/lib/services/dedupe";
import {
  passesFreshness,
  relevanceScore,
  scoreJob,
} from "@/lib/services/ranking";
import { normalizeKey, splitJobId } from "@/lib/utils/strings";

const DEFAULT_SOURCE_CACHE_TTL_MS = 1000 * 60 * 15; // 15 minutes
const DEFAULT_MAX_MAP_JOBS = 1000;

type SourceCacheEntry = {
  expiresAt: number;
  jobs: unknown[];
};

const sourceJobsCache = new Map<string, SourceCacheEntry>();

type LiveResultCache = {
  expiresAt: number;
  jobs: NormalizedJob[];
  warnings: string[];
  sources: SourceHealthSummary;
};

let cachedLiveResult: LiveResultCache | null = null;



export async function getNearbyJobs(
  query: NearbyJobsQuery,
): Promise<NearbyJobsResponse> {
  const live = await getNearbyJobsFromLiveSources(query);

  const ranked = applyFilters(live.jobs, query)
    .map((job) => ({ ...job, score: scoreJob(job, query) }))
    .sort((a, b) => {
      if (query.workMode !== "remote" && hasMapPin(a) !== hasMapPin(b)) {
        return hasMapPin(a) ? -1 : 1;
      }
      if ((b.score ?? 0) !== (a.score ?? 0)) {
        return (b.score ?? 0) - (a.score ?? 0);
      }
      return (
        (a.distanceKm ?? Number.POSITIVE_INFINITY) -
        (b.distanceKm ?? Number.POSITIVE_INFINITY)
      );
    });

  const filtered =
    query.workMode === "remote" ? ranked : interleaveMapPinGroups(ranked);

  // Map jobs: Show all jobs with proper office coordinates across Bengaluru
  // (applying user's keyword, role, and source filters, but NOT restricted by local radius)
  const bengaluruMappable = live.jobs.filter((job) => {
    if (
      !hasMapPin(job) ||
      (job.workMode === "remote" && !query.showRemoteOnMap) ||
      job.locationConfidence !== "exact_office"
    )
      return false;
    if (
      query.sourceProvider &&
      query.sourceProvider !== "all" &&
      job.source !== query.sourceProvider
    )
      return false;
    if (
      query.employmentType &&
      query.employmentType !== "all" &&
      job.employmentType !== query.employmentType
    )
      return false;
    if (
      query.workMode &&
      query.workMode !== "any" &&
      job.workMode !== query.workMode
    )
      return false;
    if (query.field && query.field !== "all" && job.field !== query.field)
      return false;
    if (
      query.salaryMin &&
      (!job.salary.min || job.salary.min < query.salaryMin)
    )
      return false;
    if (!passesFreshness(job, query.freshness)) return false;
    if (query.query?.trim() && relevanceScore(job, query.query) <= 0)
      return false;
    if (query.startupOnly && !job.startup?.isStartup) return false;
    if (query.studentRelevantOnly && !job.studentRelevant) return false;
    if (
      query.startupRoleType &&
      query.startupRoleType !== "all" &&
      job.startupRoleType !== query.startupRoleType
    )
      return false;
    const isBlrCoord =
      typeof job.latitude === "number" &&
      typeof job.longitude === "number" &&
      job.latitude >= 12.6 &&
      job.latitude <= 13.4 &&
      job.longitude >= 77.2 &&
      job.longitude <= 77.9;

    // Reject jobs whose locationText is explicitly outside India (US, UK, EU, etc.).
    // verifiedOfficeOverride stamps BLR coords on sourceKey-matched jobs even when
    // the job is for a non-India office — we must filter those out here.
    const locLower = (job.locationText ?? "").toLowerCase();
    const isExplicitlyNonIndia =
      /\b(united states|usa|new york|san francisco|london|uk|europe|canada|australia|singapore|dubai|uae|germany|france|netherlands)\b/.test(
        locLower,
      ) && !/\b(india|bengaluru|bangalore)\b/.test(locLower);

    if (isExplicitlyNonIndia) return false;

    return isBlrCoord || isBengaluruRelevantJob(job);
  });

  const mapJobs = buildMapJobs(bengaluruMappable, query);
  const start = (query.page - 1) * query.limit;
  const paged = filtered.slice(start, start + query.limit);

  return {
    jobs: paged,
    mapJobs,
    total: filtered.length,
    page: query.page,
    limit: query.limit,
    radiusKm: query.radius,
    center: { lat: query.lat, lng: query.lng },
    warnings: live.warnings,
    sources: live.sources,
    coverage: buildCoverageSummary(live.jobs, filtered, mapJobs, live.sources),
    debug: process.env.NODE_ENV !== "production" ? buildSearchDebugSummary({
      rawJobs: live.jobs,
      filteredJobs: filtered,
      pagedJobs: paged,
      mapJobs,
      sources: live.sources,
      query,
    }) : undefined,
  };
}

export async function getJobById(id: string): Promise<NormalizedJob | null> {
  const parts = splitJobId(decodeURIComponent(id));
  if (!parts) {
    return null;
  }

  const source = getSourceById(parts.provider, parts.sourceKey);
  if (!source) {
    return null;
  }

  try {
    const rawJobs = await source.fetchJobs({ includeContent: true });
    for (const raw of rawJobs) {
      const job = source.normalize(raw);
      const enriched = job ? enrichJob(job, source) : null;
      if (enriched?.externalId === parts.externalId && isUsableJob(enriched)) {
        return enriched;
      }
    }
  } catch (error) {
    console.warn(
      `${source.source.displayName ?? source.source.key} detail lookup failed: ${getErrorMessage(error)}`,
    );
  }

  return null;
}

export async function getCompanies(): Promise<CompanySummary[]> {
  const byId = new Map<string, CompanySummary>();

  for (const source of getSourceConfigs()) {
    if (!source.enabled) {
      continue;
    }

    const id = `${source.provider}:${source.key}`;
    byId.set(id, {
      id,
      name: source.displayName ?? source.key,
      website: source.website ?? null,
      verificationStatus: "VERIFIED",
    });
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

async function getNearbyJobsFromLiveSources(query: NearbyJobsQuery): Promise<{
  jobs: NormalizedJob[];
  warnings: string[];
  sources: SourceHealthSummary;
}> {
  if (cachedLiveResult && cachedLiveResult.expiresAt > Date.now()) {
    return {
      jobs: cachedLiveResult.jobs,
      warnings: cachedLiveResult.warnings,
      sources: cachedLiveResult.sources,
    };
  }

  const warnings: string[] = [];
  const sources = getEnabledSources(query);

  // Fetch sources in batches of 10 to avoid connection saturation
  const BATCH_SIZE = 35;
  const allSettled: PromiseSettledResult<{
    jobs: NormalizedJob[];
    health: SourceHealth;
  }>[] = [];

  for (let i = 0; i < sources.length; i += BATCH_SIZE) {
    const batch = sources.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map(async (source) => {
        const startedAt = performance.now();
        const fetched = await fetchSourceJobs(source, false, query);
        const rawJobs = fetched.jobs;
        const jobs = rawJobs
          .map((raw) => source.normalize(raw))
          .map((job) => (job ? enrichJob(job, source) : null))
          .filter((job): job is NormalizedJob => Boolean(job))
          .filter(isUsableJob);
        return {
          jobs,
          health: {
            source: source.source.displayName ?? source.source.key,
            provider: source.provider,
            sourceType: source.source.type,
            status: "success" as const,
            jobsFetched: rawJobs.length,
            jobsAccepted: jobs.length,
            durationMs: Math.round(performance.now() - startedAt),
            cached: fetched.cached,
          },
        };
      }),
    );
    allSettled.push(...batchResults);
  }

  const health: SourceHealth[] = [];
  let failedCount = 0;
  const jobs = allSettled.flatMap((result, index) => {
    if (result.status === "fulfilled") {
      health.push(result.value.health);
      return result.value.jobs;
    }

    const source = sources[index];
    const error = getErrorMessage(result.reason);
    health.push({
      source:
        source?.source.displayName ?? source?.source.key ?? "Unknown source",
      provider: source?.provider ?? "unknown",
      sourceType: source?.source.type,
      status: "failed",
      jobsFetched: 0,
      jobsAccepted: 0,
      durationMs: 0,
      cached: false,
      error,
    });
    failedCount++;
    return [];
  });

  // Single consolidated warning instead of one per company
  if (failedCount > 0) {
    warnings.push(
      `${failedCount} job source${failedCount > 1 ? "s" : ""} temporarily unavailable — showing results from available sources.`,
    );
  }

  const geocoded = await attachBestCoordinates(jobs, {
    lat: query.lat,
    lng: query.lng,
  });
  const deduped = dedupeJobs(geocoded);

  const sourceSummary = summarizeSourceHealth(health, {
    rawJobs: jobs.length,
    geocodedJobs: geocoded.length,
    dedupedJobs: deduped.length,
  });
  logSourceHealth(sourceSummary, health);

  cachedLiveResult = {
    expiresAt: Date.now() + DEFAULT_SOURCE_CACHE_TTL_MS,
    jobs: deduped,
    warnings,
    sources: sourceSummary,
  };

  return {
    jobs: deduped,
    warnings,
    sources: sourceSummary,
  };
}

async function fetchSourceJobs(
  source: ReturnType<typeof getEnabledSources>[number],
  includeContent: boolean,
  query?: NearbyJobsQuery,
): Promise<{ jobs: unknown[]; cached: boolean }> {
  const cacheKey = sourceCacheKey(source, includeContent, query);
  const cached = sourceJobsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { jobs: cached.jobs, cached: true };
  }

  const jobs = await source.fetchJobs({
    includeContent,
    location: query
      ? {
          city: "Bengaluru",
          latitude: query.lat,
          longitude: query.lng,
        }
      : undefined,
    searchRadiusKm: query?.radius,
    includeRemote: query?.workMode === "remote" || query?.workMode === "any" || query?.showRemoteOnMap,
    jobTypes:
      query?.employmentType && query.employmentType !== "all"
        ? [query.employmentType]
        : undefined,
    query: query?.query,
    maxResults: 300,
  });
  sourceJobsCache.set(cacheKey, {
    jobs,
    expiresAt: Date.now() + sourceCacheTtlMs(),
  });

  return { jobs, cached: false };
}

function sourceCacheKey(
  source: ReturnType<typeof getEnabledSources>[number],
  includeContent: boolean,
  _query?: NearbyJobsQuery,
): string {
  return `${source.provider}:${source.source.key}:${includeContent ? "content" : "raw"}`;
}

function sourceCacheTtlMs(): number {
  const parsed = Number.parseInt(
    process.env.NEARHIRE_SOURCE_CACHE_TTL_MS ?? "",
    10,
  );
  return Number.isFinite(parsed) && parsed >= 0
    ? parsed
    : DEFAULT_SOURCE_CACHE_TTL_MS;
}

function isUsableJob(job: NormalizedJob): boolean {
  if (!job.title || !job.companyName || !job.applyUrl) {
    return false;
  }

  if (!/^https?:\/\//i.test(job.applyUrl)) {
    return false;
  }

  if (job.expiresAt && new Date(job.expiresAt).getTime() <= Date.now()) {
    return false;
  }

  if (job.verificationStatus === "EXPIRED" || !job.isVerified) {
    return false;
  }

  const normalizedLocation = normalizeKey(job.locationText);
  if (
    !normalizedLocation ||
    normalizedLocation === "location not listed" ||
    normalizedLocation === "not listed"
  ) {
    return false;
  }

  return true;
}

function applyFilters(
  jobs: NormalizedJob[],
  query: NearbyJobsQuery,
): NormalizedJob[] {
  return jobs.filter((job) => {
    if (job.workMode === "remote" && !remoteJobMatchesQueryRegion(job, query)) {
      return false;
    }
    if (
      query.sourceProvider &&
      query.sourceProvider !== "all" &&
      job.source !== query.sourceProvider
    ) {
      return false;
    }
    if (
      job.workMode !== "remote" &&
      (job.distanceKm ?? Infinity) > query.radius
    ) {
      return false;
    }
    if (
      query.employmentType &&
      query.employmentType !== "all" &&
      job.employmentType !== query.employmentType
    ) {
      return false;
    }
    if (
      query.workMode &&
      query.workMode !== "any" &&
      job.workMode !== query.workMode
    ) {
      return false;
    }
    if (query.field && query.field !== "all" && job.field !== query.field) {
      return false;
    }
    if (
      query.salaryMin &&
      (!job.salary.min || job.salary.min < query.salaryMin)
    ) {
      return false;
    }
    if (!passesFreshness(job, query.freshness)) {
      return false;
    }
    if (query.query?.trim() && relevanceScore(job, query.query) <= 0) {
      return false;
    }
    if (query.startupOnly && !job.startup?.isStartup) {
      return false;
    }
    if (query.studentRelevantOnly && !job.studentRelevant) {
      return false;
    }
    if (
      query.startupRoleType &&
      query.startupRoleType !== "all" &&
      job.startupRoleType !== query.startupRoleType
    ) {
      return false;
    }
    return true;
  });
}

function enrichJob(job: NormalizedJob, source: JobSource): NormalizedJob {
  const text = [
    job.title,
    job.normalizedTitle,
    job.description,
    job.locationText,
    job.field,
    job.skills.join(" "),
  ]
    .filter(Boolean)
    .join(" ");
  const roleText = [
    job.title,
    job.normalizedTitle,
    job.field,
    job.skills.join(" "),
  ]
    .filter(Boolean)
    .join(" ");
  const startup = source.source.startup ?? job.startup;

  return {
    ...job,
    sourceType: job.sourceType ?? source.source.type ?? "ats",
    startup,
    studentRelevant:
      job.studentRelevant ??
      (job.employmentType === "internship" || classifyStudentRelevant(text)),
    startupRoleType: job.startupRoleType ?? classifyStartupRoleType(roleText),
  };
}

function buildCoverageSummary(
  dedupedJobs: NormalizedJob[],
  filteredJobs: NormalizedJob[],
  mapJobs: NormalizedJob[],
  sources: SourceHealthSummary,
): CoverageSummary {
  const sourceTypes = sources.details.map(
    (source) => source.sourceType ?? "ats",
  );
  const uniqueCompanies = new Set(
    dedupedJobs.map((job) => normalizeKey(job.companyName)).filter(Boolean),
  );

  return {
    startupSources: sourceTypes.filter(
      (type) => type === "startup_board" || type === "startup_directory",
    ).length,
    atsSources: sourceTypes.filter((type) => type === "ats").length,
    jobBoardSources: sourceTypes.filter(
      (type) => type === "job_board" || type === "startup_board",
    ).length,
    companiesScanned: uniqueCompanies.size,
    jobsBeforeDedup: sources.rawAccepted,
    jobsAfterDedup: sources.deduped,
    resultsAfterFilters: filteredJobs.length,
    bengaluruJobs: filteredJobs.filter(isBengaluruRelevantJob).length,
    remoteJobs: filteredJobs.filter((job) => job.workMode === "remote").length,
    startupJobs: filteredJobs.filter((job) => job.startup?.isStartup).length,
    startupInternships: filteredJobs.filter(
      (job) => job.startup?.isStartup && job.employmentType === "internship",
    ).length,
    studentRelevantJobs: filteredJobs.filter((job) => job.studentRelevant)
      .length,
    mappableJobs: mapJobs.length,
  };
}

function buildSearchDebugSummary({
  rawJobs,
  filteredJobs,
  pagedJobs,
  mapJobs,
  sources,
  query,
}: {
  rawJobs: NormalizedJob[];
  filteredJobs: NormalizedJob[];
  pagedJobs: NormalizedJob[];
  mapJobs: NormalizedJob[];
  sources: SourceHealthSummary;
  query: NearbyJobsQuery;
}): SearchDebugSummary {
  const mapIds = new Set(mapJobs.map((job) => job.id));
  const possibleMapJobsBeforeSorting = rawJobs
    .map((job) => mapJobWithCoordinates(job, query))
    .filter((job): job is NormalizedJob => Boolean(job));
  const mapRowsAfterFiltersBeforeLimit = filteredJobs
    .map((job) => mapJobWithCoordinates(job, query))
    .filter((job): job is NormalizedJob => Boolean(job));
  const possibleMapGroupsBeforeSorting = groupMapJobs(
    possibleMapJobsBeforeSorting,
  );
  const mapGroupsAfterFiltersBeforeLimit = groupMapJobs(
    mapRowsAfterFiltersBeforeLimit,
  );
  const shownMapGroups = groupMapJobs(mapJobs);
  const afterFilterGroupKeys = new Set(
    mapGroupsAfterFiltersBeforeLimit.map((group) => group.key),
  );
  const notOnMap = filteredJobs
    .filter((job) => !mapIds.has(job.id))
    .map((job) => ({
      job,
      reason: mapExclusionReason(job, query, mapJobs.length),
    }));
  const byReason = new Map<string, number>();

  for (const item of notOnMap) {
    byReason.set(item.reason, (byReason.get(item.reason) ?? 0) + 1);
  }

  return {
    pipeline: {
      sourcesRequested: sources.total,
      sourcesSucceeded: sources.successful,
      sourcesFailed: sources.failed,
      rawJobsFetched: sources.details.reduce(
        (total, source) => total + source.jobsFetched,
        0,
      ),
      normalizedJobs: sources.rawAccepted,
      locationMatchedJobs: sources.locationFiltered,
      uniqueJobs: sources.deduped,
      sortedResults: filteredJobs.length,
      pageJobs: pagedJobs.length,
      possibleMapJobsBeforeSorting: possibleMapJobsBeforeSorting.length,
      possibleMapDotsBeforeSorting: possibleMapGroupsBeforeSorting.length,
      mapRowsAfterFiltersBeforeLimit: mapRowsAfterFiltersBeforeLimit.length,
      mapDotsAfterFiltersBeforeLimit: mapGroupsAfterFiltersBeforeLimit.length,
      mapDotsRemovedByFilters: Math.max(
        0,
        possibleMapGroupsBeforeSorting.length -
          mapGroupsAfterFiltersBeforeLimit.length,
      ),
      mapDotsRemovedByLimit: Math.max(
        0,
        mapGroupsAfterFiltersBeforeLimit.length - shownMapGroups.length,
      ),
      mapJobs: mapJobs.length,
      mapMarkers: shownMapGroups.length,
      mapJobsAfterSorting: mapJobs.length,
      mapDotsAfterSorting: shownMapGroups.length,
      internshipsFound: rawJobs.filter(
        (job) => job.employmentType === "internship",
      ).length,
      internshipsSorted: filteredJobs.filter(
        (job) => job.employmentType === "internship",
      ).length,
      remoteJobsSorted: filteredJobs.filter((job) => job.workMode === "remote")
        .length,
      physicalJobsSorted: filteredJobs.filter(
        (job) => job.workMode !== "remote",
      ).length,
    },
    mapExclusions: {
      totalNotOnMap: notOnMap.length,
      byReason: [...byReason.entries()]
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count),
      examples: notOnMap.slice(0, 80).map(({ job, reason }) => ({
        id: job.id,
        title: job.title,
        companyName: job.companyName,
        source: job.source,
        sourceKey: job.sourceKey,
        workMode: job.workMode,
        employmentType: job.employmentType,
        locationText: job.locationText,
        locationConfidence: job.locationConfidence,
        reason,
      })),
    },
    mapDotBreakdown: {
      shownGroups: shownMapGroups.slice(0, 80).map((group) => ({
        companyName: group.companyName,
        locationText: group.locationText,
        jobs: group.jobs,
        latitude: group.latitude,
        longitude: group.longitude,
      })),
      filteredOutGroups: possibleMapGroupsBeforeSorting
        .filter((group) => !afterFilterGroupKeys.has(group.key))
        .slice(0, 80)
        .map((group) => ({
          companyName: group.companyName,
          locationText: group.locationText,
          jobs: group.jobs,
          latitude: group.latitude,
          longitude: group.longitude,
          reason: filterDropReason(group.items[0], query),
        })),
    },
  };
}

type MapJobGroup = {
  key: string;
  companyName: string;
  locationText: string;
  jobs: number;
  latitude: number;
  longitude: number;
  items: NormalizedJob[];
};

function groupMapJobs(jobs: NormalizedJob[]): MapJobGroup[] {
  const groups = new Map<string, MapJobGroup>();
  for (const job of jobs) {
    if (!hasMapPin(job)) {
      continue;
    }
    const key = [
      normalizeKey(job.companyName),
      job.latitude!.toFixed(5),
      job.longitude!.toFixed(5),
    ].join(":");
    const existing = groups.get(key);
    if (existing) {
      existing.jobs += 1;
      existing.items.push(job);
      continue;
    }
    groups.set(key, {
      key,
      companyName: job.companyName,
      locationText: job.locationText,
      jobs: 1,
      latitude: job.latitude!,
      longitude: job.longitude!,
      items: [job],
    });
  }
  return [...groups.values()].sort((a, b) => b.jobs - a.jobs);
}

function filterDropReason(job: NormalizedJob, query: NearbyJobsQuery): string {
  if (job.workMode === "remote" && !remoteJobMatchesQueryRegion(job, query)) {
    return "Remote job is outside the searched region";
  }
  if (
    query.sourceProvider &&
    query.sourceProvider !== "all" &&
    job.source !== query.sourceProvider
  ) {
    return "Removed by source filter";
  }
  if (
    job.workMode !== "remote" &&
    (job.distanceKm ?? Infinity) > query.radius
  ) {
    return `Outside selected ${query.radius} km radius`;
  }
  if (
    query.employmentType &&
    query.employmentType !== "all" &&
    job.employmentType !== query.employmentType
  ) {
    return "Removed by job type filter";
  }
  if (
    query.workMode &&
    query.workMode !== "any" &&
    job.workMode !== query.workMode
  ) {
    return "Removed by work mode filter";
  }
  if (query.field && query.field !== "all" && job.field !== query.field) {
    return "Removed by field filter";
  }
  if (
    query.salaryMin &&
    (!job.salary.min || job.salary.min < query.salaryMin)
  ) {
    return "Removed by salary filter";
  }
  if (!passesFreshness(job, query.freshness)) {
    return "Removed by freshness filter";
  }
  if (query.query?.trim() && relevanceScore(job, query.query) <= 0) {
    return "Removed by keyword search";
  }
  if (query.startupOnly && !job.startup?.isStartup) {
    return "Removed by startup-only filter";
  }
  if (query.studentRelevantOnly && !job.studentRelevant) {
    return "Removed by student-friendly filter";
  }
  if (
    query.startupRoleType &&
    query.startupRoleType !== "all" &&
    job.startupRoleType !== query.startupRoleType
  ) {
    return "Removed by startup role filter";
  }
  return "Filtered out before final sorted results";
}

function mapExclusionReason(
  job: NormalizedJob,
  query: NearbyJobsQuery,
  mapJobCount: number,
): string {
  if (!hasMapPin(job)) {
    if (job.workMode === "remote" && !query.showRemoteOnMap) {
      return "Remote job hidden because Show remote on map is off";
    }
    if (job.workMode === "remote") {
      return "Remote job has no regional map marker";
    }
    if (job.locationConfidence === "city_level") {
      return "City-level location only; exact office unknown";
    }
    if (job.locationConfidence === "country_level") {
      return "Country-level location only; exact office unknown";
    }
    return "No exact office coordinates";
  }

  if (mapJobCount >= maxMapJobs()) {
    return "Map job limit reached";
  }

  return "Grouped or omitted by map rendering";
}

function isBengaluruRelevantJob(job: NormalizedJob): boolean {
  const location = normalizeKey(
    `${job.locationText} ${job.city ?? ""} ${job.state ?? ""} ${job.country ?? ""}`,
  );
  if (
    /\b(bengaluru|bangalore|koramangala|hsr|indiranagar|whitefield|bellandur|marathahalli|hebbal|manyata)\b/.test(
      location,
    )
  ) {
    return true;
  }
  return (
    job.workMode === "remote" &&
    /\b(india|in|bharat|apac|asia|global|worldwide|anywhere)\b/.test(location)
  );
}

function remoteJobMatchesQueryRegion(
  job: NormalizedJob,
  query: NearbyJobsQuery,
): boolean {
  const normalizedLocation = normalizeKey(job.locationText);

  if (
    /\b(global|globally|worldwide|anywhere|distributed|apac|asia)\b/.test(
      normalizedLocation,
    )
  ) {
    return true;
  }

  if (query.lat >= 6 && query.lat <= 38 && query.lng >= 68 && query.lng <= 98) {
    return /\b(india|bharat|in|bengaluru|bangalore|blr)\b/.test(
      normalizedLocation,
    );
  }

  if (
    query.lat >= 18 &&
    query.lat <= 72 &&
    query.lng >= -172 &&
    query.lng <= -66
  ) {
    return /\b(us|usa|united states|america|north america|amer)\b/.test(
      normalizedLocation,
    );
  }

  return !/\b(india|bharat|us|usa|united states|uk|germany|canada|ukraine|europe)\b/.test(
    normalizedLocation,
  );
}

function hasMapPin(job: NormalizedJob): boolean {
  return typeof job.latitude === "number" && typeof job.longitude === "number";
}

function interleaveMapPinGroups(jobs: NormalizedJob[]): NormalizedJob[] {
  const groups = new Map<string, NormalizedJob[]>();
  const withoutPins: NormalizedJob[] = [];

  for (const job of jobs) {
    if (!hasMapPin(job)) {
      withoutPins.push(job);
      continue;
    }

    const key = `${job.latitude!.toFixed(4)},${job.longitude!.toFixed(4)}`;
    const group = groups.get(key);
    if (group) {
      group.push(job);
    } else {
      groups.set(key, [job]);
    }
  }

  const activeGroups = [...groups.values()];
  const interleaved: NormalizedJob[] = [];

  while (activeGroups.length > 0) {
    const remainingGroups: NormalizedJob[][] = [];
    for (const group of activeGroups) {
      const next = group.shift();
      if (next) {
        interleaved.push(next);
      }
      if (group.length > 0) {
        remainingGroups.push(group);
      }
    }
    activeGroups.splice(0, activeGroups.length, ...remainingGroups);
  }

  return [...interleaved, ...withoutPins];
}

function buildMapJobs(
  jobs: NormalizedJob[],
  query: NearbyJobsQuery,
): NormalizedJob[] {
  const max = maxMapJobs();
  const groups = new Map<string, NormalizedJob[]>();

  for (const job of jobs) {
    const mapJob = mapJobWithCoordinates(job, query);
    if (!mapJob) {
      continue;
    }

    const key = [
      normalizeKey(mapJob.companyName),
      mapJob.latitude!.toFixed(5),
      mapJob.longitude!.toFixed(5),
    ].join(":");

    const group = groups.get(key);
    if (group) {
      group.push(mapJob);
    } else {
      groups.set(key, [mapJob]);
    }
  }

  const activeGroups = [...groups.values()];
  const mapJobs: NormalizedJob[] = [];

  while (activeGroups.length > 0 && mapJobs.length < max) {
    const remainingGroups: NormalizedJob[][] = [];
    for (const group of activeGroups) {
      const next = group.shift();
      if (next) {
        mapJobs.push(next);
      }
      if (group.length > 0) {
        remainingGroups.push(group);
      }
      if (mapJobs.length >= max) {
        break;
      }
    }
    activeGroups.splice(0, activeGroups.length, ...remainingGroups);
  }

  return mapJobs;
}

function mapJobWithCoordinates(
  job: NormalizedJob,
  query: NearbyJobsQuery,
): NormalizedJob | null {
  if (
    hasMapPin(job) &&
    (job.workMode !== "remote" || query.showRemoteOnMap) &&
    job.locationConfidence === "exact_office"
  ) {
    return job;
  }
  return null;
}

function maxMapJobs(): number {
  const raw = Number(process.env.NEARHIRE_MAX_MAP_JOBS);
  if (Number.isFinite(raw) && raw > 0) {
    return Math.floor(raw);
  }
  return DEFAULT_MAX_MAP_JOBS;
}

function summarizeSourceHealth(
  health: SourceHealth[],
  totals: { rawJobs: number; geocodedJobs: number; dedupedJobs: number },
): SourceHealthSummary {
  const successful = health.filter((item) => item.status === "success").length;
  const failed = health.length - successful;
  return {
    total: health.length,
    successful,
    failed,
    rawAccepted: totals.rawJobs,
    locationFiltered: totals.geocodedJobs,
    deduped: totals.dedupedJobs,
    details: health.map((item) => ({
      source: item.source,
      provider: item.provider,
      sourceType: item.sourceType,
      status: item.status,
      jobsFetched: item.jobsFetched,
      jobsAccepted: item.jobsAccepted,
      durationMs: item.durationMs,
      cached: item.cached,
    })),
  };
}

function logSourceHealth(
  summary: SourceHealthSummary,
  health: SourceHealth[],
): void {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.info(
    `[NearHire sources] ${summary.successful}/${summary.total} succeeded, ${summary.failed} failed. Raw accepted=${summary.rawAccepted}, location filtered=${summary.locationFiltered}, deduped=${summary.deduped}`,
  );
  if (
    summary.failed > 0 ||
    process.env.NEARHIRE_VERBOSE_SOURCE_LOGS === "true"
  ) {
    console.table(
      health.map((item) => ({
        source: item.source,
        provider: item.provider,
        status: item.status,
        fetched: item.jobsFetched,
        accepted: item.jobsAccepted,
        durationMs: item.durationMs,
        cached: item.cached ? "yes" : "no",
        error: item.error ?? "",
      })),
    );
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
