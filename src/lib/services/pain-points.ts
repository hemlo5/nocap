export type ProblemSector = "fintech" | "edtech" | "healthcare" | "logistics" | "saas" | "consumer" | "hrtech" | "proptech" | "agritech" | "other";

export type ProblemSource = {
  title: string;
  url: string;
  platform: "reddit" | "hackernews";
  upvotes: number;
  publishedAt: string;
};

export type MarketProblem = {
  id: string;
  title: string;
  description: string;
  sector: ProblemSector;
  score: number;
  mentionCount: number;
  sources: ProblemSource[];
};

const CACHE_TTL_MS = 1000 * 60 * 60 * 6;
type CacheEntry = { expiresAt: number; problems: MarketProblem[] };
const problemCache = new Map<string, CacheEntry>();

const SECTOR_PATTERNS: [ProblemSector, RegExp][] = [
  ["fintech", /\b(upi|payment|bank|loan|credit|insurance|invest|mutual fund|neobank|fintech)\b/i],
  ["edtech", /\b(education|school|college|tuition|learn|course|upskill|edtech|skill)\b/i],
  ["healthcare", /\b(hospital|doctor|medicine|health|clinic|pharmacy|mental health)\b/i],
  ["logistics", /\b(deliver|shipping|logistics|supply chain|warehouse|last.?mile|courier)\b/i],
  ["hrtech", /\b(hiring|recruitment|hr|payroll|employee|job portal|talent)\b/i],
  ["proptech", /\b(rent|housing|flat|pg|hostel|property|real estate|landlord|tenant)\b/i],
  ["agritech", /\b(farm|crop|agri|kisan|mandi|produce|irrigation)\b/i],
  ["saas", /\b(saas|software|api|tool|platform|dashboard|analytics|crm|erp)\b/i],
  ["consumer", /\b(food|restaurant|grocery|ecommerce|shopping|app|consumer|d2c|brand)\b/i],
];

function detectSector(text: string): ProblemSector {
  for (const [sector, pattern] of SECTOR_PATTERNS) { if (pattern.test(text)) return sector; }
  return "other";
}

const PROBLEM_PATTERNS = [
  /why (is|are|doesn.t|don.t|can.t|won.t)/i, /nobody (solves|is solving)/i,
  /frustrated (with|by|about)/i, /pain point/i, /problem (with|in|of)/i,
  /lack of/i, /there.?s no/i, /need.? (a|an|better)/i, /terrible (experience|service)/i,
  /worst (part|thing)/i, /should (be|exist|have)/i, /wish (there was|we had)/i,
  /gap in (the )?market/i, /India (needs|lacks|doesn.t have)/i,
];

function isProblemPost(title: string, body: string): boolean {
  return PROBLEM_PATTERNS.some((p) => p.test(`${title} ${body}`));
}

type RedditPost = { data: { id: string; title: string; selftext: string; url: string; score: number; created_utc: number; permalink: string } };
const SUBREDDITS = ["india", "startup_india", "AskIndia", "IndianStreetBets", "IndianBusiness"];
const PROBLEM_QUERY = "problem OR frustrated OR pain point OR wish OR gap OR nobody solves";

async function fetchRedditPosts(): Promise<ProblemSource[]> {
  const sources: ProblemSource[] = [];
  await Promise.allSettled(SUBREDDITS.map(async (sub) => {
    try {
      const url = `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(PROBLEM_QUERY)}&sort=top&t=month&limit=25&restrict_sr=1`;
      const res = await fetch(url, { headers: { "User-Agent": "Hemlo/1.0 market research bot" }, signal: AbortSignal.timeout(8000), next: { revalidate: 21600 } });
      if (!res.ok) return;
      const json = (await res.json()) as { data?: { children?: RedditPost[] } };
      for (const post of json?.data?.children ?? []) {
        const { title, selftext, score, created_utc, permalink } = post.data;
        if (score < 5 || !isProblemPost(title, selftext)) continue;
        sources.push({ title: title.trim(), url: `https://reddit.com${permalink}`, platform: "reddit", upvotes: score, publishedAt: new Date(created_utc * 1000).toISOString() });
      }
    } catch { /* non-fatal */ }
  }));
  return sources;
}

type HnHit = { objectID: string; title: string; story_text?: string; url?: string; points?: number; created_at: string };

