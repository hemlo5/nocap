import { discoverCareersPage } from "@/lib/sources/discovery/careers-page";
import { detectCareerSource } from "@/lib/sources/discovery/ats-detector";
import { getSourceConfigs } from "@/lib/sources/default-sources";
import { discoverStartupCompanies } from "@/lib/services/startup-discovery";
import type {
  CanonicalCompany,
  CompanyDiscoveryContext,
  CompanySourceReference,
  CompanyType,
  DiscoveredCompany,
  SourceConfig,
  UnsupportedCareerSource,
} from "@/lib/types";
import { compact, normalizeKey } from "@/lib/utils/strings";

type CompanyRegistryOptions = {
  includeDiscovery?: boolean;
  detectCareers?: boolean;
  maxDetectedCareers?: number;
};

export type CompanyRegistryResponse = {
  companies: CanonicalCompany[];
  unsupportedSources: UnsupportedCareerSource[];
  coverage: {
    companies: number;
    withWebsite: number;
    withCareersPage: number;
    withAts: number;
    withSupportedAts: number;
    withUnsupportedAts: number;
    activelyHiring: number;
  };
};

const DEFAULT_MAX_DETECTED_CAREERS = 20;

export async function buildCompanyRegistry(
  context: CompanyDiscoveryContext = {},
  options: CompanyRegistryOptions = {},
): Promise<CompanyRegistryResponse> {
  const now = new Date().toISOString();
  const companies = new Map<string, CanonicalCompany>();

  for (const source of getSourceConfigs()) {
    if (!source.enabled) {
      continue;
    }
    mergeCompany(companies, companyFromSourceConfig(source, now));
  }

  if (options.includeDiscovery ?? true) {
    const discovered = await discoverStartupCompanies({
      city: context.city ?? "Bengaluru",
      country: context.country ?? "India",
      includeRemote: context.includeRemote ?? true,
      query: context.query,
      maxResults: context.maxResults ?? 150,
    });
    for (const company of discovered.companies) {
      mergeCompany(companies, companyFromDiscovery(company, now));
    }
  }

  const canonicalCompanies = [...companies.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  if (options.detectCareers) {
    await attachCareersAndSources(
      canonicalCompanies,
      options.maxDetectedCareers ?? DEFAULT_MAX_DETECTED_CAREERS,
    );
  }

  const unsupportedSources = canonicalCompanies.flatMap(
    (company) => company.unsupportedSources,
  );

  return {
    companies: canonicalCompanies,
    unsupportedSources,
    coverage: buildCoverage(canonicalCompanies),
  };
}

export function canonicalCompanyId(name: string, website?: string | null): string {
  const domain = website ? domainFromUrl(website) : null;
  return domain ? `company:${domain}` : `company:${normalizeKey(name).replace(/\s+/g, "-")}`;
}

function companyFromSourceConfig(
  source: SourceConfig,
  now: string,
): CanonicalCompany {
  const name = compact(source.displayName ?? source.key);
  const id = canonicalCompanyId(name, source.website);
  const sourceReference: CompanySourceReference = {
    source: source.displayName ?? source.key,
    sourceType: source.type ?? "ats",
    sourceUrl: source.careersUrl ?? source.website ?? null,
  };

  return {
    id,
    name,
    normalizedName: normalizeKey(name),
    website: source.website ?? null,
    careersUrl: source.careersUrl ?? source.website ?? null,
    logoUrl: null,
    industries: [],
    companyType: source.startup?.isStartup ? "startup" : undefined,
    headquarters: null,
    offices: source.cities?.map((city) => ({ raw: city, city, country: "India" })) ?? [],
    country: source.countries?.[0] ?? null,
    cities: source.cities ?? [],
    employeeCount: source.startup?.employeeCount ?? null,
    foundedYear: source.startup?.foundedYear ?? null,
    startup: source.startup,
    isHiring: undefined,
    sources: [sourceReference],
    atsSources: (source.type ?? "ats") === "ats" ? [source] : [],
    unsupportedSources: [],
    discoveredAt: now,
    updatedAt: now,
  };
}

function companyFromDiscovery(
  company: DiscoveredCompany,
  now: string,
): CanonicalCompany {
  const id = canonicalCompanyId(company.name, company.website);
  return {
    id,
    name: company.name,
    normalizedName: normalizeKey(company.name),
    website: company.website ?? null,
    careersUrl: company.careersUrl ?? null,
    logoUrl: company.logoUrl ?? null,
    industries: company.industries ?? [],
    companyType: inferCompanyType(company),
    headquarters: company.locations[0] ?? null,
    offices: company.locations.map((location) => ({
      raw: location,
      city: cityFromLocation(location),
      country: countryFromLocation(location),
    })),
    country: company.country ?? countryFromLocation(company.locations.join(" ")),
    cities: uniqueList(
      company.locations.map(cityFromLocation).filter((city): city is string =>
        Boolean(city),
      ),
    ),
    employeeCount: company.startup.employeeCount ?? null,
    foundedYear: company.startup.foundedYear ?? null,
    startup: company.startup,
    isHiring: company.startup.activelyHiring,
    sources: [
      {
        source: company.source,
        sourceType: company.sourceType,
        sourceUrl: company.sourceUrl ?? null,
      },
    ],
    atsSources: [],
    unsupportedSources: [],
    discoveredAt: now,
    updatedAt: now,
  };
}

function mergeCompany(
  companies: Map<string, CanonicalCompany>,
  incoming: CanonicalCompany,
): void {
  const key = incoming.id;
  const existing = companies.get(key);
  if (!existing) {
    companies.set(key, incoming);
    return;
  }

  companies.set(key, {
    ...existing,
    website: existing.website ?? incoming.website,
    careersUrl: existing.careersUrl ?? incoming.careersUrl,
    logoUrl: existing.logoUrl ?? incoming.logoUrl,
    industries: uniqueList([...existing.industries, ...incoming.industries]),
    companyType: existing.companyType ?? incoming.companyType,
    headquarters: existing.headquarters ?? incoming.headquarters,
    offices: mergeOffices(existing.offices, incoming.offices),
    country: existing.country ?? incoming.country,
    cities: uniqueList([...existing.cities, ...incoming.cities]),
    employeeCount: existing.employeeCount ?? incoming.employeeCount,
    foundedYear: existing.foundedYear ?? incoming.foundedYear,
    startup: existing.startup ?? incoming.startup,
    isHiring: existing.isHiring ?? incoming.isHiring,
    sources: mergeSourceRefs(existing.sources, incoming.sources),
    atsSources: mergeSourceConfigs(existing.atsSources, incoming.atsSources),
    unsupportedSources: [
      ...existing.unsupportedSources,
      ...incoming.unsupportedSources,
    ],
    updatedAt: incoming.updatedAt,
  });
}

async function attachCareersAndSources(
  companies: CanonicalCompany[],
  limit: number,
): Promise<void> {
  const candidates = companies
    .filter((company) => company.website || company.careersUrl)
    .slice(0, Math.max(0, limit));
  const results = await mapWithConcurrency(candidates, 5, async (company) => {
    const careers = await discoverCareersPage(company);
    if (careers.status !== "found" || !careers.careersUrl) {
      return { company, careers, detection: null };
    }
    const detection = await detectCareerSource(careers.careersUrl);
    return { company, careers, detection };
  });

  for (const result of results) {
    const { company, careers, detection } = result;
    const careersUrl = careers.careersUrl ?? undefined;
    if (careersUrl) {
      company.careersUrl = careersUrl;
    }
    if (!detection) {
      continue;
    }
    if (!careersUrl) {
      continue;
    }

    if (detection.supported && detection.provider) {
      const sourceKey = detection.key ?? sourceKeyFromUrl(careersUrl);
      company.atsSources = mergeSourceConfigs(company.atsSources, [
        {
          provider: detection.provider,
          key: sourceKey,
          id: `${detection.provider}:${sourceKey}`,
          type: "ats",
          displayName: company.name,
          website: company.website ?? undefined,
          careersUrl,
          enabled: true,
          priority: 50,
          cities: company.cities,
          countries: company.country ? [company.country] : undefined,
          startup: company.startup,
        },
      ]);
      continue;
    }

      company.unsupportedSources.push({
      companyId: company.id,
      companyName: company.name,
      website: company.website,
      careersUrl,
      detectedPlatform: detection.platform,
      evidence: detection.evidence ?? careers.evidence,
      status: detection.platform ? "unsupported" : "unknown",
      estimatedJobs: null,
    });
  }
}

function buildCoverage(companies: CanonicalCompany[]): CompanyRegistryResponse["coverage"] {
  return {
    companies: companies.length,
    withWebsite: companies.filter((company) => company.website).length,
    withCareersPage: companies.filter((company) => company.careersUrl).length,
    withAts: companies.filter(
      (company) => company.atsSources.length > 0 || company.unsupportedSources.length > 0,
    ).length,
    withSupportedAts: companies.filter((company) => company.atsSources.length > 0).length,
    withUnsupportedAts: companies.filter(
      (company) => company.unsupportedSources.length > 0,
    ).length,
    activelyHiring: companies.filter((company) => company.isHiring).length,
  };
}

function inferCompanyType(company: DiscoveredCompany): CompanyType | undefined {
  if (company.startup.isStartup) {
    return "startup";
  }
  return undefined;
}

function mergeOffices(
  existing: CanonicalCompany["offices"],
  incoming: CanonicalCompany["offices"],
): CanonicalCompany["offices"] {
  const byKey = new Map<string, CanonicalCompany["offices"][number]>();
  for (const office of [...existing, ...incoming]) {
    byKey.set(normalizeKey(office.raw), office);
  }
  return [...byKey.values()];
}

function mergeSourceRefs(
  existing: CompanySourceReference[],
  incoming: CompanySourceReference[],
): CompanySourceReference[] {
  const byKey = new Map<string, CompanySourceReference>();
  for (const source of [...existing, ...incoming]) {
    byKey.set(`${source.sourceType}:${source.source}:${source.sourceUrl ?? ""}`, source);
  }
  return [...byKey.values()];
}

function mergeSourceConfigs(
  existing: SourceConfig[],
  incoming: SourceConfig[],
): SourceConfig[] {
  const byKey = new Map<string, SourceConfig>();
  for (const source of [...existing, ...incoming]) {
    byKey.set(`${source.provider}:${source.key}`, source);
  }
  return [...byKey.values()];
}

function cityFromLocation(location: string): string | null {
  const first = compact(location).split(",")[0]?.trim();
  if (!first || /\b(remote|india|south asia)\b/i.test(first)) {
    return null;
  }
  return first;
}

function countryFromLocation(location: string): string | null {
  return /\bindia\b/i.test(location) ? "India" : null;
}

function domainFromUrl(value: string): string | null {
  try {
    return new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`).hostname
      .replace(/^www\./i, "")
      .toLowerCase();
  } catch {
    return null;
  }
}

function sourceKeyFromUrl(value: string): string {
  try {
    const url = new URL(value);
    return url.pathname.split("/").filter(Boolean).pop() ?? url.hostname;
  } catch {
    return normalizeKey(value).replace(/\s+/g, "-");
  }
}

function uniqueList(values: string[]): string[] {
  return [...new Set(values.map(compact).filter(Boolean))];
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
