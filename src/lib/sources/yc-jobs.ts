import {
  classifyEmploymentType,
  classifyField,
  classifyWorkMode,
} from "@/lib/classifiers";
import type { JobSource, NormalizedJob, SalaryRange, SourceConfig } from "@/lib/types";
import { decodeHtml, stripHtml } from "@/lib/utils/html";
import { requestSignal } from "@/lib/utils/fetch";
import {
  compact,
  makeJobId,
  normalizeKey,
  normalizeTitle,
  splitLocationCandidates,
} from "@/lib/utils/strings";

type YcJob = {
  id?: number | string;
  title?: string;
  url?: string;
  applyUrl?: string;
  ctaUrl?: string;
  location?: string;
  type?: string;
  role?: string;
  roleSpecificType?: string | null;
  prettyRole?: string;
  salaryRange?: string;
  equityRange?: string;
  minExperience?: string | null;
  minSchoolYear?: string | null;
  skills?: string[];
  companyUrl?: string;
  companyLogoUrl?: string;
  companyName?: string;
  companyBatchName?: string;
  companyOneLiner?: string;
  createdAt?: string;
};

const YC_BASE_URL = "https://www.ycombinator.com";

export class YcJobsSource implements JobSource<YcJob> {
  provider = "yc" as const;

  constructor(public source: SourceConfig) {}

  async fetchJobs(): Promise<YcJob[]> {
    const location = normalizeKey(this.source.key || "bengaluru")
      .replace(/\s+/g, "-")
      .replace(/^bangalore$/, "bengaluru");
    const response = await fetch(`${YC_BASE_URL}/jobs/location/${location}`, {
      headers: {
        Accept: "text/html",
        "User-Agent": "NearHire local development (contact: dev@nearhire.local)",
      },
      signal: requestSignal(),
      next: { revalidate: 60 * 30 },
    });

    if (!response.ok) {
      throw new Error(`YC Jobs returned ${response.status}`);
    }

    return extractYcJobs(await response.text());
  }

  normalize(job: YcJob): NormalizedJob | null {
    const id = String(job.id ?? "");
    const title = compact(job.title ?? "");
    const companyName = compact(job.companyName ?? "");
    const relativeUrl = job.url ?? "";
    if (!id || !title || !companyName || !relativeUrl) {
      return null;
    }

    const sourceUrl = absoluteYcUrl(relativeUrl);
    const applyUrl = decodeHtml(job.ctaUrl ?? job.applyUrl ?? sourceUrl);
    const locationText = compact(job.location ?? "Bengaluru");
    const roleText = compact(
      `${title} ${job.prettyRole ?? ""} ${job.roleSpecificType ?? ""}`,
    );
    const description = stripHtml(
      compact(
        [
          job.companyOneLiner,
          job.prettyRole,
          job.roleSpecificType,
          job.minExperience ? `Minimum experience: ${job.minExperience}` : "",
          job.minSchoolYear ? `School year: ${job.minSchoolYear}` : "",
          job.equityRange ? `Equity: ${job.equityRange}` : "",
        ]
          .filter(Boolean)
          .join(". "),
      ),
    );

    return {
      id: makeJobId(this.provider, this.source.key, id),
      externalId: id,
      source: this.provider,
      sourceKey: this.source.key,
      sourceKind: "trusted_job_board",
      sourceType: "startup_board",
      sourceUrl,
      applyUrl,
      sourceRank: 84,
      title,
      normalizedTitle: normalizeTitle(title),
      companyName,
      companyId: job.companyUrl ?? null,
      company: {
        id: `yc:${normalizeKey(companyName).replace(/\s+/g, "-")}`,
        name: companyName,
        website: absoluteYcUrl(job.companyUrl ?? ""),
        logoUrl: job.companyLogoUrl ?? null,
        description: stripHtml(job.companyOneLiner),
        city: null,
        country: null,
        verificationStatus: "VERIFIED",
      },
      description,
      employmentType: classifyEmploymentType(`${job.type ?? ""} ${title}`),
      workMode: classifyWorkMode(locationText),
      field: classifyField(roleText),
      skills: Array.isArray(job.skills) ? job.skills.filter(Boolean) : [],
      salary: parseSalaryRange(job.salaryRange ?? ""),
      locationText,
      locationCandidates: splitLocationCandidates(locationText),
      city: null,
      state: null,
      country: locationText.toLowerCase().includes("in") ? "India" : null,
      latitude: undefined,
      longitude: undefined,
      distanceKm: null,
      postedAt: relativePostedAt(job.createdAt),
      expiresAt: null,
      isVerified: true,
      verificationStatus: "VERIFIED",
      verificationNote: "Y Combinator startup job listing",
      lastCheckedAt: new Date().toISOString(),
      startup: {
        isStartup: true,
        source: "Y Combinator Jobs",
        ycFunded: true,
        accelerator: "Y Combinator",
        batch: job.companyBatchName,
        activelyHiring: true,
      },
    };
  }
}

function extractYcJobs(html: string): YcJob[] {
  const decoded = decodeHtml(html);
  const marker = '"jobPostings":';
  const markerIndex = decoded.indexOf(marker);
  if (markerIndex < 0) {
    return [];
  }

  const arrayStart = decoded.indexOf("[", markerIndex + marker.length);
  if (arrayStart < 0) {
    return [];
  }

  const json = extractJsonArray(decoded, arrayStart);
  if (!json) {
    return [];
  }

  try {
    const parsed = JSON.parse(json) as unknown;
    return Array.isArray(parsed) ? (parsed as YcJob[]) : [];
  } catch {
    return [];
  }
}

function extractJsonArray(value: string, startIndex: number): string | null {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = startIndex; index < value.length; index += 1) {
    const char = value[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === "[") {
      depth += 1;
    } else if (char === "]") {
      depth -= 1;
      if (depth === 0) {
        return value.slice(startIndex, index + 1);
      }
    }
  }

  return null;
}

function absoluteYcUrl(url: string): string {
  if (!url) {
    return YC_BASE_URL;
  }
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  return `${YC_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function parseSalaryRange(value: string): SalaryRange {
  const normalized = compact(value);
  if (!normalized) {
    return { min: null, max: null, currency: null };
  }

  const currency = normalized.includes("₹")
    ? "INR"
    : normalized.includes("$")
      ? "USD"
      : null;
  const amounts = [...normalized.matchAll(/(?:₹|\$)?\s*([\d.]+)\s*([kKmM]?)/g)]
    .map((match) => parseAmount(match[1], match[2]))
    .filter((amount): amount is number => Number.isFinite(amount));

  return {
    min: amounts[0] ?? null,
    max: amounts[1] ?? amounts[0] ?? null,
    currency,
  };
}

function parseAmount(rawAmount: string, suffix: string): number | null {
  const amount = Number.parseFloat(rawAmount);
  if (!Number.isFinite(amount)) {
    return null;
  }
  if (suffix.toLowerCase() === "m") {
    return Math.round(amount * 1_000_000);
  }
  if (suffix.toLowerCase() === "k") {
    return Math.round(amount * 1_000);
  }
  return Math.round(amount);
}

function relativePostedAt(value?: string): string | null {
  if (!value) {
    return null;
  }

  const normalized = normalizeKey(value);
  const amount = Number.parseInt(normalized.match(/\d+/)?.[0] ?? "1", 10);
  const date = new Date();

  if (/\bhour/.test(normalized)) {
    date.setHours(date.getHours() - amount);
  } else if (/\bmonth/.test(normalized)) {
    date.setMonth(date.getMonth() - amount);
  } else {
    date.setDate(date.getDate() - amount);
  }

  return date.toISOString();
}
