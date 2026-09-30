import type { SourceProvider } from "@/lib/types";
import { requestSignal } from "@/lib/utils/fetch";

export type AtsDetectionResult = {
  provider: SourceProvider | null;
  key?: string;
};

export type CareerSourceDetectionResult = {
  platform: string | null;
  provider: SourceProvider | null;
  key?: string;
  supported: boolean;
  evidence?: string;
};

const fingerprints: Array<{
  platform: string;
  provider?: SourceProvider;
  supported: boolean;
  pattern: RegExp;
  extract(url: URL): string | undefined;
}> = [
  {
    platform: "Greenhouse",
    provider: "greenhouse",
    supported: true,
    pattern: /boards\.greenhouse\.io|boards-api\.greenhouse\.io/i,
    extract: (url) => url.pathname.split("/").filter(Boolean)[0],
  },
  {
    platform: "Lever",
    provider: "lever",
    supported: true,
    pattern: /jobs\.lever\.co|api\.lever\.co/i,
    extract: (url) => url.pathname.split("/").filter(Boolean)[0],
  },
  {
    platform: "Ashby",
    provider: "ashby",
    supported: true,
    pattern: /jobs\.ashbyhq\.com|api\.ashbyhq\.com/i,
    extract: (url) => url.pathname.split("/").filter(Boolean).pop(),
  },
  {
    platform: "Workable",
    provider: "workable",
    supported: true,
    pattern: /apply\.workable\.com|workable\.com\/api\/accounts/i,
    extract: (url) => url.pathname.split("/").filter(Boolean).pop(),
  },
  {
    platform: "SmartRecruiters",
    provider: "smartrecruiters",
    supported: true,
    pattern: /jobs\.smartrecruiters\.com|api\.smartrecruiters\.com/i,
    extract: (url) => url.pathname.split("/").filter(Boolean)[0],
  },
  {
    platform: "Recruitee",
    provider: "recruitee",
    supported: true,
    pattern: /recruitee\.com/i,
    extract: (url) => url.hostname.split(".")[0],
  },
  {
    platform: "Personio",
    provider: "personio",
    supported: true,
    pattern: /jobs\.personio\.com/i,
    extract: (url) => url.hostname.split(".")[0],
  },
  {
    platform: "BambooHR",
    provider: "bamboohr",
    supported: true,
    pattern: /bamboohr\.com/i,
    extract: (url) => url.hostname.split(".")[0],
  },
  {
    platform: "Breezy",
    provider: "breezy",
    supported: true,
    pattern: /breezy\.hr/i,
    extract: (url) => url.hostname.split(".")[0],
  },
  {
    platform: "Workday",
    provider: "workday",
    supported: true,
    pattern: /myworkdayjobs\.com/i,
    extract: (url) => url.hostname.split(".")[0],
  },
  unsupported("Teamtailor", /teamtailor\.com|careersite\.teamtailor\.com/i),
  unsupported("Jobvite", /jobvite\.com/i),
  unsupported("iCIMS", /icims\.com/i),
  unsupported("Oracle Recruiting", /oraclecloud\.com\/hcmUI|oraclecloud\.com\/recruiting/i),
  unsupported("SAP SuccessFactors", /successfactors\.com|sapsf\.com/i),
  unsupported("JazzHR", /jazzhr\.com/i),
  unsupported("Comeet", /comeet\.co/i),
  unsupported("Pinpoint", /pinpointhq\.com/i),
  unsupported("Rippling", /rippling\.com\/careers|ats\.rippling\.com/i),
  unsupported("Gem", /gem\.com/i),
  unsupported("Dover", /dover\.com/i),
  unsupported("UKG", /ukg\.com|ultipro\.com/i),
  unsupported("Dayforce", /dayforcehcm\.com|dayforce\.com/i),
  unsupported("Avature", /avature\.net/i),
  unsupported("Taleo", /taleo\.net/i),
  unsupported("ADP Recruiting", /adp\.com\/.*recruit/i),
  unsupported("Bullhorn", /bullhorn\.com/i),
  unsupported("Zoho Recruit", /zohorecruit\.com|zoho\.com\/recruit/i),
  unsupported("Freshteam", /freshteam\.com/i),
];

export async function detectAts(careersUrl: string): Promise<AtsDetectionResult> {
  const detected = await detectCareerSource(careersUrl);
  return { provider: detected.provider, key: detected.key };
}

export async function detectCareerSource(
  careersUrl: string,
): Promise<CareerSourceDetectionResult> {
  const direct = detectFromText(careersUrl);
  if (direct.platform) {
    return direct;
  }

  const response = await fetch(careersUrl, {
    signal: requestSignal(6000),
    cache: "no-store",
    headers: {
      Accept: "text/html",
      "User-Agent": "Hemlo (public careers ATS detector)",
    },
  });

  if (!response.ok) {
    return {
      platform: null,
      provider: null,
      supported: false,
    };
  }

  return detectFromText(await response.text());
}

export function detectFromText(text: string): CareerSourceDetectionResult {
  const urls = extractUrls(text);
  for (const fingerprint of fingerprints) {
    const evidence =
      urls.find((url) => fingerprint.pattern.test(url)) ??
      (fingerprint.pattern.test(text) ? text.slice(0, 240) : undefined);
    if (!evidence) {
      continue;
    }

    const parsedUrl = parseUrl(evidence);
    return {
      platform: fingerprint.platform,
      provider: fingerprint.provider ?? null,
      key: parsedUrl ? fingerprint.extract(parsedUrl) : undefined,
      supported: fingerprint.supported,
      evidence,
    };
  }

  return {
    platform: null,
    provider: null,
    supported: false,
  };
}

function unsupported(
  platform: string,
  pattern: RegExp,
): {
  platform: string;
  supported: false;
  pattern: RegExp;
  extract(url: URL): string | undefined;
} {
  return {
    platform,
    supported: false,
    pattern,
    extract: (url) => url.hostname,
  };
}

function extractUrls(text: string): string[] {
  return [
    ...text.matchAll(
      /https?:\/\/[^\s"'<>]+(?:greenhouse|lever|ashbyhq|workable|smartrecruiters|recruitee|personio|bamboohr|breezy|myworkdayjobs|teamtailor|jobvite|icims|oraclecloud|successfactors|sapsf|jazzhr|comeet|pinpointhq|rippling|gem|dover|ukg|ultipro|dayforce|avature|taleo|adp|bullhorn|zohorecruit|freshteam)[^\s"'<>]*/gi,
    ),
  ]
    .map((match) => match[0].replace(/[),.;]+$/, ""))
    .filter(Boolean);
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}
