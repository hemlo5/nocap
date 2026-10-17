import { buildCompanyRegistry } from "@/lib/services/company-registry";
import { discoverJobSources } from "@/lib/services/source-discovery";
import { getEnabledSources } from "@/lib/sources";
import { requireBearerSecret } from "@/lib/validation";

export async function GET(request: Request) {
  const unauthorized = requireBearerSecret(request, "ADMIN_TOKEN");
  if (unauthorized) {
    return unauthorized;
  }

  const sources = getEnabledSources();
  const settled = await Promise.allSettled(
    sources.map(async (source) => {
      const rawJobs = await source.fetchJobs({ includeContent: false });
      return {
        source: source.provider,
        sourceKey: source.source.key,
        sourceType: source.source.type ?? "ats",
        displayName: source.source.displayName ?? source.source.key,
        startup: Boolean(source.source.startup?.isStartup),
        jobs: rawJobs.length,
        lastSync: new Date().toISOString(),
      };
    }),
  );

  const sourceSummaries = settled.map((result, index) => {
    const source = sources[index];
    if (result.status === "fulfilled") {
      return result.value;
    }

    return {
      source: source.provider,
      sourceKey: source.source.key,
      sourceType: source.source.type ?? "ats",
      displayName: source.source.displayName ?? source.source.key,
      startup: Boolean(source.source.startup?.isStartup),
      jobs: null,
      lastSync: null,
      warning:
        result.reason instanceof Error ? result.reason.message : String(result.reason),
    };
  });

  const activeJobs = sourceSummaries.reduce(
    (total, source) => total + (source.jobs ?? 0),
    0,
  );
  const registry = await getCompanyRegistrySummary();
  const discovery = await getSourceDiscoverySummary();

  return Response.json({
    totals: {
      totalJobs: activeJobs,
      activeJobs,
      expiredJobs: 0,
      verifiedJobs: activeJobs,
      companies: registry.coverage.companies,
      sources: sources.length,
      startupSources: sources.filter((source) => source.source.startup?.isStartup).length,
      atsSources: sources.filter((source) => (source.source.type ?? "ats") === "ats").length,
      startupBoards: sources.filter((source) => source.source.type === "startup_board").length,
      companiesWithWebsites: registry.coverage.withWebsite,
      companiesWithCareersPages: registry.coverage.withCareersPage,
      companiesWithAts: registry.coverage.withAts,
      companiesWithSupportedAts: registry.coverage.withSupportedAts,
      companiesWithUnsupportedAts: registry.coverage.withUnsupportedAts,
      activelyHiringCompanies: registry.coverage.activelyHiring,
      discoveredSources: discovery.totals.supportedSources,
      discoveredSourcesValidated: discovery.totals.validatedSources,
      discoveredSourcesFailed: discovery.totals.failedSources,
      unsupportedDiscoveredSources: discovery.totals.unsupportedSources,
    },
    sources: sourceSummaries,
    companyRegistry: registry,
    sourceDiscovery: discovery,
    note: "Live source mode: no database, queue, cron worker, Redis, or PostGIS is used for search.",
  });
}

async function getCompanyRegistrySummary(): Promise<{
  coverage: {
    companies: number;
    withWebsite: number;
    withCareersPage: number;
    withAts: number;
    withSupportedAts: number;
    withUnsupportedAts: number;
    activelyHiring: number;
  };
  unsupportedSummary: Array<{
    platform: string;
    companies: number;
    estimatedJobs: number | null;
  }>;
  sample: Array<{
    name: string;
    website?: string | null;
    careersUrl?: string | null;
    cities: string[];
    activelyHiring?: boolean;
    companyType?: string;
  }>;
  warning?: string;
}> {
  try {
    const registry = await buildCompanyRegistry(
      {
        city: "Bengaluru",
        country: "India",
        includeRemote: true,
        maxResults: 150,
      },
      { includeDiscovery: true, detectCareers: false },
    );

    return {
      coverage: registry.coverage,
      unsupportedSummary: summarizeUnsupported(registry.unsupportedSources),
      sample: registry.companies.slice(0, 12).map((company) => ({
        name: company.name,
        website: company.website,
        careersUrl: company.careersUrl,
        cities: company.cities,
        activelyHiring: company.isHiring,
        companyType: company.companyType,
      })),
    };
  } catch (error) {
    return {
      coverage: {
        companies: 0,
        withWebsite: 0,
        withCareersPage: 0,
        withAts: 0,
        withSupportedAts: 0,
        withUnsupportedAts: 0,
        activelyHiring: 0,
      },
      unsupportedSummary: [],
      sample: [],
      warning: error instanceof Error ? error.message : String(error),
    };
  }
}

function summarizeUnsupported(
  unsupportedSources: Awaited<ReturnType<typeof buildCompanyRegistry>>["unsupportedSources"],
) {
  const byPlatform = new Map<
    string,
    { platform: string; companies: number; estimatedJobs: number | null }
  >();

  for (const source of unsupportedSources) {
    const platform = source.detectedPlatform ?? "Unknown";
    const existing = byPlatform.get(platform) ?? {
      platform,
      companies: 0,
      estimatedJobs: null,
    };
    existing.companies += 1;
    if (typeof source.estimatedJobs === "number") {
      existing.estimatedJobs = (existing.estimatedJobs ?? 0) + source.estimatedJobs;
    }
    byPlatform.set(platform, existing);
  }

  return [...byPlatform.values()].sort((a, b) => b.companies - a.companies);
}

async function getSourceDiscoverySummary(): Promise<{
  totals: {
    companiesConsidered: number;
    supportedSources: number;
    validatedSources: number;
    failedSources: number;
    unsupportedSources: number;
  };
  sample: Array<{
    companyName: string;
    provider: string;
    key: string;
    confidence: string;
    discoveryMethod: string;
    status: string;
    jobsFetched: number | null;
  }>;
  warning?: string;
}> {
  try {
    const discovery = await discoverJobSources({
      city: "Bengaluru",
      country: "India",
      includeRemote: true,
      maxCompanies: 500,
      detectLimit: 180,
      maxSources: 180,
      validate: false,
    });

    return {
      totals: discovery.totals,
      sample: discovery.discoveredSources.slice(0, 20).map((item) => ({
        companyName: item.companyName,
        provider: item.source.provider,
        key: item.source.key,
        confidence: item.confidence,
        discoveryMethod: item.discoveryMethod,
        status: item.status,
        jobsFetched: item.jobsFetched,
      })),
    };
  } catch (error) {
    return {
      totals: {
        companiesConsidered: 0,
        supportedSources: 0,
        validatedSources: 0,
        failedSources: 0,
        unsupportedSources: 0,
      },
      sample: [],
      warning: error instanceof Error ? error.message : String(error),
    };
  }
}
