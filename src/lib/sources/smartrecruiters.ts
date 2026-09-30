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

type SmartRecruitersPosting = {
  id?: string;
  uuid?: string;
  name?: string;
  refNumber?: string;
  releasedDate?: string;
  updatedDate?: string;
  company?: {
    identifier?: string;
    name?: string;
  };
  location?: {
    city?: string;
    region?: string;
    country?: string;
    address?: string;
    postalCode?: string;
    fullLocation?: string;
    latitude?: string | number;
    longitude?: string | number;
    remote?: boolean;
    hybrid?: boolean;
  };
  department?: { label?: string };
  function?: { label?: string };
  industry?: { label?: string };
  typeOfEmployment?: { label?: string };
  experienceLevel?: { label?: string };
};

type SmartRecruitersResponse = {
  content?: SmartRecruitersPosting[];
  totalFound?: number;
};

export class SmartRecruitersSource implements JobSource<SmartRecruitersPosting> {
  provider = "smartrecruiters" as const;

  constructor(public source: SourceConfig) {}

  async fetchJobs(): Promise<SmartRecruitersPosting[]> {
    const allJobs: SmartRecruitersPosting[] = [];
    const limit = 100;

    for (let offset = 0; offset < 300; offset += limit) {
      const url = new URL(
        `https://api.smartrecruiters.com/v1/companies/${this.source.key}/postings`,
      );
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("offset", String(offset));

      const response = await fetch(url, {
        signal: requestSignal(),
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "User-Agent": "Hemlo (public SmartRecruiters adapter)",
        },
      });

      if (!response.ok) {
        throw new Error(
          `SmartRecruiters ${this.source.key} returned ${response.status}`,
        );
      }

      const payload = (await response.json()) as SmartRecruitersResponse;
      const jobs = payload.content ?? [];
      allJobs.push(...jobs);

      if (jobs.length < limit || allJobs.length >= (payload.totalFound ?? 0)) {
        break;
      }
    }

    return allJobs;
  }

  normalize(job: SmartRecruitersPosting): NormalizedJob | null {
    const externalId = job.id ?? job.uuid;
    if (!externalId || !job.name) {
      return null;
    }

    const companyName = compact(
      this.source.displayName ?? job.company?.name ?? this.source.key,
    );
    const locationText = smartRecruitersLocation(job);
    const taxonomy = [
      job.department?.label,
      job.function?.label,
      job.industry?.label,
      job.typeOfEmployment?.label,
      job.experienceLevel?.label,
    ]
      .filter(Boolean)
      .join(" ");
    const combined = `${job.name} ${locationText} ${taxonomy}`;
    const workMode = job.location?.remote
      ? "remote"
      : job.location?.hybrid
        ? "hybrid"
        : classifyWorkMode(combined);
    const coordinates = parseCoordinates(
      job.location?.latitude,
      job.location?.longitude,
    );
    const url = `https://jobs.smartrecruiters.com/${this.source.key}/${externalId}`;

    return {
      id: makeJobId(this.provider, this.source.key, externalId),
      externalId,
      source: this.provider,
      sourceKey: this.source.key,
      sourceKind: "official_ats",
      sourceUrl: url,
      applyUrl: url,
      sourceRank: 86,
      title: compact(job.name),
      normalizedTitle: normalizeTitle(job.name),
      companyName,
      company: {
        id: `${this.provider}:${this.source.key}`,
        name: companyName,
        website: this.source.website ?? null,
        logoUrl: companyLogo(this.source.website),
        verificationStatus: "VERIFIED",
      },
      description: compact(taxonomy),
      employmentType: classifyEmploymentType(
        `${job.typeOfEmployment?.label ?? ""} ${combined}`,
      ),
      workMode,
      field: classifyField(combined),
      skills: extractSkills(combined),
      salary: { min: null, max: null, currency: null },
      locationText,
      locationCandidates: splitLocationCandidates(locationText),
      city: job.location?.city ?? null,
      state: job.location?.region ?? null,
      country: job.location?.country ?? null,
      latitude: coordinates?.lat,
      longitude: coordinates?.lng,
      postedAt: job.releasedDate ?? job.updatedDate ?? null,
      expiresAt: null,
      isVerified: true,
      verificationStatus: "VERIFIED",
      verificationNote:
        "Verified from the company's public SmartRecruiters careers feed.",
      lastCheckedAt: new Date().toISOString(),
    };
  }
}

function smartRecruitersLocation(job: SmartRecruitersPosting): string {
  const location = job.location;
  if (!location) {
    return "Location not listed";
  }

  return compact(
    location.fullLocation ??
      [
        location.address,
        location.city,
        location.region,
        normalizeCountryCode(location.country),
      ]
        .filter(Boolean)
        .join(", "),
  ) || "Location not listed";
}

function parseCoordinates(
  latitude: string | number | undefined,
  longitude: string | number | undefined,
): { lat: number; lng: number } | null {
  const lat = Number.parseFloat(String(latitude ?? ""));
  const lng = Number.parseFloat(String(longitude ?? ""));
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function normalizeCountryCode(country: string | undefined): string | undefined {
  if (!country) {
    return undefined;
  }
  if (country.toLowerCase() === "in") {
    return "India";
  }
  return country;
}

function companyLogo(website: string | undefined): string | undefined {
  if (!website) {
    return undefined;
  }

  try {
    const { hostname } = new URL(website);
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`;
  } catch {
    return undefined;
  }
}
