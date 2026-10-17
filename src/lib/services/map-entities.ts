import { discoverStartupCompanies } from "@/lib/services/startup-discovery";
import { getCuratedInvestorEntities } from "@/lib/services/investor-registry";
import { getCuratedEventEntities } from "@/lib/services/event-registry";
import { getCuratedRadarEntities } from "@/lib/services/radar-registry";
import { lookupOfficeBySourceKey } from "@/lib/services/office-overrides";
import { getSourceConfigs } from "@/lib/sources/default-sources";
import type {
  Coordinates,
  DiscoveredCompany,
  MapEntitiesQuery,
  MapEntitiesResponse,
  MapEntity,
  MapEntitySourceHealth,
  MapEntityType,
} from "@/lib/types";
import { haversineKm } from "@/lib/utils/distance";
import { requestSignal } from "@/lib/utils/fetch";
import { compact, normalizeKey } from "@/lib/utils/strings";

const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const DEFAULT_ENTITY_LAYERS: MapEntityType[] = ["company", "startup", "investor", "event", "radar"];
const BENGALURU_LABEL = "Bengaluru, Karnataka, India";

// 1-hour in-memory cache for Overpass responses (expensive, rate-limited API)
const OVERPASS_CACHE_TTL_MS = 1000 * 60 * 60;
type OverpassCacheEntry = {
  expiresAt: number;
  payload: { elements?: OverpassElement[] };
};
const overpassCache = new Map<string, OverpassCacheEntry>();
// Top-level cache for getMapEntities response (30 minutes)
const mapEntitiesCache = new Map<string, { expiresAt: number; data: MapEntitiesResponse }>();
const MAP_ENTITIES_CACHE_TTL_MS = 1000 * 60 * 30;


type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

type LayerResult = {
  entities: MapEntity[];
  health: MapEntitySourceHealth;
  warnings: string[];
};

type OverpassEntityKind = "investor" | "event";

export async function getMapEntities(
  query: MapEntitiesQuery,
): Promise<MapEntitiesResponse> {
  const center = { lat: query.lat, lng: query.lng };
  const radiusKm = Math.min(Math.max(query.radius, 1), 50);
  const layers = query.layers?.length ? query.layers : DEFAULT_ENTITY_LAYERS;
  const limit = Math.min(Math.max(query.limit ?? 180, 1), 300);

  const cacheKey = `${center.lat.toFixed(3)}:${center.lng.toFixed(3)}:${radiusKm}:${[...layers].sort().join(",")}:${limit}`;
  const cached = mapEntitiesCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const settled = await Promise.allSettled(
    layers.map((layer) => fetchLayer(layer, center, radiusKm, limit)),
  );

  const sources: MapEntitySourceHealth[] = [];
  const warnings: string[] = [];
  const entities = settled.flatMap((result, index) => {
    const layer = layers[index];
    if (result.status === "fulfilled") {
      sources.push(result.value.health);
      warnings.push(...result.value.warnings);
      return result.value.entities;
    }

    sources.push({
      source: sourceNameForLayer(layer),
      type: layer,
      status: "failed",
      entitiesFound: 0,
      durationMs: 0,
      error:
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason),
    });
    return [];
  });

  const deduped = dedupeEntities(entities)
    .filter((entity) => withinRadius(entity, center, radiusKm))
    .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999))
    .slice(0, limit);

  const result: MapEntitiesResponse = {
    entities: deduped,
    total: deduped.length,
    center,
    radiusKm,
    warnings: [...new Set(warnings)],
    sources,
  };

  mapEntitiesCache.set(cacheKey, {
    expiresAt: Date.now() + MAP_ENTITIES_CACHE_TTL_MS,
    data: result,
  });

  return result;
}

async function fetchLayer(
  layer: MapEntityType,
  center: Coordinates,
  radiusKm: number,
  limit: number,
): Promise<LayerResult> {
  switch (layer) {
    case "company":
      return fetchCompanyEntities(center, radiusKm, limit);
    case "startup":
      return fetchStartupEntities(center, radiusKm, limit);
    case "investor":
      return fetchInvestorEntities(center, radiusKm, limit);
    case "event":
      return fetchOverpassEntities("event", center, radiusKm, limit);
    case "radar":
      return fetchRadarEntities(center, radiusKm, limit);
  }
}

