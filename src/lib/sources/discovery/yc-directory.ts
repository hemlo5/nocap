import type {
  CompanyDiscoveryContext,
  CompanyDiscoverySource,
  DiscoveredCompany,
  StartupStage,
} from "@/lib/types";
import { requestSignal } from "@/lib/utils/fetch";
import { compact, normalizeKey, splitLocationCandidates } from "@/lib/utils/strings";

type AlgoliaOpts = {
  app: string;
  key: string;
};

type YcCompanyHit = {
  id?: number | string;
  objectID?: string;
  name?: string;
  slug?: string;
  small_logo_thumb_url?: string;
  logo_url?: string;
  website?: string;
  all_locations?: string;
  location?: string;
  city?: string;
  country?: string;
  one_liner?: string;
  long_description?: string;
  tags?: string[];
  industries?: string[];
  regions?: string[];
  batch?: string;
  stage?: string;
  team_size?: number;
  year_founded?: number;
  isHiring?: boolean;
};

type AlgoliaResult = {
  hits?: YcCompanyHit[];
  nbPages?: number;
};

type AlgoliaResponse = {
  results?: AlgoliaResult[];
};

const YC_COMPANIES_URL = "https://www.ycombinator.com/companies";
const YC_COMPANY_INDEX = "YCCompany_production";
const DEFAULT_MAX_COMPANIES = 100;
const MAX_HITS_PER_PAGE = 100;

export class YcDirectoryDiscoverySource implements CompanyDiscoverySource {
  id = "yc-directory";
  name = "YC Directory";
  type = "startup_directory" as const;

  async discoverCompanies(
    context: CompanyDiscoveryContext = {},
  ): Promise<DiscoveredCompany[]> {
    const options = await fetchAlgoliaOptions();
    const maxResults = clampMaxResults(context.maxResults);
    const hits: YcCompanyHit[] = [];
    let page = 0;
    let pages = 1;

    while (hits.length < maxResults && page < pages) {
      const result = await fetchCompanyPage(options, {
        page,
        hitsPerPage: Math.min(MAX_HITS_PER_PAGE, maxResults - hits.length),
        query: context.query,
        country: context.country ?? "India",
      });
      hits.push(...(result.hits ?? []));
      pages = Math.min(result.nbPages ?? page + 1, Math.ceil(maxResults / MAX_HITS_PER_PAGE));
      page += 1;
    }

    return dedupeCompanies(
      hits
        .map((hit) => normalizeYcCompany(hit))
        .filter((company): company is DiscoveredCompany => Boolean(company))
        .filter((company) => matchesDiscoveryContext(company, context)),
    ).slice(0, maxResults);
  }
}

export async function discoverYcCompanies(
  context?: CompanyDiscoveryContext,
): Promise<DiscoveredCompany[]> {
  return new YcDirectoryDiscoverySource().discoverCompanies(context);
}

async function fetchAlgoliaOptions(): Promise<AlgoliaOpts> {
  const response = await fetch(`${YC_COMPANIES_URL}?regions=India`, {
    headers: {
      Accept: "text/html",
      "User-Agent": "Hemlo local development (public YC directory discovery)",
    },
    signal: requestSignal(),
    next: { revalidate: 60 * 60 * 6 },
  });

  if (!response.ok) {
    throw new Error(`YC Directory returned ${response.status}`);
  }

  const html = await response.text();
  const match = html.match(/window\.AlgoliaOpts\s*=\s*(\{[^;]+\});/);
  if (!match?.[1]) {
    throw new Error("YC Directory Algolia options were not found");
  }

  const parsed = JSON.parse(match[1]) as Partial<AlgoliaOpts>;
  if (!parsed.app || !parsed.key) {
    throw new Error("YC Directory Algolia options were incomplete");
  }

  return { app: parsed.app, key: parsed.key };
}

async function fetchCompanyPage(
  options: AlgoliaOpts,
  request: {
    page: number;
    hitsPerPage: number;
    query?: string;
    country: string;
  },
): Promise<AlgoliaResult> {
  const params = new URLSearchParams({
    query: request.query ?? "",
    hitsPerPage: String(request.hitsPerPage),
    page: String(request.page),
    facetFilters: JSON.stringify([[`regions:${request.country}`]]),
    tagFilters: JSON.stringify(["ycdc_public"]),
  });
  const response = await fetch(
    `https://${options.app}-dsn.algolia.net/1/indexes/*/queries`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Algolia-API-Key": options.key,
        "X-Algolia-Application-Id": options.app,
      },
      body: JSON.stringify({
        requests: [{ indexName: YC_COMPANY_INDEX, params: params.toString() }],
      }),
      signal: requestSignal(),
      next: { revalidate: 60 * 60 * 6 },
    },
  );

  if (!response.ok) {
    throw new Error(`YC Directory search returned ${response.status}`);
  }

  const data = (await response.json()) as AlgoliaResponse;
  return data.results?.[0] ?? {};
}

