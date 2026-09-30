import {
  classifyEmploymentType,
  classifyField,
  classifyWorkMode,
  extractSkills,
} from "@/lib/classifiers";
import type { JobSource, NormalizedJob, SourceConfig } from "@/lib/types";
import { requestSignal } from "@/lib/utils/fetch";
import { stripHtml } from "@/lib/utils/html";
import {
  compact,
  makeJobId,
  normalizeTitle,
  splitLocationCandidates,
} from "@/lib/utils/strings";

type WorkableLocation = {
  country?: string;
  countryCode?: string;
  city?: string;
  region?: string;
  state?: string;
  hidden?: boolean;
};

type WorkableJob = {
  title?: string;
  shortcode?: string;
  code?: string;
  employment_type?: string;
  telecommuting?: boolean;
  department?: string | null;
  url?: string;
  shortlink?: string;
  application_url?: string;
  published_on?: string;
  created_at?: string;
  country?: string;
  city?: string;
  state?: string;
  function?: string;
  industry?: string;
  locations?: WorkableLocation[];
  description?: string;
  requirements?: string;
  benefits?: string;
};

export class WorkableSource implements JobSource<WorkableJob> {
  provider = "workable" as const;

  constructor(public source: SourceConfig) {}

  async fetchJobs(): Promise<WorkableJob[]> {
    const response = await fetch(
      `https://www.workable.com/api/accounts/${this.source.key}?details=true`,
      {
        signal: requestSignal(),
        headers: {
          Accept: "application/json",
          "User-Agent": "Hemlo (public Workable careers feed adapter)",
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(`Workable ${this.source.key} returned ${response.status}`);
    }

    const payload = (await response.json()) as { jobs?: WorkableJob[] };
    return payload.jobs ?? [];
  }

  normalize(job: WorkableJob): NormalizedJob | null {
    const externalId = job.shortcode ?? job.code;
    const url = job.application_url ?? job.url ?? job.shortlink;
    if (!externalId || !job.title || !url) {
      return null;
    }

    const locationText = buildLocationText(job);
    const description = compact(
      [
        stripHtml(job.description),
        stripHtml(job.requirements),
        stripHtml(job.benefits),
      ].join(" "),
    );
    const taxonomy = `${job.department ?? ""} ${job.function ?? ""} ${job.industry ?? ""} ${job.employment_type ?? ""}`;
    const combined = `${job.title} ${locationText} ${taxonomy} ${description}`;
    const companyName = compact(this.source.displayName ?? this.source.key);

    return {
      id: makeJobId(this.provider, this.source.key, externalId),
      externalId,
      source: this.provider,
      sourceKey: this.source.key,
      sourceKind: "official_ats",
      sourceUrl: job.url ?? job.shortlink ?? url,
      applyUrl: url,
      sourceRank: 86,
      title: compact(job.title),
      normalizedTitle: normalizeTitle(job.title),
      companyName,
      company: {
        id: `${this.provider}:${this.source.key}`,
        name: companyName,
        website: this.source.website ?? null,
        verificationStatus: "VERIFIED",
      },
      description,
      employmentType: normalizeWorkableEmploymentType(job.employment_type, combined),
      workMode: job.telecommuting ? "remote" : classifyWorkMode(combined),
      field: classifyField(combined),
      skills: extractSkills(combined),
      salary: { min: null, max: null, currency: null },
      locationText,
      locationCandidates: splitLocationCandidates(locationText),
      postedAt: job.published_on ?? job.created_at ?? null,
      expiresAt: null,
      isVerified: true,
      verificationStatus: "VERIFIED",
      verificationNote: "Verified from the company's public Workable careers feed.",
      lastCheckedAt: new Date().toISOString(),
    };
  }
}

function buildLocationText(job: WorkableJob): string {
  const visibleLocations = (job.locations ?? []).filter((location) => !location.hidden);
  const locations = visibleLocations.map((location) =>
    compact(
      [
        location.city,
        location.region ?? location.state,
        location.country,
      ]
        .filter(Boolean)
        .join(", "),
    ),
  );

  const fallback = compact(
    [job.city, job.state, job.country].filter(Boolean).join(", "),
  );

  return [...new Set([...locations, fallback].filter(Boolean))].join("; ") ||
    "Location not listed";
}

function normalizeWorkableEmploymentType(
  employmentType: string | undefined,
  fallback: string,
): NormalizedJob["employmentType"] {
  const normalized = compact(employmentType ?? "").toLowerCase();
  if (normalized.includes("intern")) {
    return "internship";
  }
  if (normalized.includes("part")) {
    return "part_time";
  }
  if (normalized.includes("contract") || normalized.includes("temporary")) {
    return "contract";
  }
  if (normalized.includes("full")) {
    return "full_time";
  }
  return classifyEmploymentType(fallback);
}