// ---------------------------------------------------------------------------
// Startup layer — only confirmed physical office locations
// ---------------------------------------------------------------------------

async function fetchCompanyEntities(
  center: Coordinates,
  radiusKm: number,
  limit: number,
): Promise<LayerResult> {
  const startedAt = performance.now();
  const sources = getSourceConfigs().filter((source) => source.enabled !== false);
  const rawEntities: MapEntity[] = [];

  for (const source of sources) {
    const lookupKeys = [
      source.key,
      `${source.provider}:${source.key}`,
      source.displayName ?? "",
    ].filter(Boolean);
    const office = lookupKeys
      .map((key) => lookupOfficeBySourceKey(key))
      .find(Boolean);

    if (!office) {
      continue;
    }

    const companyName = source.displayName ?? source.key;
    const coords = { lat: office.lat, lng: office.lng };
    const entity: MapEntity = {
      id: `company:${source.provider}:${source.key}`,
      type: source.startup?.isStartup ? "startup" : "company",
      name: companyName,
      description: source.startup?.isStartup
        ? "Startup from the NearHire verified ATS registry."
        : "Company from the NearHire verified ATS registry.",
      url: source.website ?? source.careersUrl ?? null,
      logoUrl: companyFavicon(source.website),
      source: source.provider,
      sourceUrl: source.careersUrl ?? source.website ?? null,
      locationText: office.label,
      latitude: office.lat,
      longitude: office.lng,
      distanceKm: haversineKm(center, coords),
      locationConfidence: "exact_office",
      metadata: {
        provider: source.provider,
        sourceKey: source.key,
        sourceType: source.type ?? "ats",
        activelyHiring: true,
        startup: Boolean(source.startup?.isStartup),
      },
    };

    if ((entity.distanceKm ?? Number.POSITIVE_INFINITY) <= radiusKm) {
      rawEntities.push(entity);
    }
  }

  return {
    entities: dedupeEntitiesByNormName(rawEntities)
      .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999))
      .slice(0, limit),
    warnings: [],
    health: {
      source: `NearHire Company Registry (${sources.length} companies checked)`,
      type: "company",
      status: "success",
      entitiesFound: rawEntities.length,
      durationMs: Math.round(performance.now() - startedAt),
    },
  };
}

async function fetchStartupEntities(
  center: Coordinates,
  radiusKm: number,
  limit: number,
): Promise<LayerResult> {
  const startedAt = performance.now();
  const response = await discoverStartupCompanies({
    city: "Bengaluru",
    country: "India",
    includeRemote: false,
    maxResults: Math.min(limit, 150),
  });

  const companies = response.companies
    .filter(hasBengaluruLocation)
    .slice(0, limit);

  const rawEntities: MapEntity[] = [];

  for (const company of companies) {
    const key = company.detectedSource?.key || company.name;
    const override = lookupOfficeBySourceKey(key);
    if (override) {
      const entity: MapEntity = {
        id: `startup:${company.id}`,
        type: "startup",
        name: company.name,
        description: company.description ?? null,
        url: company.website ?? company.sourceUrl ?? null,
        logoUrl: companyFavicon(company.website),
        source: company.source,
        sourceUrl: company.sourceUrl ?? null,
        locationText: override.label,
        latitude: override.lat,
        longitude: override.lng,
        distanceKm: haversineKm(center, override),
        locationConfidence: "exact_office",
        metadata: startupMetadata(company),
      };
      if ((entity.distanceKm ?? Number.POSITIVE_INFINITY) <= radiusKm) {
        rawEntities.push(entity);
      }
    }
    // Only verified office locations appear as dots — non-exact vanish
  }

  return {
    entities: rawEntities,
    warnings: [],
    health: {
      source: "Startup Discovery",
      type: "startup",
      status: "success",
      entitiesFound: rawEntities.length,
      durationMs: Math.round(performance.now() - startedAt),
    },
  };
}

