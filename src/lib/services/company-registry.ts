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
import { requestSignal } from "@/lib/utils/fetch";
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
  const atsSources = sourceConfigFromDiscoveredCompany(company);
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
    atsSources,
    unsupportedSources: [],
    discoveredAt: now,
    updatedAt: now,
  };
}

function sourceConfigFromDiscoveredCompany(company: DiscoveredCompany): SourceConfig[] {
  if (!company.detectedSource?.provider) {
    return [];
  }

  const provider = company.detectedSource.provider;
  const careersUrl = company.detectedSource.careersUrl || company.careersUrl || company.website;
  if (!careersUrl) {
    return [];
  }

  const sourceKey = company.detectedSource.key ?? sourceKeyFromUrl(careersUrl);
  const source = sourceConfigFromDetectedCareer({
    provider,
    sourceKey,
    company: {
      id: canonicalCompanyId(company.name, company.website),
      name: company.name,
      normalizedName: normalizeKey(company.name),
      website: company.website ?? null,
      careersUrl: company.careersUrl ?? careersUrl,
      logoUrl: company.logoUrl ?? null,
      industries: company.industries ?? [],
      companyType: company.startup.isStartup ? "startup" : undefined,
      headquarters: company.locations[0] ?? null,
      offices: [],
      country: company.country ?? countryFromLocation(company.locations.join(" ")),
      cities: uniqueList(
        company.locations
          .map(cityFromLocation)
          .filter((city): city is string => Boolean(city)),
      ),
      employeeCount: company.startup.employeeCount ?? null,
      foundedYear: company.startup.foundedYear ?? null,
      startup: company.startup,
      isHiring: company.startup.activelyHiring,
      sources: [],
      atsSources: [],
      unsupportedSources: [],
      discoveredAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    careersUrl,
  });

  return source ? [source] : [];
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
    .sort(companyDiscoveryPriority)
    .slice(0, Math.max(0, limit));
  const results = await mapWithConcurrency(candidates, 5, async (company) => {
    try {
      const careers = await discoverCareersPage(company);
      if (careers.status !== "found" || !careers.careersUrl) {
        return { company, careers, detection: null };
      }
      const detection = await detectCareerSource(careers.careersUrl);
      return { company, careers, detection };
    } catch (error) {
      return {
        company,
        careers: {
          companyId: company.id,
          companyName: company.name,
          website: company.website,
          careersUrl: company.careersUrl,
          status: "failed" as const,
          error: error instanceof Error ? error.message : String(error),
        },
        detection: null,
      };
    }
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
      const detectedSource = sourceConfigFromDetectedCareer({
        provider: detection.provider,
        sourceKey,
        company,
        careersUrl,
      });
      if (!detectedSource) {
        company.unsupportedSources.push({
          companyId: company.id,
          companyName: company.name,
          website: company.website,
          careersUrl,
          detectedPlatform: detection.platform,
          evidence:
            detection.evidence ??
            "Detected ATS, but source configuration could not be derived safely",
          status: "unsupported",
          estimatedJobs: null,
        });
        continue;
      }
      company.atsSources = mergeSourceConfigs(company.atsSources, [detectedSource]);
      continue;
    }

    const guessedSource = await guessPublicAtsSource(company, careersUrl);
    if (guessedSource) {
      company.atsSources = mergeSourceConfigs(company.atsSources, [guessedSource]);
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

async function guessPublicAtsSource(
  company: CanonicalCompany,
  careersUrl?: string,
): Promise<SourceConfig | null> {
  const candidates = atsSlugCandidates(company, careersUrl);
  const providers: SourceConfig["provider"][] = [
    "greenhouse",
    "lever",
    "ashby",
    "workable",
    "smartrecruiters",
    "bamboohr",
    "breezy",
    "recruitee",
  ];

  for (const key of candidates) {
    for (const provider of providers) {
      if (await publicAtsBoardExists(provider, key)) {
        return {
          provider,
          key,
          id: `${provider}:${key}`,
          type: "ats",
          displayName: company.name,
          website: company.website ?? undefined,
          careersUrl: publicAtsCareersUrl(provider, key),
          enabled: true,
          priority: 62,
          cities: company.cities.length ? company.cities : ["Bengaluru", "Bangalore"],
          countries: company.country ? [company.country] : ["India"],
          startup: company.startup,
        };
      }
    }
  }

  return null;
}

function atsSlugCandidates(company: CanonicalCompany, careersUrl?: string): string[] {
  const rawValues = [
    company.name,
    company.website ? domainParts(company.website)[0] : "",
    careersUrl ? domainParts(careersUrl)[0] : "",
  ];
  const candidates = new Set<string>();

  for (const value of rawValues) {
    const normalized = normalizeKey(value)
      .replace(/\b(india|technologies|technology|labs|software|systems|private|limited|pvt|ltd|inc|llc|corp|corporation|global|tech)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!normalized) {
      continue;
    }
    const compacted = normalized.replace(/[^a-z0-9]/g, "");
    const dashed = normalized.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const underscored = normalized.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

    for (const candidate of [compacted, dashed, underscored]) {
      if (candidate.length >= 3 && candidate.length <= 48) {
        candidates.add(candidate);
      }
    }
  }

  return [...candidates].slice(0, 8);
}

function domainParts(value: string): string[] {
  try {
    const hostname = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
      .hostname.replace(/^www\./i, "");
    return hostname.split(".");
  } catch {
    return [];
  }
}

async function publicAtsBoardExists(
  provider: SourceConfig["provider"],
  key: string,
): Promise<boolean> {
  const url = publicAtsProbeUrl(provider, key);
  if (!url) {
    return false;
  }

  try {
    const response = await fetch(url, {
      signal: requestSignal(3500),
      cache: "no-store",
      headers: {
        Accept: "application/json,text/html",
        "User-Agent": "Hemlo public ATS discovery probe",
      },
    });
    if (!response.ok) {
      return false;
    }
    const text = await response.text();
    return /jobs|postings|positions|offers|result|content|title|name/i.test(text);
  } catch {
    return false;
  }
}

function publicAtsProbeUrl(
  provider: SourceConfig["provider"],
  key: string,
): string | null {
  if (provider === "greenhouse") {
    return `https://boards-api.greenhouse.io/v1/boards/${key}/jobs?content=false`;
  }
  if (provider === "lever") {
    return `https://api.lever.co/v0/postings/${key}?mode=json`;
  }
  if (provider === "ashby") {
    return `https://api.ashbyhq.com/posting-api/job-board/${key}?includeCompensation=true`;
  }
  if (provider === "workable") {
    return `https://www.workable.com/api/accounts/${key}?details=false`;
  }
  if (provider === "smartrecruiters") {
    return `https://api.smartrecruiters.com/v1/companies/${key}/postings?limit=1`;
  }
  if (provider === "bamboohr") {
    return `https://${key}.bamboohr.com/careers/list`;
  }
  if (provider === "breezy") {
    return `https://${key}.breezy.hr/json`;
  }
  if (provider === "recruitee") {
    return `https://${key}.recruitee.com/api/offers/`;
  }
  return null;
}

function publicAtsCareersUrl(provider: SourceConfig["provider"], key: string): string {
  if (provider === "greenhouse") return `https://boards.greenhouse.io/${key}`;
  if (provider === "lever") return `https://jobs.lever.co/${key}`;
  if (provider === "ashby") return `https://jobs.ashbyhq.com/${key}`;
  if (provider === "workable") return `https://apply.workable.com/${key}/`;
  if (provider === "smartrecruiters") return `https://jobs.smartrecruiters.com/${key}`;
  if (provider === "bamboohr") return `https://${key}.bamboohr.com/careers`;
  if (provider === "breezy") return `https://${key}.breezy.hr`;
  if (provider === "recruitee") return `https://${key}.recruitee.com`;
  return key;
}

function companyDiscoveryPriority(
  a: CanonicalCompany,
  b: CanonicalCompany,
): number {
  return companyDiscoveryScore(b) - companyDiscoveryScore(a);
}

function companyDiscoveryScore(company: CanonicalCompany): number {
  let score = 0;
  if (company.atsSources.length === 0) score += 100;
  if (company.isHiring) score += 40;
  if (company.startup?.isStartup || company.companyType === "startup") score += 30;
  if (company.cities.some((city) => /bengaluru|bangalore/i.test(city))) score += 20;
  if (company.country === "India") score += 10;
  if (company.website) score += 5;
  return score;
}

function sourceConfigFromDetectedCareer({
  provider,
  sourceKey,
  company,
  careersUrl,
}: {
  provider: SourceConfig["provider"];
  sourceKey: string;
  company: CanonicalCompany;
  careersUrl: string;
}): SourceConfig | null {
  const base: SourceConfig = {
    provider,
    key: sourceKey,
    id: `${provider}:${sourceKey}`,
    type: "ats",
    displayName: company.name,
    website: company.website ?? undefined,
    careersUrl,
    enabled: true,
    priority: 64,
    cities: company.cities.length ? company.cities : ["Bengaluru", "Bangalore"],
    countries: company.country ? [company.country] : ["India"],
    startup: company.startup,
  };

  if (provider !== "workday") {
    return base;
  }

  const workday = deriveWorkdayEndpoint(careersUrl);
  if (!workday) {
    return null;
  }

  return {
    ...base,
    key: workday.key,
    id: `${provider}:${workday.key}:${workday.site}`,
    endpoint: workday.endpoint,
    tenant: workday.tenant,
    site: workday.site,
    searchText: "Bangalore",
  };
}

function deriveWorkdayEndpoint(
  careersUrl: string,
): { key: string; tenant: string; site: string; endpoint: string } | null {
  try {
    const url = new URL(careersUrl);
    if (!/myworkdayjobs\.com$/i.test(url.hostname)) {
      return null;
    }
    const key = url.hostname.split(".")[0];
    const site = url.pathname.split("/").filter(Boolean)[0];
    if (!key || !site) {
      return null;
    }
    return {
      key,
      tenant: key,
      site,
      endpoint: `${url.origin}/wday/cxs/${key}/${site}/jobs`,
    };
  } catch {
    return null;
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
