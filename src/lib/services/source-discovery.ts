import { buildCompanyRegistry } from "@/lib/services/company-registry";
import { createSource } from "@/lib/sources";
import { getSourceConfigs } from "@/lib/sources/default-sources";
import type {
  CompanyDiscoveryContext,
  SourceConfig,
  SourceHealth,
  SourceProvider,
} from "@/lib/types";
import { normalizeKey } from "@/lib/utils/strings";

export type SourceDiscoveryConfidence =
  | "EXACT_OFFICIAL_ATS"
  | "OFFICIAL_CAREERS"
  | "DIRECTORY_VERIFIED"
  | "SEARCH_DISCOVERED"
  | "UNKNOWN";

export type DiscoveredJobSource = {
  source: SourceConfig;
  companyId: string;
  companyName: string;
  discoveryMethod: string;
  confidence: SourceDiscoveryConfidence;
  status: "validated" | "unvalidated" | "failed";
  jobsFetched: number | null;
  jobsAccepted: number | null;
  error?: string;
};

export type SourceDiscoveryResponse = {
  discoveredSources: DiscoveredJobSource[];
  unsupportedSources: Awaited<
    ReturnType<typeof buildCompanyRegistry>
  >["unsupportedSources"];
  totals: {
    companiesConsidered: number;
    supportedSources: number;
    validatedSources: number;
    failedSources: number;
    unsupportedSources: number;
  };
  generatedAt: string;
  cached: boolean;
};

type SourceDiscoveryOptions = {
  city?: string;
  country?: string;
  query?: string;
  includeRemote?: boolean;
  maxCompanies?: number;
  detectLimit?: number;
  maxSources?: number;
  validate?: boolean;
  sourceProvider?: SourceProvider | "all";
};

type SourceDiscoveryCacheEntry = {
  expiresAt: number;
  response: SourceDiscoveryResponse;
};

const DEFAULT_SOURCE_DISCOVERY_TTL_MS = 1000 * 60 * 60 * 6;
const discoveryCache = new Map<string, SourceDiscoveryCacheEntry>();

export async function getDiscoveredSourceConfigs(
  options: SourceDiscoveryOptions = {},
): Promise<SourceConfig[]> {
  if (process.env.NEARHIRE_ENABLE_SOURCE_DISCOVERY === "false") {
    return [];
  }

  let response: SourceDiscoveryResponse;
  try {
    response = await discoverJobSources({
      ...options,
      validate: options.validate ?? true,
    });
  } catch (error) {
    console.warn(
      `[NearHire discovery] Source discovery failed; using registry sources only. ${error instanceof Error ? error.message : String(error)}`,
    );
    return [];
  }

  return response.discoveredSources
    .filter(
      (item) =>
        item.status === "validated" &&
        (item.jobsAccepted ?? 0) > 0 &&
        (!options.sourceProvider ||
          options.sourceProvider === "all" ||
          item.source.provider === options.sourceProvider),
    )
    .map((item) => item.source);
}

export async function discoverJobSources(
  options: SourceDiscoveryOptions = {},
): Promise<SourceDiscoveryResponse> {
  const cacheKey = discoveryCacheKey(options);
  const cached = discoveryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      ...cached.response,
      cached: true,
    };
  }

  const context: CompanyDiscoveryContext = {
    city: options.city ?? "Bengaluru",
    country: options.country ?? "India",
    includeRemote: options.includeRemote ?? true,
    query: options.query,
    maxResults: options.maxCompanies ?? discoveryMaxCompanies(),
  };
  const registry = await buildCompanyRegistry(context, {
    includeDiscovery: true,
    detectCareers: true,
    maxDetectedCareers: options.detectLimit ?? discoveryDetectLimit(),
  });
  const manualSourceKeys = new Set(
    getSourceConfigs().map((source) => uniqueSourceKey(source)),
  );
  const bySourceKey = new Map<string, DiscoveredJobSource>();

  for (const company of registry.companies) {
    for (const source of company.atsSources) {
      const key = uniqueSourceKey(source);
      if (manualSourceKeys.has(key)) {
        continue;
      }
      if (
        options.sourceProvider &&
        options.sourceProvider !== "all" &&
        source.provider !== options.sourceProvider
      ) {
        continue;
      }

      const discovered = normalizeDiscoveredSource({
        source,
        companyId: company.id,
        companyName: company.name,
        discoveryMethod:
          company.sources[0]?.sourceType === "startup_directory"
            ? `${company.sources[0].source} + careers-page ATS detection`
            : "careers-page ATS detection",
        confidence: sourceConfidence(source),
      });

      const existing = bySourceKey.get(key);
      if (!existing || discovered.source.priority! > existing.source.priority!) {
        bySourceKey.set(key, discovered);
      }
    }
  }

  let discoveredSources = [...bySourceKey.values()]
    .sort((a, b) => (b.source.priority ?? 0) - (a.source.priority ?? 0))
    .slice(0, options.maxSources ?? discoveryMaxSources());

  if (options.validate) {
    discoveredSources = await validateDiscoveredSources(discoveredSources);
  }

  const response: SourceDiscoveryResponse = {
    discoveredSources,
    unsupportedSources: registry.unsupportedSources,
    totals: {
      companiesConsidered: registry.coverage.companies,
      supportedSources: discoveredSources.length,
      validatedSources: discoveredSources.filter(
        (source) => source.status === "validated",
      ).length,
      failedSources: discoveredSources.filter((source) => source.status === "failed")
        .length,
      unsupportedSources: registry.unsupportedSources.length,
    },
    generatedAt: new Date().toISOString(),
    cached: false,
  };

  discoveryCache.set(cacheKey, {
    response,
    expiresAt: Date.now() + discoveryTtlMs(),
  });

  return response;
}

