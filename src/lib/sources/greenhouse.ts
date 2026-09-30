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

type GreenhouseOffice = {
  name?: string;
  location?: string;
};

type GreenhouseDepartment = {
  name?: string;
};

type GreenhouseJob = {
  id: number | string;
  title: string;
  absolute_url: string;
  location?: { name?: string };
  company_name?: string;
  content?: string;
  updated_at?: string;
  first_published?: string;
  application_deadline?: string | null;
  offices?: GreenhouseOffice[];
  departments?: GreenhouseDepartment[];
};

export class GreenhouseSource implements JobSource<GreenhouseJob> {
  provider = "greenhouse" as const;

  constructor(public source: SourceConfig) {}

  async fetchJobs(options: { includeContent?: boolean } = {}): Promise<GreenhouseJob[]> {
    const url = new URL(
      `https://boards-api.greenhouse.io/v1/boards/${this.source.key}/jobs`,
    );
    url.searchParams.set("content", options.includeContent ? "true" : "false");

    const response = await fetch(url, {
      signal: requestSignal(),
      headers: {
        Accept: "application/json",
        "User-Agent": "Hemlo (official Greenhouse board adapter)",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `Greenhouse ${this.source.key} returned ${response.status}`,
      );
    }

    const payload = (await response.json()) as { jobs?: GreenhouseJob[] };
    return payload.jobs ?? [];
  }

  normalize(job: GreenhouseJob): NormalizedJob | null {
    if (!job.id || !job.title || !job.absolute_url) {
      return null;
    }

    const locationText = getBestLocationText(job);
    const description = stripHtml(job.content);
    const departments = (job.departments ?? [])
      .map((department) => department.name)
      .filter(Boolean)
      .join(" ");
    const combined = `${job.title} ${locationText} ${departments} ${description}`;
    const companyName = compact(
      this.source.displayName ?? job.company_name ?? this.source.key,
    );
    const externalId = String(job.id);
    const checkedAt = new Date().toISOString();

    return {
      id: makeJobId(this.provider, this.source.key, externalId),
      externalId,
      source: this.provider,
      sourceKey: this.source.key,
      sourceKind: "official_ats",
      sourceUrl: job.absolute_url,
      applyUrl: job.absolute_url,
      sourceRank: 90,
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
      employmentType: classifyEmploymentType(combined),
      workMode: classifyWorkMode(combined),
      field: classifyField(combined),
      skills: extractSkills(combined),
      salary: {
        min: null,
        max: null,
        currency: null,
      },
      locationText,
      locationCandidates: splitLocationCandidates(locationText),
      postedAt: job.first_published ?? job.updated_at ?? null,
      expiresAt: job.application_deadline ?? null,
      isVerified: true,
      verificationStatus: "VERIFIED",
      verificationNote: "Verified from the company's official Greenhouse careers feed.",
      lastCheckedAt: checkedAt,
    };
  }
}

function getBestLocationText(job: GreenhouseJob): string {
  const officeLocations =
    job.offices
      ?.map((office) => office.location || office.name)
      .filter((value): value is string => Boolean(value))
      .map(compact) ?? [];

  const primary = job.location?.name ? [compact(job.location.name)] : [];
  const allLocations = [...officeLocations, ...primary].filter(Boolean);

  return [...new Set(allLocations)].join("; ") || "Location not listed";
}
