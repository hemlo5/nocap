import { NextRequest } from "next/server";

export type LocationSuggestionCategory = "eat" | "street" | "park" | "culture" | "other";

export type LocationSuggestion = {
  id: string;
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
  category?: LocationSuggestionCategory;
};

// Bengaluru center & bounds for proximity sorting
const BLR_LAT = 12.9716;
const BLR_LNG = 77.5946;

const NEARBY_MAX_RADIUS_KM = 3;
const NEARBY_CACHE_TTL_MS = 30 * 60 * 1000;
const SEARCH_CACHE_TTL_MS = 10 * 60 * 1000;
const nearbyCache = new Map<string, { expiresAt: number; results: LocationSuggestion[] }>();
const searchCache = new Map<string, { expiresAt: number; results: LocationSuggestion[] }>();

const POI_OSM_TAGS = [
  "amenity:cafe",
  "amenity:restaurant",
  "amenity:fast_food",
  "amenity:pub",
  "leisure:park",
];

const EXCLUDED_OSM_VALUES = new Set([
  "atm",
  "bank",
  "fuel",
  "parking",
  "parking_entrance",
  "toilets",
  "waste_basket",
  "recycling",
  "bench",
  "bus_stop",
  "traffic_signals",
  "crossing",
  "turning_circle",
  "post_box",
  "charging_station",
  "pharmacy",
  "hospital",
  "clinic",
  "police",
  "residential",
  "service",
  "unclassified",
]);

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function inferCategory(osmKey?: string | null, osmValue?: string | null): LocationSuggestionCategory {
  const k = (osmKey ?? "").toLowerCase();
  const v = (osmValue ?? "").toLowerCase();
  if (
    k === "leisure" ||
    v === "park" ||
    v === "garden" ||
    v === "playground" ||
    v === "nature_reserve" ||
    v === "water"
  ) {
    return "park";
  }
  if (
    v === "arts_centre" ||
    v === "cinema" ||
    v === "museum" ||
    v === "gallery" ||
    v === "theatre" ||
    v === "library" ||
    v === "attraction" ||
    k === "tourism"
  ) {
    return "culture";
  }
  if (k === "highway" || v === "pedestrian" || v === "marketplace" || v === "square") {
    return "street";
  }
  if (
    v === "cafe" ||
    v === "restaurant" ||
    v === "fast_food" ||
    v === "pub" ||
    v === "bar" ||
    v === "bakery" ||
    v === "ice_cream" ||
    v === "food_court"
  ) {
    return "eat";
  }
  return "other";
}

function addUniqueSuggestion(
  results: LocationSuggestion[],
  seen: Set<string>,
  item: LocationSuggestion
) {
  const normalized = item.title
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");
  if (!normalized || normalized === "location") return;
  const key = `${normalized}|${item.lat.toFixed(3)},${item.lng.toFixed(3)}`;
  if (seen.has(key)) return;
  seen.add(key);
  results.push(item);
}

