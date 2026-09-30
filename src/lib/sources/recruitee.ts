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

type RecruiteeLocation = {
  city?: string;
  state?: string;
  country?: string;
  name?: string;
};

type RecruiteeOffer = {
  id?: number | string;
  slug?: string;
  title?: string;
  status?: string;
  careers_url?: string;
  url?: string;
  department?: string;
  employment_type?: string;
  remote?: boolean;
  location?: RecruiteeLocation;
  locations?: RecruiteeLocation[];
  description?: string;
  requirements?: string;
  created_at?: string;
};

export class RecruiteeSource implements JobSource<RecruiteeOffer> {
  provider = "recruitee" as const;

  constructor(public source: SourceConfig) {}

  async fetchJobs(): Promise<RecruiteeOffer[]> {
    const response = await fetch(`https://${this.source.key}.recruitee.com/api/offers/`, {
      signal: requestSignal(),
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": "Hemlo (public Recruitee adapter)",
      },
    });

    if (!response.ok) {
      throw new Error(`Recruitee ${this.source.key} returned ${response.status}`);
    }

    const payload = (await response.json()) as { offers?: RecruiteeOffer[] };
    return (payload.offers ?? []).filter((offer) => offer.status !== "closed");
  }

  normalize(job: RecruiteeOffer): NormalizedJob | null {
    const externalId = String(job.id ?? job.slug ?? "");
    const url = job.careers_url ?? job.url;
    if (!externalId || !job.title || !url) {
      return null;
    }

    const locationText = recruiteeLocation(job);
    const description = compact(
      [stripHtml(job.description), stripHtml(job.requirements)].join(" "),
    );
    const combined = `${job.title} ${locationText} ${job.department ?? ""} ${job.employment_type ?? ""} ${description}`;
    const companyName = compact(this.source.displayName ?? this.source.key);

    return {
      id: makeJobId(this.provider, this.source.key, externalId),
      externalId,
      source: this.provider,
      sourceKey: this.source.key,
      sourceKind: "official_ats",
      sourceUrl: url,
      applyUrl: url,
      sourceRank: 82,
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
      employmentType: classifyEmploymentType(
        `${job.employment_type ?? ""} ${combined}`,
      ),
      workMode: job.remote ? "remote" : classifyWorkMode(combined),
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
      verificationNote: "Verified from the company's public Recruitee careers feed.",
      lastCheckedAt: new Date().toISOString(),
    };
  }
}

function recruiteeLocation(job: RecruiteeOffer): string {
  const locations = job.locations?.length ? job.locations : job.location ? [job.location] : [];
  return (
    locations
      .map((location) =>
        compact(
          [location.name, location.city, location.state, location.country]
            .filter(Boolean)
            .join(", "),
        ),
      )
      .filter(Boolean)
      .join("; ") || "Location not listed"
  );
}