// ---------------------------------------------------------------------------
// Investor layer — curated registry + optional Overpass supplement
// ---------------------------------------------------------------------------

async function fetchRadarEntities(
  center: Coordinates,
  radiusKm: number,
  limit: number,
): Promise<LayerResult> {
  const entities = getCuratedRadarEntities(center, radiusKm).slice(0, limit);
  return {
    entities,
    warnings: [],
    health: {
      source: "Discovery Radar",
      type: "radar",
      status: "success",
      entitiesFound: entities.length,
      durationMs: 1,
    },
  };
}

async function fetchInvestorEntities(
  center: Coordinates,
  radiusKm: number,
  limit: number,
): Promise<LayerResult> {
  const startedAt = performance.now();

  // Primary: hand-curated Bengaluru VC registry (exact verified offices)
  const curatedEntities = getCuratedInvestorEntities(center, radiusKm).filter(
    (e) => e.locationConfidence === "exact_office",
  );

  // Secondary: try Overpass for any tagged investor offices in OSM
  let overpassEntities: MapEntity[] = [];
  try {
    const payload = await Promise.race([
      fetchOverpassPayload(
        investorOverpassQuery(center, radiusKm, Math.min(limit, 60)),
      ),
      new Promise<{ elements?: OverpassElement[] }>((_, reject) =>
        setTimeout(() => reject(new Error("Investor Overpass timeout")), 1500),
      ),
    ]);
    overpassEntities = (payload.elements ?? [])
      .map((el) => overpassElementToEntity("investor", el, center))
      .filter(
        (e): e is MapEntity =>
          e !== null && e.locationConfidence === "exact_office",
      )
      .filter((e) => withinRadius(e, center, radiusKm));
  } catch {
    // Non-fatal — curated data is the primary source anyway
  }

  // Merge, dedupe by normalised name, keep fixed at exact coordinates
  const merged = dedupeEntitiesByNormName([
    ...curatedEntities,
    ...overpassEntities,
  ]).slice(0, limit);

  return {
    entities: merged,
    warnings: [],
    health: {
      source: "Hemlo Investor Registry",
      type: "investor",
      status: "success",
      entitiesFound: merged.length,
      durationMs: Math.round(performance.now() - startedAt),
    },
  };
}

// ---------------------------------------------------------------------------
// Event layer (Overpass only)
// ---------------------------------------------------------------------------

async function fetchOverpassEntities(
  kind: OverpassEntityKind,
  center: Coordinates,
  radiusKm: number,
  limit: number,
): Promise<LayerResult> {
  const startedAt = performance.now();
  const curatedEntities =
    kind === "event" ? getCuratedEventEntities(center, radiusKm) : [];
  const overpassQuery =
    kind === "investor"
      ? investorOverpassQuery(center, radiusKm, limit)
      : eventOverpassQuery(center, radiusKm, limit);

  let overpassEntities: MapEntity[] = [];
  let status: MapEntitySourceHealth["status"] = "success";
  let error: string | undefined;
  try {
    const payload = await Promise.race([
      fetchOverpassPayload(overpassQuery),
      new Promise<{ elements?: OverpassElement[] }>((_, reject) =>
        setTimeout(() => reject(new Error(`${kind} Overpass timeout`)), 900),
      ),
    ]);
    overpassEntities = (payload.elements ?? [])
      .map((element) => overpassElementToEntity(kind, element, center))
      .filter((entity): entity is MapEntity => Boolean(entity))
      .filter((entity) => withinRadius(entity, center, radiusKm));
  } catch (caught) {
    if (curatedEntities.length === 0) {
      status = "failed";
      error = caught instanceof Error ? caught.message : String(caught);
    }
  }

  const entities = dedupeEntitiesByNormName([
    ...curatedEntities,
    ...overpassEntities,
  ]).slice(0, limit);

  return {
    entities,
    warnings: [],
    health: {
      source:
        kind === "event"
          ? "NearHire Event Registry + OpenStreetMap"
          : "OpenStreetMap Overpass",
      type: kind === "investor" ? "investor" : "event",
      status,
      entitiesFound: entities.length,
      durationMs: Math.round(performance.now() - startedAt),
      error,
    },
  };
}

