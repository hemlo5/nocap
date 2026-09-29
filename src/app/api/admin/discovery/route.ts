import { buildCompanyRegistry } from "@/lib/services/company-registry";
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
  const maxResults = parsePositiveInt(url.searchParams.get("limit"), 150);
  const detectCareers = url.searchParams.get("detect_careers") === "true";
  const detectLimit = parsePositiveInt(url.searchParams.get("detect_limit"), 20);

  const registry = await buildCompanyRegistry(
    {
      city,
      country,
      query,
      includeRemote,
      maxResults,
    },
    {
      includeDiscovery: true,
      detectCareers,
      maxDetectedCareers: detectLimit,
    },
  );

  return Response.json({
    totals: registry.coverage,
    companies: registry.companies,
    unsupportedSources: registry.unsupportedSources,
    unsupportedSummary: summarizeUnsupported(registry.unsupportedSources),
    note:
      "Canonical in-memory company registry. No database or persistent crawler is used in this phase.",
  });
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

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