async function fetchNearbyPhoton(
  lat: number,
  lng: number,
  withPoiTags: boolean
): Promise<LocationSuggestion[]> {
  const photonUrl = new URL("https://photon.komoot.io/reverse");
  photonUrl.searchParams.set("lat", String(lat));
  photonUrl.searchParams.set("lon", String(lng));
  photonUrl.searchParams.set("limit", "25");
  photonUrl.searchParams.set("radius", "2.5");
  if (withPoiTags) {
    for (const tag of POI_OSM_TAGS) {
      photonUrl.searchParams.append("osm_tag", tag);
    }
  }

  const res = await fetch(photonUrl.toString(), {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(900),
  });
  if (!res.ok) return [];

  const data = await res.json();
  const features = Array.isArray(data?.features) ? data.features : [];
  const items: LocationSuggestion[] = [];

  for (const f of features) {
    const coords = f.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) continue;
    const itemLng = Number(coords[0]);
    const itemLat = Number(coords[1]);
    if (!Number.isFinite(itemLat) || !Number.isFinite(itemLng)) continue;

    const p = f.properties ?? {};
    const title = typeof p.name === "string" ? p.name.trim() : "";
    if (!title) continue;

    const osmKey = typeof p.osm_key === "string" ? p.osm_key.toLowerCase() : "";
    const osmValue = typeof p.osm_value === "string" ? p.osm_value.toLowerCase() : "";
    if (!withPoiTags && (EXCLUDED_OSM_VALUES.has(osmValue) || p.type === "street")) {
      continue;
    }

    const subtitleParts = [
      p.street && p.street !== title ? p.street : null,
      p.suburb || p.district,
      p.city || p.county || "Bengaluru",
    ].filter(Boolean);

    items.push({
      id: `photon-${p.osm_id ?? `${itemLat.toFixed(5)}-${itemLng.toFixed(5)}`}`,
      title,
      subtitle: subtitleParts.join(", "),
      lat: itemLat,
      lng: itemLng,
      category: inferCategory(osmKey, osmValue),
    });
  }

  return items;
}

async function fetchNearbyOverpass(lat: number, lng: number, radiusMeters = 2500): Promise<LocationSuggestion[]> {
  const query = `[out:json][timeout:6];(nwr(around:${radiusMeters},${lat},${lng})[amenity~"^(cafe|restaurant|fast_food|pub|bar|bakery|ice_cream|cinema|arts_centre|library|theatre)$"][name];nwr(around:${radiusMeters},${lat},${lng})[leisure~"^(park|garden)$"][name];nwr(around:${radiusMeters},${lat},${lng})[tourism~"^(attraction|museum|gallery)$"][name];);out center 25;`;
  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "User-Agent": "NoCapBLR/1.0 (contact@nocapblr.com)",
        },
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(2200),
      });
      if (!res.ok) continue;

      const data = await res.json();
      const elements = Array.isArray(data?.elements) ? data.elements : [];
      const items: LocationSuggestion[] = [];

      for (const el of elements) {
        const tags = el.tags ?? {};
        const title = typeof tags.name === "string" ? tags.name.trim() : "";
        const itemLat = Number(el.lat ?? el.center?.lat);
        const itemLng = Number(el.lon ?? el.center?.lon);
        if (!title || !Number.isFinite(itemLat) || !Number.isFinite(itemLng)) continue;

        const osmKey = tags.leisure
          ? "leisure"
          : tags.tourism
          ? "tourism"
          : tags.highway
          ? "highway"
          : "amenity";
        const osmValue = tags.leisure || tags.tourism || tags.amenity || "";
        if (EXCLUDED_OSM_VALUES.has(String(osmValue).toLowerCase())) continue;

        const subtitleParts = [
          tags["addr:street"],
          tags["addr:suburb"],
          tags["addr:city"],
        ].filter(Boolean);

        items.push({
          id: `osm-${el.type ?? "n"}-${el.id ?? items.length}`,
          title,
          subtitle: subtitleParts.join(", ") || "Nearby on map",
          lat: itemLat,
          lng: itemLng,
          category: inferCategory(osmKey, String(osmValue)),
        });
      }

      if (items.length > 0) return items;
    } catch {
      // Try next Overpass endpoint
    }
  }

  return [];
}

