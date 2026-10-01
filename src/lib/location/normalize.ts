import { normalizeKey } from "@/lib/utils/strings";

export type NormalizedLocation = {
  raw: string;
  normalized: string;
  city?: string;
  state?: string;
  country?: string;
  area?: string;
  isBengaluruArea: boolean;
  isRemote: boolean;
};

const bengaluruAreas: Record<string, string> = {
  blr: "Bengaluru",
  bangalore: "Bengaluru",
  bengaluru: "Bengaluru",
  koramangala: "Koramangala",
  "hsr layout": "HSR Layout",
  hsr: "HSR Layout",
  indiranagar: "Indiranagar",
  whitefield: "Whitefield",
  "electronic city": "Electronic City",
  electronicscity: "Electronic City",
  bellandur: "Bellandur",
  marathahalli: "Marathahalli",
  sarjapur: "Sarjapur",
  "outer ring road": "Outer Ring Road",
  orr: "Outer Ring Road",
  manyata: "Manyata Tech Park",
  "manyata tech park": "Manyata Tech Park",
  hebbal: "Hebbal",
  yemalur: "Yemalur",
  domlur: "Domlur",
  kadubeesanahalli: "Kadubeesanahalli",
  btm: "BTM Layout",
  "btm layout": "BTM Layout",
  "jp nagar": "JP Nagar",
  jayanagar: "Jayanagar",
  rajajinagar: "Rajajinagar",
  malleswaram: "Malleswaram",
  yeshwanthpur: "Yeshwanthpur",
  peenya: "Peenya",
  bannerghatta: "Bannerghatta Road",
  "bagmane tech park": "Bagmane Tech Park",
  bagmane: "Bagmane Tech Park",
  ecospace: "RMZ Ecospace",
  cessna: "Cessna Business Park",
  itpl: "ITPL Whitefield",
};

export function isNonBengaluruLocation(locationText?: string | null): boolean {
  if (!locationText) return false;
  const loc = locationText.toLowerCase();

  // 1. If it mentions Bengaluru / Bangalore / local tech hubs, it IS Bengaluru
  const blrPattern =
    /\b(bengaluru|bangalore|blr|koramangala|hsr|indiranagar|whitefield|bellandur|marathahalli|hebbal|manyata|electronic city|electronicscity|sarjapur|kadubeesanahalli|domlur|yemalur|btm|jp nagar|jayanagar|rajajinagar|malleswaram|yeshwanthpur|peenya|bannerghatta|bagmane|ecospace|cessna|itpl|outer ring road|orr)\b/;
  if (blrPattern.test(loc)) {
    return false;
  }

  // 2. Explicit foreign countries, cities, states, regions
  const foreignPattern =
    /\b(united states|usa|u\.s\.a?|u\.s\.|us|canada|toronto|vancouver|montreal|ontario|quebec|ottawa|calgary|waterloo|france|paris|lyon|united kingdom|uk|london|manchester|birmingham|edinburgh|ireland|dublin|germany|berlin|munich|frankfurt|hamburg|australia|sydney|melbourne|brisbane|perth|netherlands|amsterdam|rotterdam|singapore|dubai|uae|united arab emirates|abu dhabi|saudi arabia|riyadh|japan|tokyo|south korea|seoul|taiwan|taipei|hong kong|china|beijing|shanghai|spain|madrid|barcelona|poland|warsaw|krakow|brazil|sao paulo|israel|tel aviv|sweden|stockholm|switzerland|zurich|geneva|norway|oslo|denmark|copenhagen|finland|helsinki|austria|vienna|belgium|brussels|portugal|lisbon|czech|prague|italy|milan|rome|mexico|mexico city|argentina|buenos aires|chile|colombia|bogota|new zealand|auckland|south africa|nigeria|kenya|egypt|san francisco|bay area|new york|nyc|seattle|austin|chicago|los angeles|boston|denver|atlanta|san jose|san diego|dallas|houston|phoenix|philadelphia|washington|portland|salt lake city|miami|raleigh|sunnyvale|mountain view|palo alto|redwood city|menlo park|santa clara|cupertino|california|texas|washington|massachusetts|emea|latam)\b/;

  if (foreignPattern.test(loc) && !/\b(india|bharat)\b/.test(loc)) {
    return true;
  }

  // 3. Other major Indian cities
  const otherIndiaPattern =
    /\b(mumbai|delhi|new delhi|ncr|gurugram|gurgaon|noida|hyderabad|chennai|pune|kolkata|ahmedabad|jaipur|chandigarh|kochi|cochin|trivandrum|thiruvananthapuram|indore|bhopal|coimbatore|surat|vadodara|lucknow|bhubaneswar)\b/;

  if (otherIndiaPattern.test(loc)) {
    return true;
  }

  return false;
}

export function normalizeLocation(raw: string): NormalizedLocation {
  const normalized = normalizeKey(raw);
  const area = findBengaluruArea(normalized);
  const hasIndia =
    /\b(india|bharat)\b/.test(normalized) || /,\s*in\b/i.test(raw);

  return {
    raw,
    normalized,
    city: area ? "Bengaluru" : undefined,
    state: area || /\b(karnataka|ka)\b/.test(normalized) ? "Karnataka" : undefined,
    country: area || hasIndia ? "India" : undefined,
    area,
    isBengaluruArea: Boolean(area),
    isRemote: /\b(remote|work from home|wfh|distributed)\b/.test(normalized),
  };
}

function findBengaluruArea(normalized: string): string | undefined {
  for (const [needle, area] of Object.entries(bengaluruAreas)) {
    if (new RegExp(`\\b${escapeRegExp(needle)}\\b`).test(normalized)) {
      return area;
    }
  }
  return undefined;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
