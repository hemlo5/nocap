import { XMLParser } from "fast-xml-parser";
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

type PersonioPosition = {
  id?: string | number;
  name?: string;
  office?: string;
  department?: string;
  employmentType?: string;
  schedule?: string;
  seniority?: string;
  occupation?: string;
  occupationCategory?: string;
  createdAt?: string;
  jobDescriptions?: {
    jobDescription?: PersonioDescription | PersonioDescription[];
  };
};

type PersonioDescription = {
  name?: string;
  value?: string;
};

type PersonioXml = {
  "workzag-jobs"?: {
    position?: PersonioPosition | PersonioPosition[];
  };
};

const parser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true,
});

export class PersonioSource implements JobSource<PersonioPosition> {
  provider = "personio" as const;

  constructor(public source: SourceConfig) {}

  async fetchJobs(): Promise<PersonioPosition[]> {
    const response = await fetch(`https://${this.source.key}.jobs.personio.com/xml`, {
      signal: requestSignal(),
      cache: "no-store",
      headers: {
        Accept: "application/xml,text/xml",
        "User-Agent": "NearHire MVP (public Personio adapter)",
      },
    });

    if (!response.ok) {
      throw new Error(`Personio ${this.source.key} returned ${response.status}`);
    }

    const parsed = parser.parse(await response.text()) as PersonioXml;
    const positions = parsed["workzag-jobs"]?.position;
    return Array.isArray(positions) ? positions : positions ? [positions] : [];
  }

  normalize(job: PersonioPosition): NormalizedJob | null {
    const externalId = String(job.id ?? "");
    if (!externalId || !job.name) {
      return null;
    }

    const locationText = compact(job.office ?? "Location not listed");
    const description = personioDescription(job);
    const combined = `${job.name} ${locationText} ${job.department ?? ""} ${job.employmentType ?? ""} ${job.schedule ?? ""} ${job.seniority ?? ""} ${job.occupation ?? ""} ${job.occupationCategory ?? ""} ${description}`;
    const companyName = compact(this.source.displayName ?? this.source.key);
    const url = `https://${this.source.key}.jobs.personio.com/job/${externalId}`;

    return {
      id: makeJobId(this.provider, this.source.key, externalId),
      externalId,
      source: this.provider,
      sourceKey: this.source.key,
      sourceKind: "official_ats",
      sourceUrl: url,
      applyUrl: url,
      sourceRank: 80,
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
      employmentType: classifyEmploymentType(
        `${job.employmentType ?? ""} ${job.schedule ?? ""} ${combined}`,
      ),
      workMode: classifyWorkMode(combined),
      field: classifyField(combined),
      skills: extractSkills(combined),
      salary: { min: null, max: null, currency: null },
      locationText,
      locationCandidates: splitLocationCandidates(locationText),
      postedAt: job.createdAt ?? null,
      expiresAt: null,
      isVerified: true,
      verificationStatus: "VERIFIED",
      verificationNote: "Verified from the company's public Personio careers feed.",
      lastCheckedAt: new Date().toISOString(),
    };
  }
}

function personioDescription(job: PersonioPosition): string {
  const descriptions = job.jobDescriptions?.jobDescription;
  const items = Array.isArray(descriptions)
    ? descriptions
    : descriptions
      ? [descriptions]
      : [];

  return compact(items.map((item) => stripHtml(item.value)).join(" "));
}
