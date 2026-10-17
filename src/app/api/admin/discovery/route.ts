import { discoverJobSources } from "@/lib/services/source-discovery";
import { requireBearerSecret } from "@/lib/validation";

export async function GET(request: Request) {
  const unauthorized = requireBearerSecret(request, "ADMIN_TOKEN");
  if (unauthorized) {
    return unauthorized;
  }

  const url = new URL(request.url);
  const city = url.searchParams.get("city") || "Bengaluru";
  const country = url.searchParams.get("country") || "India";
  const query = url.searchParams.get("query") || undefined;
  const includeRemote = url.searchParams.get("include_remote") !== "false";
  const maxResults = parsePositiveInt(url.searchParams.get("limit"), 500);
  const detectLimit = parsePositiveInt(url.searchParams.get("detect_limit"), 180);
  const maxSources = parsePositiveInt(url.searchParams.get("max_sources"), 180);
  const validate = url.searchParams.get("validate") === "true";

  const discovery = await discoverJobSources({
    city,
    country,
    query,
    includeRemote,
    maxCompanies: maxResults,
    detectLimit,
    maxSources,
    validate,
  });

  return Response.json({
    totals: discovery.totals,
    discoveredSources: discovery.discoveredSources,
    unsupportedSources: discovery.unsupportedSources,
    unsupportedSummary: summarizeUnsupported(discovery.unsupportedSources),
    generatedAt: discovery.generatedAt,
    cached: discovery.cached,
    note:
      "Discovery-generated ATS sources feed the existing NearHire adapters. No database or persistent crawler is used in this phase.",
  });
}

function summarizeUnsupported(
  unsupportedSources: Awaited<ReturnType<typeof discoverJobSources>>["unsupportedSources"],
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

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
