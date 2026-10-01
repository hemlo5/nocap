import type { CareersDiscoveryResult, CanonicalCompany, DiscoveredCompany } from "@/lib/types";
import { requestSignal } from "@/lib/utils/fetch";
import { compact, normalizeKey } from "@/lib/utils/strings";

type CompanyInput = Pick<
  CanonicalCompany | DiscoveredCompany,
  "id" | "name" | "website" | "careersUrl"
>;

type LinkCandidate = {
  url: string;
  text: string;
  score: number;
};

const CAREERS_TERMS =
  /\b(careers?|jobs?|join us|join our team|work with us|opportunities|open positions|open roles|vacancies|hiring|work with our team)\b/i;
const LOW_SIGNAL_TERMS = /\b(blog|press|privacy|terms|login|signin|sign in|contact|support)\b/i;
const PLAUSIBLE_CAREERS_PATHS = [
  "/careers",
  "/career",
  "/jobs",
  "/join-us",
  "/joinus",
  "/work-with-us",
  "/company/careers",
  "/careers/openings",
  "/open-positions",
  "/opportunities",
];

export async function discoverCareersPage(
  company: CompanyInput,
): Promise<CareersDiscoveryResult> {
  const explicitCareersUrl = cleanUrl(company.careersUrl);
  if (explicitCareersUrl) {
    return {
      companyId: company.id,
      companyName: company.name,
      website: cleanUrl(company.website),
      careersUrl: explicitCareersUrl,
      status: "found",
      evidence: "Configured careers URL",
    };
  }

  const website = cleanUrl(company.website);
  if (!website) {
    return baseResult(company, "not_found", "No company website available");
  }

  try {
    const homepage = await fetchHtml(website);
    const candidates = extractCareerLinks(homepage, website);
    const best = candidates.sort((a, b) => b.score - a.score)[0];
    if (best) {
      return {
        companyId: company.id,
        companyName: company.name,
        website,
        careersUrl: best.url,
        status: "found",
        evidence: best.text || "Careers link on company website",
      };
    }

    const plausible = await findWorkingPlausiblePath(website);
    if (plausible) {
      return {
        companyId: company.id,
        companyName: company.name,
        website,
        careersUrl: plausible,
        status: "found",
        evidence: "Common careers path responded successfully",
      };
    }

    return baseResult(company, "not_found", "No careers link found on website");
  } catch (error) {
    return {
      ...baseResult(company, "failed"),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html",
      "User-Agent": "Hemlo local development (public careers discovery)",
    },
    signal: requestSignal(7000),
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!response.ok) {
    throw new Error(`Careers discovery fetch returned ${response.status}`);
  }

  return response.text();
}

function extractCareerLinks(html: string, baseUrl: string): LinkCandidate[] {
  const candidates: LinkCandidate[] = [];
  const anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = anchorPattern.exec(html))) {
    const rawHref = match[1];
    const text = compact(stripTags(match[2]));
    const haystack = `${rawHref} ${text}`;
    if (!CAREERS_TERMS.test(haystack) || LOW_SIGNAL_TERMS.test(haystack)) {
      continue;
    }

    const url = absoluteUrl(rawHref, baseUrl);
    if (!url || !isSafeHttpUrl(url)) {
      continue;
    }

    candidates.push({
      url,
      text,
      score: careerLinkScore(url, text),
    });
  }

  return dedupeLinks(candidates);
}

async function findWorkingPlausiblePath(website: string): Promise<string | null> {
  const base = new URL(website);
  const origin = `${base.protocol}//${base.host}`;

  for (const path of PLAUSIBLE_CAREERS_PATHS) {
    const url = `${origin}${path}`;
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "text/html",
          "User-Agent": "Hemlo local development (public careers discovery)",
        },
        signal: requestSignal(5000),
        next: { revalidate: 60 * 60 * 24 },
      });

      if (
        response.ok &&
        /text\/html/i.test(response.headers.get("content-type") ?? "")
      ) {
        return url;
      }
    } catch {
      // Try the next common path.
    }
  }

  return null;
}

function careerLinkScore(url: string, text: string): number {
  const value = normalizeKey(`${url} ${text}`);
  let score = 0;
  if (/\bcareers?\b/.test(value)) {
    score += 5;
  }
  if (/\bjobs?\b/.test(value)) {
    score += 4;
  }
  if (/\b(join|hiring|opportunities|open positions|open roles)\b/.test(value)) {
    score += 3;
  }
  if (/\b(greenhouse|lever|ashby|workable|smartrecruiters|recruitee|personio|bamboohr|breezy|workday)\b/.test(value)) {
    score += 3;
  }
  return score;
}

function baseResult(
  company: CompanyInput,
  status: CareersDiscoveryResult["status"],
  evidence?: string,
): CareersDiscoveryResult {
  return {
    companyId: company.id,
    companyName: company.name,
    website: cleanUrl(company.website),
    careersUrl: cleanUrl(company.careersUrl),
    status,
    evidence,
  };
}

function cleanUrl(value: string | undefined | null): string | null {
  const url = compact(value ?? "");
  if (!url) {
    return null;
  }
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function absoluteUrl(href: string, baseUrl: string): string | null {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, " ");
}

function dedupeLinks(candidates: LinkCandidate[]): LinkCandidate[] {
  const byUrl = new Map<string, LinkCandidate>();
  for (const candidate of candidates) {
    const existing = byUrl.get(candidate.url);
    if (!existing || candidate.score > existing.score) {
      byUrl.set(candidate.url, candidate);
    }
  }
  return [...byUrl.values()];
}