async function fetchNominatimViewbox(
  lat: number,
  lng: number,
  boxDelta: number,
  keyword: string,
  limit = 10
): Promise<LocationSuggestion[]> {
  try {
    const viewbox = `${(lng - boxDelta).toFixed(4)},${(lat + boxDelta).toFixed(4)},${(lng + boxDelta).toFixed(4)},${(lat - boxDelta).toFixed(4)}`;
    const searchUrl = new URL("https://nominatim.openstreetmap.org/search");
    searchUrl.searchParams.set("q", keyword);
    searchUrl.searchParams.set("format", "jsonv2");
    searchUrl.searchParams.set("addressdetails", "1");
    searchUrl.searchParams.set("bounded", "1");
    searchUrl.searchParams.set("viewbox", viewbox);
    searchUrl.searchParams.set("limit", String(limit));

    const sRes = await fetch(searchUrl.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "NoCapBLR/1.0 (contact@nocapblr.com)",
      },
      signal: AbortSignal.timeout(2500),
    });
    if (!sRes.ok) return [];
    const rows = await sRes.json();
    if (!Array.isArray(rows)) return [];

    const items: LocationSuggestion[] = [];
    for (const item of rows) {
      const itemLat = Number.parseFloat(item.lat);
      const itemLng = Number.parseFloat(item.lon);
      if (!Number.isFinite(itemLat) || !Number.isFinite(itemLng)) continue;
      if (haversineKm(lat, lng, itemLat, itemLng) > NEARBY_MAX_RADIUS_KM) continue;

      const osmCategory = (typeof item.category === "string" ? item.category : item.class ?? "").toLowerCase();
      const osmType = (typeof item.type === "string" ? item.type : "").toLowerCase();
      if (EXCLUDED_OSM_VALUES.has(osmType)) continue;
      if (osmCategory === "boundary" || osmCategory === "landuse") continue;
      if (osmCategory === "highway" && !["pedestrian", "street", "living_street"].includes(osmType)) continue;
      if (osmCategory === "place" && !["square", "attraction"].includes(osmType)) continue;

      const nameParts = String(item.display_name ?? "").split(",");
      const title = nameParts[0]?.trim();
      if (!title) continue;
      const subtitle = nameParts
        .slice(1, 4)
        .map((s) => s.trim())
        .filter(Boolean)
        .join(", ");

      items.push({
        id: `nom-${item.place_id ?? items.length}`,
        title,
        subtitle: subtitle || "Nearby on map",
        lat: itemLat,
        lng: itemLng,
        category: inferCategory(osmCategory, osmType),
      });
    }
    return items;
  } catch {
    return [];
  }
}

async function fetchNearbyNominatim(lat: number, lng: number, _targetLimit: number): Promise<LocationSuggestion[]> {
  const results: LocationSuggestion[] = [];
  const seen = new Set<string>();
  const tightKeywords = ["cafe", "restaurant", "park"];
  const fullRadiusKeywords = ["cafe", "restaurant", "park", "bakery", "bar", "pub", "mall", "fast_food"];

  // Run both the ultra-close (~1.3 km) ring and full 3 km (~0.028°) multi-category search concurrently (~1.2s)
  const settled = await Promise.allSettled([
    ...tightKeywords.map((kw) => fetchNominatimViewbox(lat, lng, 0.012, kw, 15)),
    ...fullRadiusKeywords.map((kw) => fetchNominatimViewbox(lat, lng, 0.028, kw, 25)),
  ]);

  for (const res of settled) {
    if (res.status === "fulfilled") {
      for (const item of res.value) addUniqueSuggestion(results, seen, item);
    }
  }

  return results;
}

async function fetchNearbyWikipedia(lat: number, lng: number, radiusMeters = 2500): Promise<LocationSuggestion[]> {
  try {
    const url = new URL("https://en.wikipedia.org/w/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("list", "geosearch");
    url.searchParams.set("gscoord", `${lat}|${lng}`);
    url.searchParams.set("gsradius", String(radiusMeters));
    url.searchParams.set("gslimit", "16");
    url.searchParams.set("format", "json");

    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "NoCapBLR/1.0 (contact@nocapblr.com)",
      },
      signal: AbortSignal.timeout(1800),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const rows = Array.isArray(data?.query?.geosearch) ? data.query.geosearch : [];

    return rows
      .filter((row: { lat?: unknown; lon?: unknown; title?: unknown }) => {
        const itemLat = Number(row.lat);
        const itemLng = Number(row.lon);
        return (
          typeof row.title === "string" &&
          row.title.trim().length > 0 &&
          Number.isFinite(itemLat) &&
          Number.isFinite(itemLng) &&
          haversineKm(lat, lng, itemLat, itemLng) <= NEARBY_MAX_RADIUS_KM
        );
      })
      .map((row: { pageid?: number | string; title: string; lat: number; lon: number }) => {
        const titleLower = row.title.toLowerCase();
        const cat: LocationSuggestionCategory =
          titleLower.includes("park") || titleLower.includes("lake") || titleLower.includes("garden")
            ? "park"
            : "culture";
        return {
          id: `wiki-${row.pageid ?? `${row.lat}-${row.lon}`}`,
          title: row.title,
          subtitle: "Notable landmark nearby",
          lat: Number(row.lat),
          lng: Number(row.lon),
          category: cat,
        };
      });
  } catch {
    return [];
  }
}

