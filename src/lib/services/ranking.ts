import type { NearbyJobsQuery, NormalizedJob } from "@/lib/types";
import { normalizeKey } from "@/lib/utils/strings";

const DAY_MS = 1000 * 60 * 60 * 24;

export function scoreJob(job: NormalizedJob, query: NearbyJobsQuery): number {
  const hasPin = hasMapPin(job);
  const distanceScore =
    job.workMode === "remote"
      ? hasPin
        ? 0.36
        : 0.08
      : Math.max(0, 1 - (job.distanceKm ?? query.radius) / query.radius);
  const relevance = relevanceScore(job, query.query);
  const freshness = freshnessScore(job.postedAt);
  const verification =
    job.verificationStatus === "VERIFIED"
      ? 1
      : job.verificationStatus === "RECENTLY_VERIFIED"
        ? 0.92
        : 0.2;
  const company = Math.min(1, job.sourceRank / 100);
  const compensation = job.salary.min || job.salary.max ? 1 : 0.2;
  const mapConfidence = hasPin ? 1 : 0.12;
  const startupFit = !query.startupOnly || job.startup?.isStartup ? 1 : 0;
  const studentFit =
    !query.studentRelevantOnly || job.studentRelevant || job.employmentType === "internship"
      ? 1
      : 0.2;
  const roleFit =
    !query.startupRoleType ||
    query.startupRoleType === "all" ||
    query.startupRoleType === job.startupRoleType
      ? 1
      : 0.4;

  return (
    distanceScore * 0.28 +
    relevance * 0.23 +
    freshness * 0.13 +
    verification * 0.12 +
    company * 0.07 +
    mapConfidence * 0.05 +
    compensation * 0.02 +
    startupFit * 0.05 +
    studentFit * 0.03 +
    roleFit * 0.02
  );
}

function hasMapPin(job: NormalizedJob): boolean {
  return typeof job.latitude === "number" && typeof job.longitude === "number";
}

export function relevanceScore(job: NormalizedJob, query?: string): number {
  if (!query?.trim()) {
    return 0.72;
  }

  const haystack = normalizeKey(
    `${job.title} ${job.companyName} ${job.description ?? ""} ${job.skills.join(" ")} ${job.field}`,
  );
  const terms = expandQueryTerms(query);
  if (terms.length === 0) {
    return 0.72;
  }

  let score = 0;
  for (const term of terms) {
    if (normalizeKey(job.title).includes(term)) {
      score += 1.2;
    } else if (haystack.includes(term)) {
      score += 0.65;
    }
  }

  if (query.toLowerCase().includes("intern") && job.employmentType === "internship") {
    score += 1.1;
  }
  if (query.toLowerCase().includes("ai") && job.field === "ai_ml") {
    score += 1.1;
  }

  return Math.min(1, score / Math.max(2.5, terms.length));
}

export function freshnessScore(postedAt?: string | null): number {
  if (!postedAt) {
    return 0.45;
  }

  const posted = new Date(postedAt).getTime();
  if (!Number.isFinite(posted)) {
    return 0.45;
  }

  const ageDays = Math.max(0, (Date.now() - posted) / DAY_MS);
  if (ageDays <= 1) {
    return 1;
  }
  if (ageDays <= 3) {
    return 0.88;
  }
  if (ageDays <= 7) {
    return 0.74;
  }
  if (ageDays <= 30) {
    return 0.55;
  }
  return 0.3;
}

export function passesFreshness(job: NormalizedJob, freshness: NearbyJobsQuery["freshness"]): boolean {
  if (!freshness || freshness === "any") {
    return true;
  }
  if (!job.postedAt) {
    return false;
  }

  const posted = new Date(job.postedAt).getTime();
  if (!Number.isFinite(posted)) {
    return false;
  }

  const ageMs = Date.now() - posted;
  const maxAge: Record<Exclude<NearbyJobsQuery["freshness"], undefined | "any">, number> = {
    "24h": DAY_MS,
    "3d": DAY_MS * 3,
    "7d": DAY_MS * 7,
    "30d": DAY_MS * 30,
  };

  return ageMs <= maxAge[freshness];
}

function expandQueryTerms(query: string): string[] {
  const rawTerms = normalizeKey(query).split(" ").filter(Boolean);
  const expanded = new Set(rawTerms);

  if (rawTerms.includes("ai")) {
    expanded.add("machine learning");
    expanded.add("ml");
    expanded.add("data science");
    expanded.add("genai");
  }
  if (rawTerms.includes("internship") || rawTerms.includes("intern")) {
    expanded.add("intern");
    expanded.add("trainee");
    expanded.add("campus");
  }
  if (rawTerms.includes("software")) {
    expanded.add("engineer");
    expanded.add("developer");
    expanded.add("backend");
    expanded.add("frontend");
  }

  return [...expanded];
}
