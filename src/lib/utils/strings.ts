import type { JobField } from "@/lib/types";

const LOCATION_WORDS =
  /\b(bengaluru|bangalore|mumbai|delhi|gurugram|gurgaon|hyderabad|pune|chennai|india|remote|hybrid|onsite|office|in|karnataka|maharashtra)\b/gi;

export function compact(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeKey(value: string): string {
  return compact(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, " ")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeTitle(title: string): string {
  return normalizeKey(title).replace(LOCATION_WORDS, "").replace(/\s+/g, " ").trim();
}

export function makeJobId(source: string, sourceKey: string, externalId: string): string {
  return `${source}:${sourceKey}:${externalId}`;
}

export function splitJobId(id: string): {
  provider: string;
  sourceKey: string;
  externalId: string;
} | null {
  const [provider, sourceKey, ...externalParts] = id.split(":");
  const externalId = externalParts.join(":");
  if (!provider || !sourceKey || !externalId) {
    return null;
  }
  return { provider, sourceKey, externalId };
}

export function displayField(field: JobField): string {
  const labels: Record<JobField, string> = {
    software: "Software",
    ai_ml: "AI/ML",
    finance: "Finance",
    marketing: "Marketing",
    design: "Design",
    operations: "Operations",
    sales: "Sales",
    product: "Product",
    other: "Other",
  };
  return labels[field];
}

export function toTitleCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function splitLocationCandidates(locationText: string): string[] {
  const normalized = locationText
    .replace(/\s*\|\s*/g, ";")
    .replace(/\s+or\s+/gi, ";")
    .replace(/\s+and\s+/gi, ";");

  const parts = normalized
    .split(";")
    .map(compact)
    .filter(Boolean);

  return parts.length > 0 ? [...new Set(parts)] : [compact(locationText)];
}
