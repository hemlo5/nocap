import type { Coordinates, LocationConfidence, MapEntity } from "@/lib/types";
import { haversineKm } from "@/lib/utils/distance";

type CuratedRadarZone = {
  id: string;
  name: string;
  shortTag: string;
  description: string;
  locationText: string;
  lat: number;
  lng: number;
  locationConfidence: LocationConfidence;
  targetCount: string;
};

/**
 * Hand-curated registry of Bengaluru zones that are currently empty / under indexing.
 * Clicking these dots alerts users that regional scrapers are actively mapping companies
 * and verified job openings will update within 18 hours.
 */
const bengaluruRadarZones: CuratedRadarZone[] = [
  {
    id: "radar:electronic-city-phase1",
    name: "Electronic City Phase 1 Tech Hub",
    shortTag: "ECITY",
    description:
      "Global tech campus corridor housing Infosys, Wipro, Siemens, and HP enterprise campuses. Automated feeds are actively updating local opportunities.",
    locationText: "Hosur Main Road, Electronic City Phase 1, Bengaluru",
    lat: 12.845,
    lng: 77.663,
    locationConfidence: "exact_office",
    targetCount: "45+ companies",
  },
  {
    id: "radar:electronic-city-phase2",
    name: "Electronic City Phase 2 Tech Park",
    shortTag: "ECITY",
    description:
      "Embedded systems, semiconductor, and IT services campus zone. Indexing official career openings for 30+ regional employers.",
    locationText: "Electronic City Phase 2, Bengaluru",
    lat: 12.838,
    lng: 77.682,
    locationConfidence: "exact_office",
    targetCount: "30+ companies",
  },
  {
    id: "radar:rajajinagar-wtc",
    name: "Rajajinagar - World Trade Center Hub",
    shortTag: "WTC",
    description:
      "Premier North-West commercial center hosting Amazon India development center, high-growth startups, and consulting offices. Syncing active openings.",
    locationText: "Brigade Gateway Campus, Rajajinagar, Bengaluru",
    lat: 13.0125,
    lng: 77.554,
    locationConfidence: "exact_office",
    targetCount: "25+ companies",
  },
  {
    id: "radar:malleshwaram-sadashivanagar",
    name: "Malleshwaram - IISc Tech Nexus",
    shortTag: "MLM",
    description:
      "Historic deep tech, biotechnology, and academic spin-off corridor. Indexing verified scientific startups and research software firms.",
    locationText: "Margosa Road / CV Raman Road, Malleshwaram, Bengaluru",
    lat: 12.998,
    lng: 77.571,
    locationConfidence: "exact_office",
    targetCount: "20+ companies",
  },
  {
    id: "radar:peenya-industrial",
    name: "Peenya - Yeshwanthpur Industrial Tech Zone",
    shortTag: "PNYA",
    description:
      "One of Asia's largest industrial estates. Indexing IoT, robotics, hardware, and manufacturing tech companies in this sector.",
    locationText: "Tumkur Road, Peenya Industrial Area, Bengaluru",
    lat: 13.028,
    lng: 77.526,
    locationConfidence: "exact_office",
    targetCount: "35+ companies",
  },
  {
    id: "radar:jp-nagar-jayanagar",
    name: "JP Nagar & Jayanagar Startup Belt",
    shortTag: "JPN",
    description:
      "Key South Bengaluru consumer tech and SaaS corridor with thriving coworking hubs. Syncing hiring feeds for local startups.",
    locationText: "24th Main, JP Nagar / 4th Block Jayanagar, Bengaluru",
    lat: 12.912,
    lng: 77.587,
    locationConfidence: "exact_office",
    targetCount: "40+ companies",
  },
  {
    id: "radar:global-village-rr-nagar",
    name: "Global Village Tech Park (RR Nagar)",
    shortTag: "GVTP",
    description:
      "Major South-West tech park campus housing LTIMindtree, NTT Data, Mphasis, and enterprise tech employers. Career feeds currently syncing.",
    locationText: "Mysore Road, Rajarajeshwari Nagar, Bengaluru",
    lat: 12.921,
    lng: 77.502,
    locationConfidence: "exact_office",
    targetCount: "25+ companies",
  },
  {
    id: "radar:bannerghatta-tech",
    name: "Bannerghatta Road Tech Strip",
    shortTag: "BGH",
    description:
      "South Bengaluru enterprise corridor (Honeywell, Oracle, Accenture campus clusters). Automated systems are syncing open requisitions.",
    locationText: "Bannerghatta Main Road, Arekere / Hulimavu, Bengaluru",
    lat: 12.882,
    lng: 77.596,
    locationConfidence: "exact_office",
    targetCount: "30+ companies",
  },
  {
    id: "radar:sarjapur-carmelaram",
    name: "Sarjapur - Carmelaram Tech Corridor",
    shortTag: "SRJ",
    description:
      "Rapidly expanding tech corridor connecting ORR to Sarjapur (Wipro SEZ, tech parks). Indexing 25+ verified software companies.",
    locationText: "Sarjapur Main Road, Carmelaram, Bengaluru",
    lat: 12.906,
    lng: 77.705,
    locationConfidence: "exact_office",
    targetCount: "25+ companies",
  },
  {
    id: "radar:kalyan-nagar-hrbr",
    name: "Kalyan Nagar - HRBR Layout Tech Zone",
    shortTag: "KLN",
    description:
      "North-East emerging startup and creative tech cluster. System is discovering new ventures and syncing public hiring feeds.",
    locationText: "Kammanahalli Main Road, HRBR Layout, Bengaluru",
    lat: 13.023,
    lng: 77.644,
    locationConfidence: "exact_office",
    targetCount: "20+ companies",
  },
  {
    id: "radar:yelahanka-aerospace",
    name: "Yelahanka - North Tech Corridor",
    shortTag: "YLH",
    description:
      "Fast-growing North Bengaluru aerospace, aviation software, and tech hub. Actively resolving company career openings.",
    locationText: "Airport Road, Yelahanka New Town, Bengaluru",
    lat: 13.098,
    lng: 77.586,
    locationConfidence: "exact_office",
    targetCount: "20+ companies",
  },
  {
    id: "radar:whitefield-itpl-ext",
    name: "Whitefield ITPL & EPIP Extension",
    shortTag: "ITPL",
    description:
      "Eastern tech mega-cluster (Ascendas ITPL, SAP Labs, semiconductor firms). Actively indexing open roles across campus employers.",
    locationText: "ITPB Road, Whitefield, Bengaluru",
    lat: 12.987,
    lng: 77.747,
    locationConfidence: "exact_office",
    targetCount: "35+ companies",
  },
  {
    id: "radar:kengeri-rvce",
    name: "Kengeri - Mysore Road Innovation Zone",
    shortTag: "KNG",
    description:
      "South-West education and university startup incubator corridor. Indexing early-stage tech ventures and regional employers.",
    locationText: "Kengeri Satellite Town, Mysore Road, Bengaluru",
    lat: 12.924,
    lng: 77.488,
    locationConfidence: "exact_office",
    targetCount: "15+ companies",
  },
];

export function getCuratedRadarEntities(
  center: Coordinates,
  radiusKm: number,
): MapEntity[] {
  return bengaluruRadarZones
    .map((zone) => {
      const coords = { lat: zone.lat, lng: zone.lng };
      return {
        id: zone.id,
        type: "radar" as const,
        name: zone.name,
        description: zone.description,
        url: null,
        logoUrl: null,
        source: "NearHire Discovery",
        sourceUrl: null,
        locationText: zone.locationText,
        latitude: zone.lat,
        longitude: zone.lng,
        distanceKm: haversineKm(center, coords),
        locationConfidence: zone.locationConfidence,
        metadata: {
          shortTag: zone.shortTag,
          targetCount: zone.targetCount,
          refreshWindow: "18 hours",
        },
      };
    })
    .filter((entity) => (entity.distanceKm ?? 999) <= radiusKm)
    .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
}
