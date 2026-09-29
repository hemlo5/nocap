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
};

export function normalizeLocation(raw: string): NormalizedLocation {
  const normalized = normalizeKey(raw);
  const area = findBengaluruArea(normalized);
  const hasIndia = /\b(india|in|bharat)\b/.test(normalized);

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