function normalizeYcCompany(hit: YcCompanyHit): DiscoveredCompany | null {
  const name = compact(hit.name ?? "");
  const id = String(hit.objectID ?? hit.id ?? hit.slug ?? "");
  if (!name || !id) {
    return null;
  }

  const locations = splitLocationCandidates(
    compact(hit.all_locations ?? hit.location ?? hit.city ?? hit.country ?? "India"),
  );
  const slug = compact(hit.slug ?? "");
  const sourceUrl = slug ? `${YC_COMPANIES_URL}/${slug}` : YC_COMPANIES_URL;

  return {
    id: `yc:${slug || id}`,
    name,
    source: "YC Directory",
    sourceType: "startup_directory",
    sourceUrl,
    website: cleanUrl(hit.website),
    careersUrl: null,
    logoUrl: hit.logo_url ?? hit.small_logo_thumb_url ?? null,
    description: compact(hit.one_liner ?? hit.long_description ?? "") || null,
    locations,
    city: compact(hit.city ?? "") || firstCity(locations),
    country: compact(hit.country ?? "") || inferCountry(locations, hit.regions),
    industries: cleanList(hit.industries),
    tags: cleanList(hit.tags),
    startup: {
      isStartup: true,
      source: "Y Combinator Directory",
      ycFunded: true,
      accelerator: "Y Combinator",
      batch: compact(hit.batch ?? "") || undefined,
      stage: normalizeStage(hit.stage),
      employeeCount:
        typeof hit.team_size === "number" && hit.team_size > 0
          ? hit.team_size
          : undefined,
      foundedYear:
        typeof hit.year_founded === "number" && hit.year_founded > 0
          ? hit.year_founded
          : undefined,
      activelyHiring: typeof hit.isHiring === "boolean" ? hit.isHiring : undefined,
    },
    detectedSource: null,
  };
}

function matchesDiscoveryContext(
  company: DiscoveredCompany,
  context: CompanyDiscoveryContext,
): boolean {
  if (context.country) {
    const country = normalizeKey(
      `${company.country ?? ""} ${company.locations.join(" ")}`,
    );
    if (!country.includes(normalizeKey(context.country))) {
      return false;
    }
  }

  if (!context.city) {
    return true;
  }

  const city = normalizeKey(context.city);
  const location = normalizeKey(company.locations.join(" "));
  const wantsBengaluru = /\b(bengaluru|bangalore)\b/.test(city);
  const isBengaluruCompany = /\b(bengaluru|bangalore|blr)\b/.test(location);
  const isRemote = /\b(remote|fully remote|partly remote)\b/.test(location);

  if (wantsBengaluru) {
    return isBengaluruCompany || Boolean(context.includeRemote && isRemote);
  }

  return location.includes(city) || Boolean(context.includeRemote && isRemote);
}

function dedupeCompanies(companies: DiscoveredCompany[]): DiscoveredCompany[] {
  const byKey = new Map<string, DiscoveredCompany>();
  for (const company of companies) {
    const key = normalizeKey(company.website ?? company.name);
    if (!key || byKey.has(key)) {
      continue;
    }
    byKey.set(key, company);
  }
  return [...byKey.values()].sort((a, b) => {
    if (Boolean(b.startup.activelyHiring) !== Boolean(a.startup.activelyHiring)) {
      return b.startup.activelyHiring ? 1 : -1;
    }
    return a.name.localeCompare(b.name);
  });
}

function clampMaxResults(value: number | undefined): number {
  if (!value || !Number.isFinite(value) || value <= 0) {
    return DEFAULT_MAX_COMPANIES;
  }
  return Math.min(Math.floor(value), 300);
}

function cleanUrl(value: string | undefined): string | null {
  const url = compact(value ?? "");
  if (!url) {
    return null;
  }
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function cleanList(value: string[] | undefined): string[] {
  return Array.isArray(value) ? value.map(compact).filter(Boolean) : [];
}

function firstCity(locations: string[]): string | null {
  const location = locations.find((item) => !/\b(remote|india)\b/i.test(item));
  return location?.split(",")[0]?.trim() || null;
}

function inferCountry(locations: string[], regions: string[] | undefined): string | null {
  const text = normalizeKey([...locations, ...(regions ?? [])].join(" "));
  return /\bindia\b/.test(text) ? "India" : null;
}

function normalizeStage(value: string | undefined): StartupStage | undefined {
  const stage = normalizeKey(value ?? "");
  if (stage === "growth") {
    return "growth";
  }
  return undefined;
}