// ---------------------------------------------------------------------------
// Overpass helpers
// ---------------------------------------------------------------------------

function investorOverpassQuery(
  center: Coordinates,
  radiusKm: number,
  limit: number,
): string {
  const around = overpassAround(center, radiusKm);
  const terms =
    "venture|ventures|capital|vc|fund|funds|angel|seed|accelerator|incubator|private equity|investment|investors|partners";

  return `
    [out:json][timeout:10];
    (
      nwr${around}["office"~"investment|venture_capital|financial|company",i]["name"~"${terms}",i];
      nwr${around}["name"~"${terms}",i]["addr:city"~"Bengaluru|Bangalore",i];
    );
    out tags center qt ${Math.min(limit * 2, 500)};
  `;
}

function eventOverpassQuery(
  center: Coordinates,
  radiusKm: number,
  limit: number,
): string {
  const around = overpassAround(center, radiusKm);
  const terms =
    "event|events|conference|convention|auditorium|exhibition|expo|summit|meetup|hall|arena";

  return `
    [out:json][timeout:10];
    (
      nwr${around}["tourism"="event_venue"];
      nwr${around}["amenity"~"conference_centre|events_venue",i];
      nwr${around}["building"~"convention_center|auditorium",i];
      nwr${around}["name"~"${terms}",i]["addr:city"~"Bengaluru|Bangalore",i];
    );
    out tags center qt ${Math.min(limit * 2, 500)};
  `;
}

async function fetchOverpassPayload(
  overpassQuery: string,
): Promise<{ elements?: OverpassElement[] }> {
  const cacheKey = overpassQuery.replace(/\s+/g, " ").trim();
  const cached = overpassCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.payload;
  }

  const errors: string[] = [];

  for (const endpoint of OVERPASS_URLS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "User-Agent": "Hemlo discovery dashboard",
        },
        body: new URLSearchParams({ data: overpassQuery }),
        signal: requestSignal(2000),
        next: { revalidate: 60 * 60 * 24 },
      });

      if (!response.ok) {
        errors.push(`${endpoint} returned ${response.status}`);
        continue;
      }

      const payload = (await response.json()) as {
        elements?: OverpassElement[];
      };
      overpassCache.set(cacheKey, {
        payload,
        expiresAt: Date.now() + OVERPASS_CACHE_TTL_MS,
      });
      return payload;
    } catch (error) {
      errors.push(
        error instanceof Error
          ? `${endpoint}: ${error.message}`
          : String(error),
      );
    }
  }

  throw new Error(
    errors.join("; ") || "OpenStreetMap Overpass did not respond",
  );
}

function overpassAround(center: Coordinates, radiusKm: number): string {
  const radiusMeters = Math.round(Math.min(radiusKm, 50) * 1000);
  return `(around:${radiusMeters},${center.lat},${center.lng})`;
}

