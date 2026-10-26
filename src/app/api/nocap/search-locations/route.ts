import { NextRequest } from "next/server";

export type LocationSuggestion = {
  id: string;
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
};

// Bengaluru center & bounds for proximity sorting
const BLR_LAT = 12.9716;
const BLR_LNG = 77.5946;

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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (q.length < 2) {
    return Response.json({ results: [] });
  }

  const results: LocationSuggestion[] = [];
  const seen = new Set<string>();

  // 1. First, search Photon (fast fuzzy search biased to Bengaluru)
  try {
    const photonUrl = new URL("https://photon.komoot.io/api/");
    photonUrl.searchParams.set("q", q);
    photonUrl.searchParams.set("lat", String(BLR_LAT));
    photonUrl.searchParams.set("lon", String(BLR_LNG));
    photonUrl.searchParams.set("limit", "8");

    const photonRes = await fetch(photonUrl.toString(), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(3500),
      next: { revalidate: 3600 },
    });

    if (photonRes.ok) {
      const data = await photonRes.json();
      const features = Array.isArray(data?.features) ? data.features : [];

      for (const f of features) {
        const coords = f.geometry?.coordinates;
        if (!Array.isArray(coords) || coords.length < 2) continue;
        const lng = Number(coords[0]);
        const lat = Number(coords[1]);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

        const dist = haversineKm(BLR_LAT, BLR_LNG, lat, lng);
        // Prioritize Bengaluru metro region (within 90km)
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
        });
      }
    }
  } catch (err) {
    // If Photon fails or times out, fallback to Nominatim below
  }

  // 2. If Photon returned fewer than 3 results, supplement with Nominatim
  if (results.length < 3) {
    try {
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
      nomUrl.searchParams.set("limit", "5");

      const nomRes = await fetch(nomUrl.toString(), {
        headers: {
          Accept: "application/json",
          "User-Agent": "NoCapBLR/1.0 (contact@nocapblr.com)",
        },
        signal: AbortSignal.timeout(3500),
        next: { revalidate: 3600 },
      });

      if (nomRes.ok) {
        const nomData = await nomRes.json();
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
            });

            if (results.length >= 6) break;
          }
        }
      }
    } catch {}
  }

  return Response.json(
    { results: results.slice(0, 6) },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}

