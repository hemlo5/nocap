import type { Coordinates, MapEntity } from "@/lib/types";
import { haversineKm } from "@/lib/utils/distance";

type EventVenueSeed = {
  id: string;
  name: string;
  description: string;
  website: string;
  locationText: string;
  lat: number;
  lng: number;
};

const eventVenues: EventVenueSeed[] = [
  {
    id: "event:bic",
    name: "Bangalore International Centre",
    description: "Talks, founder meetups, design, policy, and technology events.",
    website: "https://bangaloreinternationalcentre.org",
    locationText: "Bangalore International Centre, Domlur, Bengaluru, Karnataka, India",
    lat: 12.9625,
    lng: 77.6384,
  },
  {
    id: "event:ktpo",
    name: "KTPO Trade Centre",
    description: "Large expo and technology event venue in Whitefield.",
    website: "https://www.ktpo.org",
    locationText: "KTPO Trade Centre, Whitefield, Bengaluru, Karnataka, India",
    lat: 12.9792,
    lng: 77.7242,
  },
  {
    id: "event:biec",
    name: "Bangalore International Exhibition Centre",
    description: "Major exhibition and conference venue for enterprise and tech events.",
    website: "https://www.biec.in",
    locationText: "BIEC, Tumkur Road, Bengaluru, Karnataka, India",
    lat: 13.0626,
    lng: 77.4757,
  },
  {
    id: "event:nimhans-convention",
    name: "NIMHANS Convention Centre",
    description: "Conference venue used for large education, healthcare, and technology gatherings.",
    website: "https://nimhans.ac.in",
    locationText: "NIMHANS Convention Centre, Hosur Road, Bengaluru, Karnataka, India",
    lat: 12.9437,
    lng: 77.5950,
  },
  {
    id: "event:sheraton-grand",
    name: "Sheraton Grand Bangalore",
    description: "Business conference venue beside World Trade Center Bengaluru.",
    website: "https://www.marriott.com",
    locationText: "Sheraton Grand Bangalore, Brigade Gateway, Rajajinagar, Bengaluru, Karnataka, India",
    lat: 13.0129,
    lng: 77.5552,
  },
  {
    id: "event:wtc-bengaluru",
    name: "World Trade Center Bengaluru",
    description: "Corporate events, GCC gatherings, investor sessions, and startup meetups.",
    website: "https://www.wtcbengaluru.org",
    locationText: "World Trade Center Bengaluru, Brigade Gateway, Bengaluru, Karnataka, India",
    lat: 13.0123,
    lng: 77.5550,
  },
  {
    id: "event:the-leela-bhartiya",
    name: "The Leela Bhartiya City",
    description: "North Bengaluru business summit and founder-event venue.",
    website: "https://www.theleela.com",
    locationText: "The Leela Bhartiya City, Thanisandra Main Road, Bengaluru, Karnataka, India",
    lat: 13.0845,
    lng: 77.6428,
  },
  {
    id: "event:wework-galaxy",
    name: "WeWork Galaxy",
    description: "Startup meetups, product sessions, and community events.",
    website: "https://www.wework.com",
    locationText: "WeWork Galaxy, Residency Road, Bengaluru, Karnataka, India",
    lat: 12.9715,
    lng: 77.6081,
  },
  {
    id: "event:91springboard-koramangala",
    name: "91Springboard Koramangala",
    description: "Coworking and startup community event hub.",
    website: "https://www.91springboard.com",
    locationText: "91Springboard, Koramangala, Bengaluru, Karnataka, India",
    lat: 12.9352,
    lng: 77.6245,
  },
  {
    id: "event:bhive-hsr",
    name: "BHIVE HSR",
    description: "Startup, operator, and investor meetup venue.",
    website: "https://bhiveworkspace.com",
    locationText: "BHIVE Workspace, HSR Layout, Bengaluru, Karnataka, India",
    lat: 12.9121,
    lng: 77.6446,
  },
  {
    id: "event:church-street-social",
    name: "Church Street Social",
    description: "Community meetup and startup social venue.",
    website: "https://socialoffline.in",
    locationText: "Church Street Social, Bengaluru, Karnataka, India",
    lat: 12.9751,
    lng: 77.6047,
  },
  {
    id: "event:iimb",
    name: "IIM Bangalore",
    description: "Entrepreneurship, product, and investor events around NSRCEL.",
    website: "https://www.iimb.ac.in",
    locationText: "IIM Bangalore, Bannerghatta Road, Bengaluru, Karnataka, India",
    lat: 12.8956,
    lng: 77.6026,
  },
  {
    id: "event:iisc",
    name: "Indian Institute of Science",
    description: "Deep-tech, research, startup, and innovation events.",
    website: "https://iisc.ac.in",
    locationText: "Indian Institute of Science, Bengaluru, Karnataka, India",
    lat: 13.0219,
    lng: 77.5671,
  },
  {
    id: "event:iiitb",
    name: "IIIT Bangalore",
    description: "Student startup, AI, engineering, and hiring events.",
    website: "https://www.iiitb.ac.in",
    locationText: "IIIT Bangalore, Electronic City, Bengaluru, Karnataka, India",
    lat: 12.8449,
    lng: 77.6632,
  },
  {
    id: "event:microsoft-reactor-blr",
    name: "Microsoft Reactor Bengaluru",
    description: "Developer and startup programming venue.",
    website: "https://developer.microsoft.com/reactor",
    locationText: "Microsoft Reactor, Bengaluru, Karnataka, India",
    lat: 12.9784,
    lng: 77.6408,
  },
];

export function getCuratedEventEntities(
  center: Coordinates,
  radiusKm: number,
): MapEntity[] {
  return eventVenues
    .map((venue) => {
      const coords = { lat: venue.lat, lng: venue.lng };
      return {
        id: venue.id,
        type: "event" as const,
        name: venue.name,
        description: venue.description,
        url: venue.website,
        logoUrl: faviconUrl(venue.website),
        source: "NearHire Event Venue Registry",
        sourceUrl: venue.website,
        locationText: venue.locationText,
        latitude: venue.lat,
        longitude: venue.lng,
        distanceKm: haversineKm(center, coords),
        locationConfidence: "exact_office" as const,
        metadata: { category: "event_venue" },
      };
    })
    .filter((entity) => (entity.distanceKm ?? Number.POSITIVE_INFINITY) <= radiusKm)
    .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
}

function faviconUrl(website: string): string {
  const { hostname } = new URL(website);
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`;
}
