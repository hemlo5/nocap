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

type BambooJob = {
  id?: number | string;
  jobOpeningName?: string;
  departmentLabel?: string;
  employmentStatusLabel?: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };
};

export class BambooHrSource implements JobSource<BambooJob> {
  provider = "bamboohr" as const;

  constructor(public source: SourceConfig) {}

  async fetchJobs(): Promise<BambooJob[]> {
    const response = await fetch(`https://${this.source.key}.bamboohr.com/careers/list`, {
      signal: requestSignal(),
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": "Hemlo (public BambooHR adapter)",
      },
    });

    if (!response.ok) {
      throw new Error(`BambooHR ${this.source.key} returned ${response.status}`);
    }

    const payload = (await response.json()) as { result?: BambooJob[] };
    return payload.result ?? [];
  }

  normalize(job: BambooJob): NormalizedJob | null {
    const externalId = String(job.id ?? "");
    if (!externalId || !job.jobOpeningName) {
      return null;
    }

    const locationText = compact(
      [
        job.location?.city,
        job.location?.state,
        job.location?.country,
      ]
        .filter(Boolean)
        .join(", "),
    ) || "Location not listed";
    const combined = `${job.jobOpeningName} ${locationText} ${job.departmentLabel ?? ""} ${job.employmentStatusLabel ?? ""}`;
    const companyName = compact(this.source.displayName ?? this.source.key);
    const url = `https://${this.source.key}.bamboohr.com/careers/${externalId}`;

    return {
      id: makeJobId(this.provider, this.source.key, externalId),
      externalId,
      source: this.provider,
      sourceKey: this.source.key,
      sourceKind: "official_ats",
      sourceUrl: url,
      applyUrl: url,
      sourceRank: 78,
      title: compact(job.jobOpeningName),
      normalizedTitle: normalizeTitle(job.jobOpeningName),
      companyName,
      company: {
        id: `${this.provider}:${this.source.key}`,
        name: companyName,
        website: this.source.website ?? null,
        verificationStatus: "VERIFIED",
      },
      description: compact(job.departmentLabel ?? ""),
      employmentType: classifyEmploymentType(
        `${job.employmentStatusLabel ?? ""} ${combined}`,
      ),
      workMode: classifyWorkMode(combined),
      field: classifyField(combined),
      skills: extractSkills(combined),
      salary: { min: null, max: null, currency: null },
      locationText,
      locationCandidates: splitLocationCandidates(locationText),
      city: job.location?.city ?? null,
      state: job.location?.state ?? null,
      country: job.location?.country ?? null,
      postedAt: null,
      expiresAt: null,
      isVerified: true,
      verificationStatus: "VERIFIED",
      verificationNote: "Verified from the company's public BambooHR careers feed.",
      lastCheckedAt: new Date().toISOString(),
    };
  }
}
