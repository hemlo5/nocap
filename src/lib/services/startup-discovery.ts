import { YcDirectoryDiscoverySource } from "@/lib/sources/discovery/yc-directory";
import { RegistryStartupDiscoverySource } from "@/lib/sources/registry-startup-source";
import type {
  CompanyDiscoveryContext,
  CompanyDiscoveryHealth,
  CompanyDiscoveryResponse,
  CompanyDiscoverySource,
  DiscoveredCompany,
} from "@/lib/types";
import { normalizeKey } from "@/lib/utils/strings";

const DEFAULT_DISCOVERY_CACHE_TTL_MS = 1000 * 60 * 15;

type DiscoveryCacheEntry = {
  expiresAt: number;
  response: CompanyDiscoveryResponse;
};

const discoveryCache = new Map<string, DiscoveryCacheEntry>();

export async function discoverStartupCompanies(
  context: CompanyDiscoveryContext = {},
): Promise<CompanyDiscoveryResponse> {
  const cacheKey = discoveryCacheKey(context);
  const cached = discoveryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.response;
  }

  const sources = getStartupDiscoverySources();
  const settled = await Promise.allSettled(
    sources.map(async (source) => {
      const startedAt = performance.now();
      const companies = await source.discoverCompanies(context);
      return {
        companies,
        health: {
          source: source.name,
          sourceType: source.type,
          status: "success" as const,
          companiesFound: companies.length,
          durationMs: Math.round(performance.now() - startedAt),
        },
      };
    }),
  );

  const health: CompanyDiscoveryHealth[] = [];
  const companies = settled.flatMap((result, index) => {
    const source = sources[index];
    if (result.status === "fulfilled") {
      health.push(result.value.health);
      return result.value.companies;
    }

    health.push({
      source: source.name,
      sourceType: source.type,
      status: "failed",
      companiesFound: 0,
      durationMs: 0,
      error:
        result.reason instanceof Error ? result.reason.message : String(result.reason),
    });
    return [];
  });

  const response = {
    companies: dedupeDiscoveredCompanies(companies),
    sources: health,
  };
  discoveryCache.set(cacheKey, {
    response,
    expiresAt: Date.now() + discoveryCacheTtlMs(),
  });
  return response;
}

export function getStartupDiscoverySources(): CompanyDiscoverySource[] {
  return [
    new YcDirectoryDiscoverySource(),
    new RegistryStartupDiscoverySource(),
  ];
}

function dedupeDiscoveredCompanies(
  companies: DiscoveredCompany[],
): DiscoveredCompany[] {
  const byKey = new Map<string, DiscoveredCompany>();
  for (const company of companies) {
    const key = normalizeKey(company.website ?? company.name);
    if (!key || byKey.has(key)) {
      continue;
    }
    byKey.set(key, company);
  }
  return [...byKey.values()];
}

function discoveryCacheKey(context: CompanyDiscoveryContext): string {
  return JSON.stringify({
    city: normalizeKey(context.city ?? ""),
    country: normalizeKey(context.country ?? "India"),
    includeRemote: Boolean(context.includeRemote),
    query: normalizeKey(context.query ?? ""),
    maxResults: context.maxResults ?? null,
  });
}

function discoveryCacheTtlMs(): number {
  const parsed = Number.parseInt(process.env.NEARHIRE_DISCOVERY_CACHE_TTL_MS ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 0
    ? parsed
    : DEFAULT_DISCOVERY_CACHE_TTL_MS;
}
