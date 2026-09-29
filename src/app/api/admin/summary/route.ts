import { buildCompanyRegistry } from "@/lib/services/company-registry";
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
    },
    sources: sourceSummaries,
    companyRegistry: registry,
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
