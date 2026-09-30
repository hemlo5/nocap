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

type LeverPosting = {
  id: string;
  text: string;
  hostedUrl: string;
  description?: string;
  descriptionPlain?: string;
  additionalPlain?: string;
  createdAt?: number;
  categories?: {
    commitment?: string;
    department?: string;
    team?: string;
    location?: string;
  };
  lists?: Array<{ text?: string; content?: string }>;
};

export class LeverSource implements JobSource<LeverPosting> {
  provider = "lever" as const;

  constructor(public source: SourceConfig) {}

  async fetchJobs(): Promise<LeverPosting[]> {
    const response = await fetch(
      `https://api.lever.co/v0/postings/${this.source.key}?mode=json`,
      {
        signal: requestSignal(),
        headers: {
          Accept: "application/json",
          "User-Agent": "Hemlo (official Lever posting adapter)",
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(`Lever ${this.source.key} returned ${response.status}`);
    }

    return (await response.json()) as LeverPosting[];
  }

  normalize(job: LeverPosting): NormalizedJob | null {
    if (!job.id || !job.text || !job.hostedUrl) {
      return null;
    }

    const listText = (job.lists ?? [])
      .map((item) => `${item.text ?? ""} ${stripHtml(item.content)}`)
      .join(" ");
    const description = compact(
      `${job.descriptionPlain ?? stripHtml(job.description)} ${job.additionalPlain ?? ""} ${listText}`,
    );
    const locationText = compact(job.categories?.location ?? "Location not listed");
    const taxonomy = `${job.categories?.department ?? ""} ${job.categories?.team ?? ""} ${job.categories?.commitment ?? ""}`;
    const combined = `${job.text} ${locationText} ${taxonomy} ${description}`;
    const companyName = compact(this.source.displayName ?? this.source.key);
    const postedAt = job.createdAt
      ? new Date(job.createdAt).toISOString()
      : null;

    return {
      id: makeJobId(this.provider, this.source.key, job.id),
      externalId: job.id,
      source: this.provider,
      sourceKey: this.source.key,
      sourceKind: "official_ats",
      sourceUrl: job.hostedUrl,
      applyUrl: job.hostedUrl,
      sourceRank: 88,
      title: compact(job.text),
      normalizedTitle: normalizeTitle(job.text),
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
      salary: { min: null, max: null, currency: null },
      locationText,
      locationCandidates: splitLocationCandidates(locationText),
      postedAt,
      expiresAt: null,
      isVerified: true,
      verificationStatus: "VERIFIED",
      verificationNote: "Verified from the company's official Lever careers feed.",
      lastCheckedAt: new Date().toISOString(),
    };
  }
}