function normalizeDiscoveredSource({
  source,
  companyId,
  companyName,
  discoveryMethod,
  confidence,
}: {
  source: SourceConfig;
  companyId: string;
  companyName: string;
  discoveryMethod: string;
  confidence: SourceDiscoveryConfidence;
}): DiscoveredJobSource {
  const priorityBoost =
    confidence === "EXACT_OFFICIAL_ATS"
      ? 12
      : confidence === "OFFICIAL_CAREERS"
        ? 8
        : 4;

  return {
    source: {
      ...source,
      displayName: source.displayName ?? companyName,
      enabled: true,
      priority: Math.max(source.priority ?? 0, 58 + priorityBoost),
      cities: source.cities?.length ? source.cities : ["Bengaluru", "Bangalore"],
      countries: source.countries?.length ? source.countries : ["India"],
    },
    companyId,
    companyName,
    discoveryMethod,
    confidence,
    status: "unvalidated",
    jobsFetched: null,
    jobsAccepted: null,
  };
}

async function validateDiscoveredSources(
  sources: DiscoveredJobSource[],
): Promise<DiscoveredJobSource[]> {
  return mapWithConcurrency(sources, 6, async (item) => {
    const startedAt = performance.now();
    try {
      const source = createSource(item.source);
      const rawJobs = await source.fetchJobs({
        location: {
          city: "Bengaluru",
          latitude: 12.9716,
          longitude: 77.5946,
        },
        searchRadiusKm: 50,
        includeRemote: true,
        maxResults: 100,
      });
      const accepted = rawJobs
        .map((job) => source.normalize(job))
        .filter(Boolean).length;

      return {
        ...item,
        status: "validated" as const,
        jobsFetched: rawJobs.length,
        jobsAccepted: accepted,
        source: {
          ...item.source,
          priority:
            accepted > 0
              ? Math.max(item.source.priority ?? 0, 76)
              : item.source.priority,
        },
      };
    } catch (error) {
      const health: Pick<SourceHealth, "durationMs" | "error"> = {
        durationMs: Math.round(performance.now() - startedAt),
        error: error instanceof Error ? error.message : String(error),
      };
      return {
        ...item,
        status: "failed" as const,
        jobsFetched: 0,
        jobsAccepted: 0,
        error: health.error,
      };
    }
  });
}

function sourceConfidence(source: SourceConfig): SourceDiscoveryConfidence {
  const careersUrl = source.careersUrl ?? "";
  if (
    /\b(boards\.greenhouse\.io|jobs\.lever\.co|jobs\.ashbyhq\.com|apply\.workable\.com|jobs\.smartrecruiters\.com|jobs\.personio\.com|bamboohr\.com|breezy\.hr|myworkdayjobs\.com)\b/i.test(
      careersUrl,
    )
  ) {
    return "EXACT_OFFICIAL_ATS";
  }
  if (source.website && source.careersUrl) {
    return "OFFICIAL_CAREERS";
  }
  if (source.startup?.ycFunded) {
    return "DIRECTORY_VERIFIED";
  }
  return "UNKNOWN";
}

function uniqueSourceKey(source: SourceConfig): string {
  return [
    source.provider,
    normalizeKey(source.key),
    source.site ? normalizeKey(source.site) : "",
  ].join(":");
}

function discoveryCacheKey(options: SourceDiscoveryOptions): string {
  return JSON.stringify({
    city: normalizeKey(options.city ?? "Bengaluru"),
    country: normalizeKey(options.country ?? "India"),
    query: normalizeKey(options.query ?? ""),
    includeRemote: options.includeRemote ?? true,
    maxCompanies: options.maxCompanies ?? discoveryMaxCompanies(),
    detectLimit: options.detectLimit ?? discoveryDetectLimit(),
    maxSources: options.maxSources ?? discoveryMaxSources(),
    validate: Boolean(options.validate),
    sourceProvider: options.sourceProvider ?? "all",
  });
}

function discoveryMaxCompanies(): number {
  return positiveInt(process.env.NEARHIRE_DISCOVERY_MAX_COMPANIES, 500);
}

function discoveryDetectLimit(): number {
  return positiveInt(process.env.NEARHIRE_DISCOVERY_DETECT_LIMIT, 180);
}

function discoveryMaxSources(): number {
  return positiveInt(process.env.NEARHIRE_DISCOVERY_MAX_SOURCES, 180);
}

function discoveryTtlMs(): number {
  return positiveInt(
    process.env.NEARHIRE_SOURCE_DISCOVERY_TTL_MS,
    DEFAULT_SOURCE_DISCOVERY_TTL_MS,
  );
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );

  return results;
}
