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
    id: "radar:kothanur-hennur",
    name: "Kothanur - Hennur Growth Corridor",
    shortTag: "KTH",
    description:
      "North-East Bengaluru residential and startup-operator corridor. Scanning nearby SaaS, edtech, service, and internship-friendly employers.",
    locationText: "Kothanur, Hennur Main Road, North Bengaluru",
    lat: 13.0612,
    lng: 77.6521,
    locationConfidence: "exact_office",
    targetCount: "25+ companies",
  },
  {
    id: "radar:hennur-bagalur-road",
    name: "Hennur - Bagalur Road Startup Belt",
    shortTag: "HBR",
    description:
      "Emerging North Bengaluru corridor with coworking, services, product studios, and local tech teams being resolved into verified sources.",
    locationText: "Hennur Bagalur Road, Bengaluru",
    lat: 13.0775,
    lng: 77.6485,
    locationConfidence: "exact_office",
    targetCount: "20+ companies",
  },
  {
    id: "radar:thanisandra-bhartiya-city",
    name: "Thanisandra - Bhartiya City Business Hub",
    shortTag: "TDR",
    description:
      "North Bengaluru business district around Bhartiya City and Thanisandra. Indexing GCC, hospitality-tech, proptech, and startup event sources.",
    locationText: "Bhartiya City, Thanisandra Main Road, Bengaluru",
    lat: 13.0845,
    lng: 77.6428,
    locationConfidence: "exact_office",
    targetCount: "30+ companies",
  },
  {
    id: "radar:jakkur-sahakara",
    name: "Jakkur - Sahakara Nagar Tech Cluster",
    shortTag: "JAK",
    description:
      "North Bengaluru startup and aerospace-adjacent hiring pocket. Crawlers are checking local company sites and ATS feeds.",
    locationText: "Jakkur, Sahakara Nagar, Bengaluru",
    lat: 13.0755,
    lng: 77.6048,
    locationConfidence: "exact_office",
    targetCount: "18+ companies",
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
    id: "radar:yelahanka-new-town",
    name: "Yelahanka New Town Hiring Pocket",
    shortTag: "YLN",
    description:
      "North Bengaluru office and industrial support zone. Syncing product, analytics, operations, and embedded-tech career pages.",
    locationText: "Yelahanka New Town, Bengaluru",
    lat: 13.1007,
    lng: 77.5963,
    locationConfidence: "exact_office",
    targetCount: "22+ companies",
  },
  {
    id: "radar:bagalur-aerospace-park",
    name: "Bagalur Aerospace Park",
    shortTag: "BGL",
    description:
      "Aerospace, EV, manufacturing, and engineering campus belt near KIADB Aerospace Park. Resolving direct employer job feeds.",
    locationText: "Bagalur / KIADB Aerospace Park, North Bengaluru",
    lat: 13.1945,
    lng: 77.6838,
    locationConfidence: "exact_office",
    targetCount: "35+ companies",
  },
  {
    id: "radar:airport-city-devanahalli",
    name: "Airport City - Devanahalli Business Zone",
    shortTag: "AIR",
    description:
      "Airport-side logistics, enterprise, travel-tech, and business park corridor. Discovery jobs are being reconciled against ATS feeds.",
    locationText: "Kempegowda Airport / Devanahalli Business Zone, Bengaluru",
    lat: 13.1994,
    lng: 77.7102,
    locationConfidence: "exact_office",
    targetCount: "30+ companies",
  },
  {
    id: "radar:devanahalli-nandi",
    name: "Devanahalli - Nandi Tech Expansion",
    shortTag: "DVH",
    description:
      "Outer North Bengaluru expansion belt with industrial, logistics, and aviation-adjacent hiring sources under indexing.",
    locationText: "Devanahalli, North Bengaluru",
    lat: 13.2466,
    lng: 77.7136,
    locationConfidence: "exact_office",
    targetCount: "20+ companies",
  },
  {
    id: "radar:doddaballapura-industrial",
    name: "Doddaballapura Industrial Tech Belt",
    shortTag: "DBP",
    description:
      "North-West industrial and electronics manufacturing corridor. Scanning employer pages for technician, engineering, and operations roles.",
    locationText: "Doddaballapura Industrial Area, Bengaluru Rural",
    lat: 13.2918,
    lng: 77.5370,
    locationConfidence: "exact_office",
    targetCount: "20+ companies",
  },
  {
    id: "radar:horamavu-ramamurthy",
    name: "Horamavu - Ramamurthy Nagar Tech Pocket",
    shortTag: "HRM",
    description:
      "East-North Bengaluru neighborhood cluster with agencies, product studios, and local startups being mapped into source feeds.",
    locationText: "Horamavu / Ramamurthy Nagar, Bengaluru",
    lat: 13.0270,
    lng: 77.6675,
    locationConfidence: "exact_office",
    targetCount: "18+ companies",
  },
  {
    id: "radar:kr-puram-tc-palya",
    name: "KR Puram - TC Palya Startup Services Belt",
    shortTag: "KRP",
    description:
      "East Bengaluru corridor between KR Puram and TC Palya. Indexing software services, analytics, and internship-friendly local employers.",
    locationText: "KR Puram / TC Palya, Bengaluru",
    lat: 13.0164,
    lng: 77.7037,
    locationConfidence: "exact_office",
    targetCount: "22+ companies",
  },
  {
    id: "radar:kadugodi-seegehalli",
    name: "Kadugodi - Seegehalli Hiring Zone",
    shortTag: "KDG",
    description:
      "Whitefield edge corridor with product, support, cloud, and business operations employers. ATS discovery is running for this pocket.",
    locationText: "Kadugodi / Seegehalli, East Bengaluru",
    lat: 13.0040,
    lng: 77.7610,
    locationConfidence: "exact_office",
    targetCount: "24+ companies",
  },
  {
    id: "radar:budigere-cross",
    name: "Budigere Cross Logistics-Tech Belt",
    shortTag: "BDG",
    description:
      "East-North logistics, warehouse-tech, and ops hiring corridor. Mapping local companies and active internship sources.",
    locationText: "Budigere Cross, Bengaluru",
    lat: 13.0678,
    lng: 77.7462,
    locationConfidence: "exact_office",
    targetCount: "25+ companies",
  },
  {
    id: "radar:hoskote-industrial",
    name: "Hoskote Industrial Hiring Belt",
    shortTag: "HSK",
    description:
      "Manufacturing, EV supply chain, logistics, and industrial software corridor. Scanning verified employer pages and ATS boards.",
    locationText: "Hoskote Industrial Area, Bengaluru Rural",
    lat: 13.0730,
    lng: 77.7980,
    locationConfidence: "exact_office",
    targetCount: "35+ companies",
  },
  {
    id: "radar:hoskote-old-madras-road",
    name: "Old Madras Road - Hoskote Tech-Ops Strip",
    shortTag: "OMR",
    description:
      "Outer East Bengaluru strip with operations, logistics, field-tech, and regional software employers being indexed.",
    locationText: "Old Madras Road, Hoskote, Bengaluru Rural",
    lat: 13.0355,
    lng: 77.7855,
    locationConfidence: "exact_office",
    targetCount: "28+ companies",
  },
  {
    id: "radar:narsapura-industrial",
    name: "Narsapura EV & Manufacturing Cluster",
    shortTag: "NSP",
    description:
      "EV, electronics, automotive, and manufacturing supplier cluster east of Bengaluru. Direct job-source discovery is active here.",
    locationText: "Narsapura Industrial Area, Bengaluru-Kolar Road",
    lat: 13.1528,
    lng: 77.8665,
    locationConfidence: "exact_office",
    targetCount: "40+ companies",
  },
  {
    id: "radar:malur-road-industrial",
    name: "Malur Road Industrial Startup Belt",
    shortTag: "MLR",
    description:
      "Outer East hardware, manufacturing-tech, logistics, and operations hiring corridor. Indexing regional company sources.",
    locationText: "Malur Road Industrial Belt, East Bengaluru",
    lat: 13.0068,
    lng: 77.8745,
    locationConfidence: "exact_office",
    targetCount: "22+ companies",
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
    id: "radar:varthur-gunjur",
    name: "Varthur - Gunjur Product Corridor",
    shortTag: "VTR",
    description:
      "Whitefield-to-Sarjapur edge corridor with SaaS, analytics, education, and remote-first teams being checked for local openings.",
    locationText: "Varthur / Gunjur, East Bengaluru",
    lat: 12.9405,
    lng: 77.7468,
    locationConfidence: "exact_office",
    targetCount: "25+ companies",
  },
  {
    id: "radar:mahadevapura-bagmane",
    name: "Mahadevapura - Bagmane Edge Cluster",
    shortTag: "MDP",
    description:
      "Enterprise software and semiconductor corridor around Mahadevapura and Bagmane edge campuses. Crawling live career boards.",
    locationText: "Mahadevapura, East Bengaluru",
    lat: 12.9908,
    lng: 77.6951,
    locationConfidence: "exact_office",
    targetCount: "30+ companies",
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
        source: "Hemlo Discovery",
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