function overpassElementToEntity(
  kind: OverpassEntityKind,
  element: OverpassElement,
  center: Coordinates,
): MapEntity | null {
  const tags = element.tags ?? {};
  const name = compact(tags.name ?? tags.brand ?? tags.operator ?? "");
  const lat = element.lat ?? element.center?.lat;
  const lng = element.lon ?? element.center?.lon;

  if (!name || typeof lat !== "number" || typeof lng !== "number") {
    return null;
  }

  if (kind === "investor" && !looksLikeInvestor(tags, name)) {
    return null;
  }
  if (kind === "event" && !looksLikeEventVenue(tags, name)) {
    return null;
  }

  const type: MapEntityType = kind === "investor" ? "investor" : "event";
  const coordinates = { lat, lng };

  return {
    id: `${type}:osm:${element.type}:${element.id}`,
    type,
    name,
    description:
      kind === "event"
        ? "Event venue from OpenStreetMap"
        : "Investor or funding office from OpenStreetMap",
    url: tags.website ?? tags["contact:website"] ?? osmElementUrl(element),
    source: "OpenStreetMap",
    sourceUrl: osmElementUrl(element),
    locationText: osmLocationText(tags, BENGALURU_LABEL),
    latitude: lat,
    longitude: lng,
    distanceKm: haversineKm(center, coordinates),
    locationConfidence: "city_level",
    metadata: {
      osmType: element.type,
      osmId: element.id,
      category:
        tags.office ??
        tags.amenity ??
        tags.tourism ??
        tags.building ??
        null,
    },
  };
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function hasBengaluruLocation(company: DiscoveredCompany): boolean {
  const fields = [
    company.city,
    company.country,
    company.locations.join(" "),
  ].filter(Boolean);
  const text = normalizeKey(fields.join(" "));
  return /\b(bengaluru|bangalore)\b/.test(text);
}

function startupMetadata(
  company: DiscoveredCompany,
): Record<string, string | number | boolean | null> {
  return {
    ycFunded: company.startup.ycFunded ?? null,
    batch: company.startup.batch ?? null,
    stage: company.startup.stage ?? null,
    employees: company.startup.employeeCount ?? null,
    activelyHiring: company.startup.activelyHiring ?? null,
  };
}

function looksLikeInvestor(
  tags: Record<string, string>,
  name: string,
): boolean {
  const text = normalizeKey(
    [name, tags.office, tags.description].filter(Boolean).join(" "),
  );
  return /\b(venture|ventures|capital|vc|fund|funds|angel|seed|accelerator|incubator|private equity|investment|investor|partners)\b/.test(
    text,
  );
}

function looksLikeEventVenue(
  tags: Record<string, string>,
  name: string,
): boolean {
  const text = normalizeKey(
    [name, tags.tourism, tags.amenity, tags.building, tags.description]
      .filter(Boolean)
      .join(" "),
  );
  return /\b(event|events|conference|convention|auditorium|exhibition|expo|summit|meetup|hall|arena|event venue|events venue|conference centre)\b/.test(
    text,
  );
}

function osmLocationText(
  tags: Record<string, string>,
  fallback: string,
): string {
  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:suburb"],
    tags["addr:city"],
  ]
    .filter(Boolean)
    .join(", ");
  return compact(parts) || fallback;
}

function withinRadius(
  entity: MapEntity,
  center: Coordinates,
  radiusKm: number,
): boolean {
  const distance =
    entity.distanceKm ??
    haversineKm(center, { lat: entity.latitude, lng: entity.longitude });
  entity.distanceKm = distance;
  return distance <= radiusKm;
}

function dedupeEntities(entities: MapEntity[]): MapEntity[] {
  const byKey = new Map<string, MapEntity>();
  for (const entity of entities) {
    const key = [
      entity.type,
      normalizeKey(entity.name),
      entity.latitude.toFixed(5),
      entity.longitude.toFixed(5),
    ].join(":");
    if (!byKey.has(key)) {
      byKey.set(key, entity);
    }
  }
  return [...byKey.values()];
}

function dedupeEntitiesByNormName(entities: MapEntity[]): MapEntity[] {
  const byName = new Map<string, MapEntity>();
  for (const entity of entities) {
    const key = normalizeKey(entity.name);
    if (key && !byName.has(key)) {
      byName.set(key, entity);
    }
  }
  return [...byName.values()];
}

function sourceNameForLayer(layer: MapEntityType): string {
  if (layer === "company") return "NearHire Company Registry";
  if (layer === "startup") return "Startup Discovery";
  if (layer === "investor") return "Hemlo Investor Registry";
  return "OpenStreetMap Overpass";
}

function osmElementUrl(element: OverpassElement): string {
  return `https://www.openstreetmap.org/${element.type}/${element.id}`;
}

function companyFavicon(website?: string | null): string | null {
  if (!website) return null;
  try {
    const { hostname } = new URL(website);
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`;
  } catch {
    return null;
  }
}