async function findNearbySuggestions(lat: number, lng: number, limit: number): Promise<LocationSuggestion[]> {
  const cacheKey = `${lat.toFixed(3)}:${lng.toFixed(3)}:${limit}:${NEARBY_MAX_RADIUS_KM}`;
  const cached = nearbyCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.results;
  }

  const results: LocationSuggestion[] = [];
  const seen = new Set<string>();

  // Run fast tight-radius Photon (900ms), parallel Nominatim (1.3km -> 3km), and local Wiki GeoSearch (2.5km) concurrently
  const [photonRes, nominatimRes, wikiNearRes] = await Promise.allSettled([
    fetchNearbyPhoton(lat, lng, true),
    fetchNearbyNominatim(lat, lng, limit),
    fetchNearbyWikipedia(lat, lng, 2500),
  ]);

  if (photonRes.status === "fulfilled") {
    for (const item of photonRes.value) {
      if (haversineKm(lat, lng, item.lat, item.lng) <= NEARBY_MAX_RADIUS_KM) {
        addUniqueSuggestion(results, seen, item);
      }
    }
  }
  if (nominatimRes.status === "fulfilled") {
    for (const item of nominatimRes.value) addUniqueSuggestion(results, seen, item);
  }
  if (wikiNearRes.status === "fulfilled") {
    for (const item of wikiNearRes.value) addUniqueSuggestion(results, seen, item);
  }

  // Widen landmark lookup up to 3 km when very sparse (< 8 POIs)
  if (results.length < Math.min(8, limit)) {
    const wideWikiItems = await fetchNearbyWikipedia(lat, lng, 3000);
    for (const item of wideWikiItems) addUniqueSuggestion(results, seen, item);
  }

  const sorted = results
    .sort((a, b) => haversineKm(lat, lng, a.lat, a.lng) - haversineKm(lat, lng, b.lat, b.lng))
    .slice(0, limit);

  if (sorted.length > 0) {
    nearbyCache.set(cacheKey, {
      expiresAt: Date.now() + NEARBY_CACHE_TTL_MS,
      results: sorted,
    });
  }

  return sorted;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  // Nearby map suggestions mode (?lat=...&lng=...)
  const rawLat = searchParams.get("lat");
  const rawLng = searchParams.get("lng");
  if (!q && rawLat !== null && rawLng !== null) {
    const lat = Number(rawLat);
    const lng = Number(rawLng);
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 50, 1), 80);

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return Response.json({ results: [] }, { status: 400 });
    }

    const nearby = await findNearbySuggestions(lat, lng, limit);
    return Response.json(
      { results: nearby },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  }

  if (q.length < 2) {
    return Response.json({ results: [] });
  }

  const searchCacheKey = q.toLowerCase();
  const cachedSearch = searchCache.get(searchCacheKey);
  if (cachedSearch && cachedSearch.expiresAt > Date.now()) {
    return Response.json(
      { results: cachedSearch.results },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } }
    );
  }

  const results: LocationSuggestion[] = [];
  const seen = new Set<string>();

  const photonUrl = new URL("https://photon.komoot.io/api/");
  photonUrl.searchParams.set("q", q);
  photonUrl.searchParams.set("lat", String(BLR_LAT));
  photonUrl.searchParams.set("lon", String(BLR_LNG));
  photonUrl.searchParams.set("limit", "8");

  const nomQuery =
    q.toLowerCase().includes("bengaluru") || q.toLowerCase().includes("bangalore")
      ? q
      : `${q}, Bengaluru`;

  const nomUrl = new URL("https://nominatim.openstreetmap.org/search");
  nomUrl.searchParams.set("q", nomQuery);
  nomUrl.searchParams.set("format", "jsonv2");
  nomUrl.searchParams.set("addressdetails", "1");
  nomUrl.searchParams.set("countrycodes", "in");
  nomUrl.searchParams.set("viewbox", "77.25,13.45,77.95,12.65");
  nomUrl.searchParams.set("limit", "6");

  // Run Photon (900ms cap) and Nominatim (2.5s cap) in parallel so a stalled Photon request never slows search
  const [photonRes, nomRes] = await Promise.allSettled([
    fetch(photonUrl.toString(), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(900),
      next: { revalidate: 3600 },
    }),
    fetch(nomUrl.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "NoCapBLR/1.0 (contact@nocapblr.com)",
      },
      signal: AbortSignal.timeout(2500),
      next: { revalidate: 3600 },
    }),
  ]);

  if (photonRes.status === "fulfilled" && photonRes.value.ok) {
    try {
      const data = await photonRes.value.json();
      const features = Array.isArray(data?.features) ? data.features : [];
      for (const f of features) {
        const coords = f.geometry?.coordinates;
        if (!Array.isArray(coords) || coords.length < 2) continue;
        const lng = Number(coords[0]);
        const lat = Number(coords[1]);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

        const dist = haversineKm(BLR_LAT, BLR_LNG, lat, lng);
        if (dist > 90) continue;

        const p = f.properties ?? {};
        const title = p.name || p.street || p.suburb || "Location";
        const subtitleParts = [
          p.street !== title ? p.street : null,
          p.suburb || p.district,
          p.city || p.county || "Bengaluru",
          p.state || "Karnataka",
        ].filter(Boolean);

        const key = `${title.toLowerCase()}|${lat.toFixed(3)},${lng.toFixed(3)}`;
        if (seen.has(key)) continue;
        seen.add(key);

        results.push({
          id: `photon-${f.properties?.osm_id ?? results.length}`,
          title,
          subtitle: subtitleParts.join(", "),
          lat,
          lng,
          category: inferCategory(p.osm_key, p.osm_value),
        });
      }
    } catch {}
  }

  if (results.length < 6 && nomRes.status === "fulfilled" && nomRes.value.ok) {
    try {
      const nomData = await nomRes.value.json();
      if (Array.isArray(nomData)) {
        for (const item of nomData) {
          const lat = Number.parseFloat(item.lat);
          const lng = Number.parseFloat(item.lon);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

          const nameParts = (item.display_name ?? "").split(",");
          const title = nameParts[0]?.trim() || "Location";
          const subtitle = nameParts.slice(1, 4).map((s: string) => s.trim()).filter(Boolean).join(", ");

          const key = `${title.toLowerCase()}|${lat.toFixed(3)},${lng.toFixed(3)}`;
          if (seen.has(key)) continue;
          seen.add(key);

          results.push({
            id: `nom-${item.place_id ?? results.length}`,
            title,
            subtitle: subtitle || "Bengaluru, Karnataka",
            lat,
            lng,
            category: inferCategory(item.category ?? item.class, item.type),
          });

          if (results.length >= 6) break;
        }
      }
    } catch {}
  }

  const sliced = results.slice(0, 6);
  if (sliced.length > 0) {
    searchCache.set(searchCacheKey, {
      expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
      results: sliced,
    });
  }

  return Response.json(
    { results: sliced },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}

