import { getSourceConfigs } from "@/lib/sources/default-sources";
import type {
  CompanyDiscoveryContext,
  CompanyDiscoverySource,
  DiscoveredCompany,
} from "@/lib/types";

/**
 * Source keys that have confirmed, significant Bengaluru operations:
 * HQ, major dev centre, or explicitly India-based company.
 *
 * Excluded: SF/NY/Berlin-first companies that only have remote India hiring
 * (Anthropic, Cursor, Linear, Ramp, etc.) — those show up on the job cards
 * but shouldn't appear as Bengaluru office dots on the map.
 */
const BENGALURU_REGISTRY_KEYS = new Set([
  "phonepe",    // Bengaluru HQ (Salarpuria Softzone, Bellandur)
  "groww",      // Bengaluru HQ
  "hackerrank", // Bengaluru engineering office (Indiranagar)
  "inmobi",     // Bengaluru HQ
  "rubrik",     // Bengaluru engineering hub (Cessna Business Park)
  "postman",    // Founded in Bengaluru (Indiranagar)
  "drivetrain", // India startup — drivetrain.ai
  "meesho",     // Bengaluru HQ (Kaadubeesanahalli)
  "leucine",    // India biotech startup — leucine.io
  "botsync-1",  // Asia robotics startup with Bengaluru presence
  "prox-works", // India startup — proximity.tech
]);

/**
 * A CompanyDiscoverySource backed by the existing Hemlo source registry.
 * Returns startups with confirmed Bengaluru operations so they appear as
 * map dots alongside YC companies.
 *
 * Companies with entries in office-overrides.ts (PhonePe, HackerRank, Meesho,
 * Postman, Rubrik) will receive exact street-level coordinates in
 * fetchStartupEntities() via lookupOfficeBySourceKey(). Others fall back to
 * Nominatim geocoding and the city-level spread.
 */
export class RegistryStartupDiscoverySource implements CompanyDiscoverySource {
  id = "registry-startups";
  name = "Hemlo Registry";
  type = "startup_directory" as const;

  async discoverCompanies(
    context: CompanyDiscoveryContext = {},
  ): Promise<DiscoveredCompany[]> {
    // This source only covers Bengaluru for now
    const wantsBengaluru =
      !context.city || /bengaluru|bangalore/i.test(context.city);
    if (!wantsBengaluru) {
      return [];
    }

    return getSourceConfigs()
      .filter(
        (source) =>
          source.enabled &&
          source.startup?.isStartup &&
          BENGALURU_REGISTRY_KEYS.has(source.key),
      )
      .map(
        (source): DiscoveredCompany => ({
          id: `registry:${source.provider}:${source.key}`,
          name: source.displayName ?? source.key,
          source: "Hemlo Registry",
          sourceType: "ats",
          sourceUrl: source.careersUrl ?? source.website ?? null,
          website: source.website ?? null,
          careersUrl: source.careersUrl ?? null,
          logoUrl: null,
          description: null,
          locations: ["Bengaluru, Karnataka, India"],
          city: "Bengaluru",
          country: "India",
          industries: [],
          tags: [],
          startup: source.startup ?? { isStartup: true, source: "Hemlo Registry" },
          // Store the ATS key so fetchStartupEntities can look up office overrides
          detectedSource: {
            provider: source.provider,
            key: source.key,
            careersUrl: source.careersUrl ?? source.website ?? "",
          },
        }),
      );
  }
}
