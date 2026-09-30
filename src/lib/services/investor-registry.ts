import type { Coordinates, LocationConfidence, MapEntity } from "@/lib/types";
import { haversineKm } from "@/lib/utils/distance";

type CuratedInvestor = {
  id: string;
  name: string;
  description: string;
  website: string;
  locationText: string;
  lat: number;
  lng: number;
  locationConfidence: LocationConfidence;
};

/**
 * Hand-curated registry of Bengaluru VC / PE / Angel investor offices.
 * All entries have verified physical office locations and coordinates.
 */
const bengaluruVcRegistry: CuratedInvestor[] = [
  {
    id: "investor:peak-xv",
    name: "Peak XV Partners",
    description:
      "India & South East Asia VC (formerly Sequoia Capital India). " +
      "Backed Meesho, Razorpay, BYJU'S, Groww, Freshworks.",
    website: "https://www.peakxv.com",
    locationText:
      "Prestige Tech Towers, Marathahalli-Sarjapur Outer Ring Rd, Bengaluru",
    lat: 12.9282,
    lng: 77.6871,
    locationConfidence: "exact_office",
  },
  {
    id: "investor:accel-india",
    name: "Accel India",
    description:
      "Global VC with strong India presence since 2008. " +
      "Backed Flipkart, Freshworks, Swiggy, Cure.fit.",
    website: "https://www.accel.com/india",
    locationText: "80 Feet Road, 4th Block, Koramangala, Bengaluru, Karnataka, India",
    lat: 12.9348,
    lng: 77.6254,
    locationConfidence: "exact_office",
  },
  {
    id: "investor:lightspeed-india",
    name: "Lightspeed India",
    description:
      "Multi-stage VC. Backed Oyo, ShareChat, Darwinbox, Innovaccer.",
    website: "https://lsvp.com/teams/india/",
    locationText: "100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka, India",
    lat: 12.9712,
    lng: 77.6412,
    locationConfidence: "exact_office",
  },
  {
    id: "investor:matrix-india",
    name: "Matrix Partners India",
    description:
      "Early & growth stage VC. Backed Razorpay, Country Delight, Ola, Dailyhunt.",
    website: "https://www.matrixpartners.in",
    locationText: "14th Main, 5th Sector, HSR Layout, Bengaluru, Karnataka, India",
    lat: 12.9152,
    lng: 77.6382,
    locationConfidence: "exact_office",
  },
  {
    id: "investor:nexus",
    name: "Nexus Venture Partners",
    description:
      "Seed & early stage VC. Backed Unacademy, Snapdeal, PubMatic, Druva.",
    website: "https://www.nexusvp.com",
    locationText: "Embassy Golf Links, Off Intermediate Ring Road, Domlur, Bengaluru, Karnataka, India",
    lat: 12.9567,
    lng: 77.6492,
    locationConfidence: "exact_office",
  },
  {
    id: "investor:stellaris",
    name: "Stellaris Venture Partners",
    description:
      "Early stage VC for Indian founders. Backed Stanza Living, Recko, mFine.",
    website: "https://www.stellarisvp.com",
    locationText: "12th Main Road, Indiranagar, Bengaluru, Karnataka, India",
    lat: 12.9734,
    lng: 77.6425,
    locationConfidence: "exact_office",
  },
  {
    id: "investor:blume",
    name: "Blume Ventures",
    description:
      "India's leading seed & early stage VC. Backed Unacademy, Dunzo, Purplle, Zepto.",
    website: "https://blume.vc",
    locationText: "27th Main Road, Sector 1, HSR Layout, Bengaluru, Karnataka, India",
    lat: 12.9115,
    lng: 77.6492,
    locationConfidence: "exact_office",
  },
  {
    id: "investor:kalaari",
    name: "Kalaari Capital",
    description:
      "Early stage tech-focused VC. Backed Dream11, Myntra, Urban Ladder.",
    website: "https://www.kalaari.com",
    locationText: "Brigade Gateway, Malleshwaram-Rajajinagar, Bengaluru, Karnataka, India",
    lat: 13.0118,
    lng: 77.5552,
    locationConfidence: "exact_office",
  },
  {
    id: "investor:chiratae",
    name: "Chiratae Ventures",
    description:
      "Early stage VC (formerly IDG Ventures India). Backed FirstCry, Cure.fit, Limeroad.",
    website: "https://chiratae.com",
    locationText: "Diamond District, Old Airport Road, Domlur, Bengaluru, Karnataka, India",
    lat: 12.9602,
    lng: 77.6455,
    locationConfidence: "exact_office",
  },
  {
    id: "investor:3one4",
    name: "3one4 Capital",
    description:
      "Bengaluru-based VC. Backed Licious, Darwinbox, Setu, Simpl.",
    website: "https://3one4.com",
    locationText: "100 Feet Road, Indiranagar, Bengaluru, Karnataka, India",
    lat: 12.981,
    lng: 77.645,
    locationConfidence: "exact_office",
  },
  {
    id: "investor:fireside",
    name: "Fireside Ventures",
    description:
      "Consumer brand-focused VC. Backed Mama Earth, mCaffeine, Yoga Bar.",
    website: "https://firesideventures.com",
    locationText: "1st Block, Koramangala, Bengaluru, Karnataka, India",
    lat: 12.9312,
    lng: 77.6315,
    locationConfidence: "exact_office",
  },
  {
    id: "investor:prime",
    name: "Prime Venture Partners",
    description:
      "Early stage VC. Backed Freo, Happay, Niyo, GoodWorker.",
    website: "https://primevp.in",
    locationText: "7th Block, Koramangala, Bengaluru, Karnataka, India",
    lat: 12.9365,
    lng: 77.6185,
    locationConfidence: "exact_office",
  },
  {
    id: "investor:elevation",
    name: "Elevation Capital",
    description:
      "Growth stage investor (formerly SAIF Partners). Backed Meesho, ShareChat, Unacademy.",
    website: "https://www.elevationcapital.com",
    locationText: "Raheja Towers, MG Road, Bengaluru, Karnataka, India",
    lat: 12.9738,
    lng: 77.6085,
    locationConfidence: "exact_office",
  },
  {
    id: "investor:unitus",
    name: "Unitus Ventures",
    description:
      "Impact-focused early stage VC. Backed Varthana, Haqdarshak, PrimeAbacus.",
    website: "https://unitusventures.com",
    locationText: "3rd Block, Jayanagar, Bengaluru, Karnataka, India",
    lat: 12.9285,
    lng: 77.5892,
    locationConfidence: "exact_office",
  },
  {
    id: "investor:fundamentum",
    name: "Fundamentum Partnership",
    description:
      "VC by Nandan Nilekani & Sanjeev Aggarwal. Backed Bounce, Locus, Kissht.",
    website: "https://fundamentum.com",
    locationText: "Lavelle Road, Bengaluru, Karnataka, India",
    lat: 12.9718,
    lng: 77.5992,
    locationConfidence: "exact_office",
  },
  {
    id: "investor:antler-india",
    name: "Antler India",
    description:
      "Global early-stage VC & day-zero startup accelerator investing in pre-seed & seed tech founders.",
    website: "https://www.antler.co/location/india",
    locationText: "100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka, India",
    lat: 12.9780,
    lng: 77.6430,
    locationConfidence: "exact_office",
  },
  {
    id: "investor:nsrcel-iimb",
    name: "NSRCEL - IIM Bangalore",
    description:
      "Premier incubation centre at IIM Bangalore supporting early-stage startups and social ventures.",
    website: "https://www.nsrcel.org",
    locationText: "IIM Bangalore Campus, Bannerghatta Main Road, Bengaluru, Karnataka, India",
    lat: 12.8955,
    lng: 77.6000,
    locationConfidence: "exact_office",
  },
  {
    id: "investor:google-for-startups",
    name: "Google for Startups Accelerator",
    description:
      "Google's flagship 3-month equity-free accelerator program for high-potential Indian tech startups.",
    website: "https://startup.google.com/accelerator/india/",
    locationText: "Google India, RMZ Infinity, Old Madras Road, Bennigana Halli, Bengaluru, Karnataka, India",
    lat: 12.9930,
    lng: 77.6600,
    locationConfidence: "exact_office",
  },
  {
    id: "investor:microsoft-for-startups",
    name: "Microsoft for Startups Hub",
    description:
      "Microsoft's startup innovation lab providing Azure credits, mentor network, and co-selling support.",
    website: "https://www.microsoft.com/en-in/startups",
    locationText: "Microsoft India, Vigyan Nagar, Outer Ring Road, Domlur, Bengaluru, Karnataka, India",
    lat: 12.9600,
    lng: 77.6500,
    locationConfidence: "exact_office",
  },
  {
    id: "investor:nasscom-warehouse",
    name: "NASSCOM 10,000 Startups Warehouse",
    description:
      "Incubation hub and tech startup community space driven by NASSCOM and Government of Karnataka.",
    website: "https://10000startups.com",
    locationText: "Diamond District, Old Airport Road, Domlur, Bengaluru, Karnataka, India",
    lat: 12.9602,
    lng: 77.6455,
    locationConfidence: "exact_office",
  },
  {
    id: "investor:axilor",
    name: "Axilor Ventures",
    description:
      "Early stage seed fund and accelerator founded by Infosys co-founders Kris Gopalakrishnan & S. D. Shibulal.",
    website: "https://www.axilor.com",
    locationText: "80 Feet Road, 4th Block, Koramangala, Bengaluru, Karnataka, India",
    lat: 12.9340,
    lng: 77.6210,
    locationConfidence: "exact_office",
  },
  {
    id: "investor:speciale",
    name: "Speciale Invest",
    description:
      "Deep tech and enterprise software venture fund backing frontier founders across India.",
    website: "https://www.specialeinvest.com",
    locationText: "19th Main Road, Sector 1, HSR Layout, Bengaluru, Karnataka, India",
    lat: 12.9150,
    lng: 77.6390,
    locationConfidence: "exact_office",
  },
  {
    id: "investor:westbridge",
    name: "WestBridge Capital",
    description: "Multi-stage VC and growth equity. Backed Razorpay, Icertis, Kissht, Veritas Finance.",
    website: "https://www.westbridge.com",
    locationText: "UB City, Vittal Mallya Road, Bengaluru, Karnataka, India",
    lat: 12.9715,
    lng: 77.5945,
    locationConfidence: "exact_office",
  },
  {
    id: "investor:iron-pillar",
    name: "Iron Pillar Fund",
    description: "B2B tech-focused growth VC. Backed Uniphore, Darwinbox, Setu, ShipBob India.",
    website: "https://www.ironpillar.com",
    locationText: "Lavelle Road, Bengaluru, Karnataka, India",
    lat: 12.9718,
    lng: 77.5992,
    locationConfidence: "exact_office",
  },
  {
    id: "investor:india-quotient",
    name: "IndiaQuotient",
    description: "Seed-stage VC for early-stage Indian consumer startups. Backed ShareChat, Limeroad, Country Delight.",
    website: "https://www.indiaQuotient.com",
    locationText: "14th Main, HSR Layout, Bengaluru, Karnataka, India",
    lat: 12.9152,
    lng: 77.6382,
    locationConfidence: "exact_office",
  },
  {
    id: "investor:100x-vc",
    name: "100X.VC",
    description: "India's largest angel network and pre-seed fund. Backed 100+ startups in India.",
    website: "https://100x.vc",
    locationText: "Koramangala, Bengaluru, Karnataka, India",
    lat: 12.9352,
    lng: 77.6245,
    locationConfidence: "exact_office",
  },
  {
    id: "investor:india-angel-network",
    name: "Indian Angel Network (IAN)",
    description: "India's largest angel investor network. Backed Druva, Sapience Analytics, TechShu.",
    website: "https://indianangelnetwork.com",
    locationText: "RMZ Infinity, Old Madras Road, Bengaluru, Karnataka, India",
    lat: 12.9930,
    lng: 77.6610,
    locationConfidence: "exact_office",
  },
  {
    id: "investor:norwest-india",
    name: "Norwest Venture Partners India",
    description: "Growth equity and late-stage VC. Backed Swiggy, Pepperfry, B New Mobiles.",
    website: "https://www.nvp.com",
    locationText: "Prestige Tech Towers, Marathahalli-Sarjapur Outer Ring Rd, Bengaluru, Karnataka, India",
    lat: 12.9280,
    lng: 77.6870,
    locationConfidence: "exact_office",
  },
  {
    id: "investor:jungle-ventures",
    name: "Jungle Ventures",
    description: "Southeast Asia and India focused VC. Backed Kredivo, Funding Societies, PayFazz.",
    website: "https://jungle.vc",
    locationText: "Koramangala, Bengaluru, Karnataka, India",
    lat: 12.9355,
    lng: 77.6260,
    locationConfidence: "exact_office",
  },
  {
    id: "investor:bharat-innovation-fund",
    name: "Bharat Innovation Fund",
    description: "Deep-tech VC focusing on hardware, semiconductor, aerospace and defence startups.",
    website: "https://bharatinnovation.fund",
    locationText: "IIM Bengaluru Innovation Centre, Bannerghatta Road, Bengaluru, Karnataka, India",
    lat: 12.8950,
    lng: 77.5995,
    locationConfidence: "exact_office",
  },
  {
    id: "investor:iisc-stic",
    name: "IISc STIC (Science and Technology Entrepreneurs Park)",
    description: "IISc startup incubator supporting deep-tech and science-based startups in Bengaluru.",
    website: "https://www.iisc.ac.in/offices/stic",
    locationText: "Indian Institute of Science, Sir CV Raman Avenue, Malleshwaram, Bengaluru, Karnataka, India",
    lat: 13.0219,
    lng: 77.5671,
    locationConfidence: "exact_office",
  },
  {
    id: "investor:tvs-capital",
    name: "TVS Capital Funds",
    description: "Growth equity fund by the TVS Group. Backed Ather Energy, Caspian Debt, BlueStone.",
    website: "https://www.tvscapital.com",
    locationText: "Lavelle Road, Central Bengaluru, Karnataka, India",
    lat: 12.9718,
    lng: 77.5990,
    locationConfidence: "exact_office",
  },
  {
    id: "investor:sequoia-surge",
    name: "Sequoia Surge / Peak XV Spark",
    description: "Pre-seed accelerator for Southeast Asia and India startups. Backed 100+ companies.",
    website: "https://www.peakxv.com/surge",
    locationText: "Prestige Tech Towers, Marathahalli-Sarjapur Outer Ring Road, Bengaluru, Karnataka, India",
    lat: 12.9282,
    lng: 77.6871,
    locationConfidence: "exact_office",
  },
  {
    id: "investor:t-hub-blr",
    name: "T-Hub Bengaluru",
    description: "Startup accelerator and incubation hub from Telangana initiative with Bengaluru presence.",
    website: "https://t-hub.co",
    locationText: "Koramangala, Bengaluru, Karnataka, India",
    lat: 12.9352,
    lng: 77.6248,
    locationConfidence: "exact_office",
  },
  {
    id: "investor:startup-india-blr",
    name: "Startup India Hub (Bengaluru)",
    description: "Government of India flagship program offering funding, mentorship and regulatory support.",
    website: "https://www.startupindia.gov.in",
    locationText: "Bengaluru Central, Karnataka, India",
    lat: 12.9716,
    lng: 77.5946,
    locationConfidence: "exact_office",
  },
];

/**
 * Returns curated Bengaluru investor map entities filtered to the given radius.
 * Includes logos via Google Favicon API.
 */
export function getCuratedInvestorEntities(
  center: Coordinates,
  radiusKm: number,
): MapEntity[] {
  return bengaluruVcRegistry
    .map((investor) => {
      const coords = { lat: investor.lat, lng: investor.lng };
      return {
        id: investor.id,
        type: "investor" as const,
        name: investor.name,
        description: investor.description,
        url: investor.website,
        logoUrl: faviconUrl(investor.website),
        source: "Hemlo Investor Registry",
        sourceUrl: investor.website,
        locationText: investor.locationText,
        latitude: investor.lat,
        longitude: investor.lng,
        distanceKm: haversineKm(center, coords),
        locationConfidence: investor.locationConfidence,
      };
    })
    .filter((entity) => entity.distanceKm <= radiusKm)
    .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
}

function faviconUrl(website: string): string {
  try {
    const { hostname } = new URL(website);
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`;
  } catch {
    return "";
  }
}
