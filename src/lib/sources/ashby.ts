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

type AshbyJob = {
  id: string;
  title: string;
  location?: string | { name?: string };
  secondaryLocations?: Array<{ location?: string }>;
  department?: string;
  team?: string;
  isListed?: boolean;
  isRemote?: boolean;
  workplaceType?: string;
  employmentType?: string;
  jobUrl?: string;
  applyUrl?: string;
  descriptionHtml?: string;
  descriptionPlain?: string;
  publishedAt?: string;
  compensation?: {
    summaryComponents?: Array<{
      compensationType?: string;
      currencyCode?: string | null;
      minValue?: number | null;
      maxValue?: number | null;
    }>;
  };
};

export class AshbySource implements JobSource<AshbyJob> {
  provider = "ashby" as const;

  constructor(public source: SourceConfig) {}

  async fetchJobs(): Promise<AshbyJob[]> {
    const response = await fetch(
      `https://api.ashbyhq.com/posting-api/job-board/${this.source.key}?includeCompensation=true`,
      {
        signal: requestSignal(),
        headers: {
          Accept: "application/json",
          "User-Agent": "NearHire MVP (official Ashby job board adapter)",
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(`Ashby ${this.source.key} returned ${response.status}`);
    }

    const payload = (await response.json()) as { jobs?: AshbyJob[] };
    return payload.jobs ?? [];
  }

  normalize(job: AshbyJob): NormalizedJob | null {
    const url = job.jobUrl ?? job.applyUrl;
    if (!job.id || !job.title || !url || job.isListed === false) {
      return null;
    }

    const primaryLocation =
      typeof job.location === "string" ? job.location : job.location?.name;
    const locationText = compact(
      [
        primaryLocation,
        ...(job.secondaryLocations ?? []).map((location) => location.location),
      ]
        .filter(Boolean)
        .join("; ") || "Location not listed",
    );
    const description = compact(
      job.descriptionPlain ?? stripHtml(job.descriptionHtml),
    );
    const combined = `${job.title} ${locationText} ${job.department ?? ""} ${job.team ?? ""} ${job.employmentType ?? ""} ${job.workplaceType ?? ""} ${description}`;
    const companyName = compact(this.source.displayName ?? this.source.key);
    const salary = extractAshbySalary(job);

    return {
      id: makeJobId(this.provider, this.source.key, job.id),
      externalId: job.id,
      source: this.provider,
      sourceKey: this.source.key,
      sourceKind: "official_ats",
      sourceUrl: url,
      applyUrl: url,
      sourceRank: 88,
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
      employmentType: normalizeAshbyEmploymentType(job.employmentType, combined),
      workMode: normalizeAshbyWorkMode(job, combined),
      field: classifyField(combined),
      skills: extractSkills(combined),
      salary,
      locationText,
      locationCandidates: splitLocationCandidates(locationText),
      postedAt: job.publishedAt ?? null,
      expiresAt: null,
      isVerified: true,
      verificationStatus: "VERIFIED",
      verificationNote: "Verified from the company's official Ashby job board feed.",
      lastCheckedAt: new Date().toISOString(),
    };
  }
}

function normalizeAshbyEmploymentType(
  employmentType: string | undefined,
  fallback: string,
): NormalizedJob["employmentType"] {
  const normalized = compact(employmentType ?? "").toLowerCase();
  if (normalized === "intern") {
    return "internship";
  }
  if (normalized === "parttime") {
    return "part_time";
  }
  if (normalized === "contract" || normalized === "temporary") {
    return "contract";
  }
  if (normalized === "fulltime") {
    return "full_time";
  }
  return classifyEmploymentType(fallback);
}

function normalizeAshbyWorkMode(
  job: AshbyJob,
  fallback: string,
): NormalizedJob["workMode"] {
  const workplaceType = compact(job.workplaceType ?? "").toLowerCase();
  if (job.isRemote || workplaceType === "remote") {
    return "remote";
  }
  if (workplaceType === "hybrid") {
    return "hybrid";
  }
  if (workplaceType === "onsite" || workplaceType === "on_site") {
    return "onsite";
  }
  return classifyWorkMode(fallback);
}

function extractAshbySalary(job: AshbyJob): NormalizedJob["salary"] {
  const component = job.compensation?.summaryComponents?.find(
    (item) => item.compensationType === "Salary",
  );

  return {
    min: component?.minValue ?? null,
    max: component?.maxValue ?? null,
    currency: component?.currencyCode ?? null,
  };
}