async function fetchHnPosts(): Promise<ProblemSource[]> {
  const sources: ProblemSource[] = [];
  const queries = ["India problem frustrated", "India startup gap market", "India nobody solving", "Ask HN India opportunity"];
  await Promise.allSettled(queries.map(async (q) => {
    try {
      const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=ask_hn,story&hitsPerPage=15&numericFilters=created_at_i>${Math.floor(Date.now() / 1000) - 60 * 24 * 3600}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000), next: { revalidate: 21600 } });
      if (!res.ok) return;
      const json = (await res.json()) as { hits?: HnHit[] };
      for (const hit of json.hits ?? []) {
        if ((hit.points ?? 0) < 3 || !isProblemPost(hit.title ?? "", hit.story_text ?? "")) continue;
        sources.push({ title: (hit.title ?? "").trim(), url: hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`, platform: "hackernews", upvotes: hit.points ?? 0, publishedAt: hit.created_at });
      }
    } catch { /* non-fatal */ }
  }));
  return sources;
}

const PROBLEM_CLUSTERS: { id: string; title: string; description: string; keywords: RegExp; sector: ProblemSector }[] = [
  { id: "rent-verification", title: "No easy way to verify landlords / PG listings", description: "Renters across India struggle with fraudulent PG and rental listings, no centralized verification, and no tenant rights protection.", keywords: /\b(rent|landlord|pg|hostel|tenant|flat|deposit|housing|accommodation)\b/i, sector: "proptech" },
  { id: "credit-small-biz", title: "Small businesses can't access formal credit", description: "MSMEs are blocked from formal loans due to lack of credit history and collateral requirements.", keywords: /\b(loan|credit|msme|small business|working capital|bank|collateral)\b/i, sector: "fintech" },
  { id: "last-mile-delivery", title: "Last-mile delivery reliability in tier-2/3 cities", description: "Consumers in smaller cities face inconsistent SLAs, poor tracking, and high failure rates from logistics players.", keywords: /\b(deliver|logistics|tier.?2|tier.?3|shipping|last.?mile|courier)\b/i, sector: "logistics" },
  { id: "healthcare-access", title: "Affordable specialist healthcare outside metros", description: "Specialist doctors are concentrated in metros. Patients in smaller cities travel hours for basic specialist care.", keywords: /\b(doctor|specialist|healthcare|hospital|clinic|tier.?2|rural|health)\b/i, sector: "healthcare" },
  { id: "hr-hiring-small", title: "Hiring for non-tech roles is broken for small companies", description: "Small businesses can't afford big job portals. Finding reliable non-tech talent is a constant pain.", keywords: /\b(hiring|recruit|job portal|naukri|indeed|blue collar|non.?tech|talent)\b/i, sector: "hrtech" },
  { id: "edtech-outcomes", title: "Edtech courses don't guarantee job outcomes", description: "Learners pay for bootcamps with no placement guarantee, misleading outcome claims, and poor mentorship.", keywords: /\b(edtech|course|bootcamp|placement|upskill|certificate|job guarantee|learn)\b/i, sector: "edtech" },
  { id: "saas-localization", title: "SaaS tools not built for Indian business workflows", description: "Global SaaS tools don't handle GST, Indian invoicing formats, or local payment flows without expensive customization.", keywords: /\b(gst|invoice|indian (business|workflow)|saas|erp|accounting|tally)\b/i, sector: "saas" },
  { id: "food-waste", title: "Food waste from restaurants with no redistribution", description: "No efficient marketplace to redistribute surplus restaurant food. Existing NGO connections are manual and inconsistent.", keywords: /\b(food waste|surplus food|restaurant|cloud kitchen|leftover|donate food)\b/i, sector: "consumer" },
  { id: "farm-income", title: "Farmers get minimal margins due to middlemen", description: "Despite digital mandis, most farmers still sell through 3-4 intermediaries, losing 40-60% of retail price.", keywords: /\b(farm|farmer|mandi|kisan|middlemen|agri|produce|crop|price)\b/i, sector: "agritech" },
  { id: "mental-health-stigma", title: "Mental health support is inaccessible and stigmatized", description: "Therapy costs INR 2000-5000 per session. Insurance doesn't cover it. Workplace mental health support barely exists.", keywords: /\b(mental health|therapy|therapist|anxiety|depression|counselor|stigma)\b/i, sector: "healthcare" },
];

function clusterSources(sources: ProblemSource[]): MarketProblem[] {
  return PROBLEM_CLUSTERS.map((cluster) => {
    const matched = sources.filter((s) => cluster.keywords.test(`${s.title} ${s.url}`));
    const score = matched.reduce((sum, s) => {
      const recency = Math.max(0.1, 1 - (Date.now() - new Date(s.publishedAt).getTime()) / (30 * 24 * 3600 * 1000));
      return sum + s.upvotes * recency * (s.platform === "reddit" ? 1 : 1.5);
    }, matched.length === 0 ? 0 : 0);
    return { id: cluster.id, title: cluster.title, description: cluster.description, sector: cluster.sector, score: matched.length === 0 ? 1 : score, mentionCount: matched.length, sources: matched.sort((a, b) => b.upvotes - a.upvotes).slice(0, 5) };
  }).sort((a, b) => b.score - a.score);
}

export async function getMarketProblems(): Promise<{ problems: MarketProblem[]; fetchedAt: string; sourcesScanned: number }> {
  const CACHE_KEY = "pain-points:all";
  const cached = problemCache.get(CACHE_KEY);
  if (cached && cached.expiresAt > Date.now()) {
    return { problems: cached.problems, fetchedAt: new Date(cached.expiresAt - CACHE_TTL_MS).toISOString(), sourcesScanned: cached.problems.reduce((n, p) => n + p.mentionCount, 0) };
  }
  const [redditSources, hnSources] = await Promise.all([fetchRedditPosts(), fetchHnPosts()]);
  const allSources = [...redditSources, ...hnSources];
  const problems = clusterSources(allSources);
  problemCache.set(CACHE_KEY, { problems, expiresAt: Date.now() + CACHE_TTL_MS });
  return { problems, fetchedAt: new Date().toISOString(), sourcesScanned: allSources.length };
}