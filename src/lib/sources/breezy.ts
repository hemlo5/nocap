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

type BreezyJob = {
  id?: string;
  friendly_id?: string;
  name?: string;
  url?: string;
  type?: string;
  department?: string;
  description?: string;
  created_at?: string;
  location?: {
    name?: string;
    city?: string;
    state?: string;
    country?: string;
    is_remote?: boolean;
  };
};

export class BreezySource implements JobSource<BreezyJob> {
  provider = "breezy" as const;

  constructor(public source: SourceConfig) {}

  async fetchJobs(): Promise<BreezyJob[]> {
    const response = await fetch(`https://${this.source.key}.breezy.hr/json`, {
      signal: requestSignal(),
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": "Hemlo (public Breezy HR adapter)",
      },
    });

    if (!response.ok) {
      throw new Error(`Breezy ${this.source.key} returned ${response.status}`);
    }

    const payload = (await response.json()) as BreezyJob[] | { positions?: BreezyJob[] };
    return Array.isArray(payload) ? payload : payload.positions ?? [];
  }

  normalize(job: BreezyJob): NormalizedJob | null {
    const externalId = job.id ?? job.friendly_id;
    const url = job.url ?? `https://${this.source.key}.breezy.hr/p/${externalId}`;
    if (!externalId || !job.name || !url) {
      return null;
    }

    const locationText = breezyLocation(job);
    const description = stripHtml(job.description);
    const combined = `${job.name} ${locationText} ${job.department ?? ""} ${job.type ?? ""} ${description}`;
    const companyName = compact(this.source.displayName ?? this.source.key);

    return {
      id: makeJobId(this.provider, this.source.key, externalId),
      externalId,
      source: this.provider,
      sourceKey: this.source.key,
      sourceKind: "official_ats",
      sourceUrl: url,
      applyUrl: url,
      sourceRank: 78,
      title: compact(job.name),
      normalizedTitle: normalizeTitle(job.name),
      companyName,
      company: {
        id: `${this.provider}:${this.source.key}`,
        name: companyName,
        website: this.source.website ?? null,
        verificationStatus: "VERIFIED",
      },
      description,
      employmentType: classifyEmploymentType(`${job.type ?? ""} ${combined}`),
      workMode: job.location?.is_remote ? "remote" : classifyWorkMode(combined),
      field: classifyField(combined),
      skills: extractSkills(combined),
      salary: { min: null, max: null, currency: null },
      locationText,
      locationCandidates: splitLocationCandidates(locationText),
      city: job.location?.city ?? null,
      state: job.location?.state ?? null,
      country: job.location?.country ?? null,
      postedAt: job.created_at ?? null,
      expiresAt: null,
      isVerified: true,
      verificationStatus: "VERIFIED",
      verificationNote: "Verified from the company's public Breezy HR careers feed.",
      lastCheckedAt: new Date().toISOString(),
    };
  }
}

function breezyLocation(job: BreezyJob): string {
  return compact(
    [
      job.location?.name,
      job.location?.city,
      job.location?.state,
      job.location?.country,
    ]
      .filter(Boolean)
      .join(", "),
  ) || "Location not listed";
}
