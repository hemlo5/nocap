import {
  classifyEmploymentType,
  classifyField,
  classifyWorkMode,
  extractSkills,
} from "@/lib/classifiers";
import type { JobSource, NormalizedJob, SourceConfig } from "@/lib/types";
import { requestSignal } from "@/lib/utils/fetch";
import {
  compact,
  makeJobId,
  normalizeTitle,
  splitLocationCandidates,
} from "@/lib/utils/strings";

type WorkdayPosting = {
  title?: string;
  externalPath?: string;
  bulletFields?: string[];
  locationsText?: string;
  postedOn?: string;
  timeType?: string;
  workerSubType?: string;
};

type WorkdayResponse = {
  jobPostings?: WorkdayPosting[];
};

export class WorkdaySource implements JobSource<WorkdayPosting> {
  provider = "workday" as const;

  constructor(public source: SourceConfig) {}

  async fetchJobs(): Promise<WorkdayPosting[]> {
    const endpoint = workdayEndpoint(this.source);
    const response = await fetch(endpoint, {
      method: "POST",
      signal: requestSignal(),
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "NearHire MVP (public Workday adapter)",
      },
      body: JSON.stringify({
        appliedFacets: {},
        limit: 20,
        offset: 0,
        searchText: this.source.searchText ?? "Bangalore",
      }),
    });

    if (!response.ok) {
      throw new Error(`Workday ${this.source.key} returned ${response.status}`);
    }

    const payload = (await response.json()) as WorkdayResponse;
    return payload.jobPostings ?? [];
  }

  normalize(job: WorkdayPosting): NormalizedJob | null {
    if (!job.title || !job.externalPath) {
      return null;
    }

    const externalId = job.externalPath.replace(/^\/+/, "");
    const baseUrl = workdayBaseUrl(this.source);
    const url = `${baseUrl}${job.externalPath.startsWith("/") ? "" : "/"}${job.externalPath}`;
    const locationText = compact(job.locationsText ?? "Location not listed");
    const taxonomy = [...(job.bulletFields ?? []), job.timeType, job.workerSubType]
      .filter(Boolean)
      .join(" ");
    const combined = `${job.title} ${locationText} ${taxonomy}`;
    const companyName = compact(this.source.displayName ?? this.source.key);

    return {
      id: makeJobId(this.provider, this.source.key, externalId),
      externalId,
      source: this.provider,
      sourceKey: this.source.key,
      sourceKind: "official_ats",
      sourceUrl: url,
      applyUrl: url,
      sourceRank: 84,
      title: compact(job.title),
      normalizedTitle: normalizeTitle(job.title),
      companyName,
      company: {
        id: `${this.provider}:${this.source.key}`,
        name: companyName,
        website: this.source.website ?? null,
        verificationStatus: "VERIFIED",
      },
      description: compact(taxonomy),
      employmentType: classifyEmploymentType(combined),
      workMode: classifyWorkMode(combined),
      field: classifyField(combined),
      skills: extractSkills(combined),
      salary: { min: null, max: null, currency: null },
      locationText,
      locationCandidates: splitLocationCandidates(locationText),
      postedAt: job.postedOn ?? null,
      expiresAt: null,
      isVerified: true,
      verificationStatus: "VERIFIED",
      verificationNote: "Verified from the company's public Workday careers feed.",
      lastCheckedAt: new Date().toISOString(),
    };
  }
}

function workdayEndpoint(source: SourceConfig): string {
  if (source.endpoint) {
    return source.endpoint;
  }
  if (!source.tenant || !source.site) {
    throw new Error(`Workday ${source.key} is missing tenant/site configuration`);
  }
  return `https://${source.key}.wd1.myworkdayjobs.com/wday/cxs/${source.tenant}/${source.site}/jobs`;
}

function workdayBaseUrl(source: SourceConfig): string {
  if (source.careersUrl) {
    return source.careersUrl.replace(/\/$/, "");
  }
  return `https://${source.key}.wd1.myworkdayjobs.com`;
}
