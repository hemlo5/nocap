import { XMLParser } from "fast-xml-parser";

export type StoryCategory = "funding" | "launch" | "trend" | "news";

export type PulseStory = {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  sourceDomain: string;
  publishedAt: string;
  category: StoryCategory;
  imageUrl: string | null;
};

type RssFeed = { name: string; url: string; domain: string };

const RSS_FEEDS: RssFeed[] = [
  { name: "YourStory", url: "https://yourstory.com/feed", domain: "yourstory.com" },
  { name: "Inc42", url: "https://inc42.com/feed/", domain: "inc42.com" },
  { name: "Entrackr", url: "https://entrackr.com/feed/", domain: "entrackr.com" },
  { name: "TechCrunch India", url: "https://techcrunch.com/tag/india/feed/", domain: "techcrunch.com" },
  { name: "Hacker News", url: "https://news.ycombinator.com/rss", domain: "news.ycombinator.com" },
];

const PULSE_CACHE_TTL_MS = 1000 * 60 * 60;
type PulseCacheEntry = { expiresAt: number; stories: PulseStory[] };
const pulseCache = new Map<string, PulseCacheEntry>();

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  cdataPropName: "__cdata",
  allowBooleanAttributes: true,
});

export async function getStartupPulse(): Promise<{
  stories: PulseStory[];
  fetchedAt: string;
  sources: { name: string; ok: boolean }[];
}> {
  const CACHE_KEY = "pulse:all";
  const cached = pulseCache.get(CACHE_KEY);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      stories: cached.stories,
      fetchedAt: new Date(cached.expiresAt - PULSE_CACHE_TTL_MS).toISOString(),
      sources: RSS_FEEDS.map((f) => ({ name: f.name, ok: true })),
    };
  }

  const results = await Promise.allSettled(RSS_FEEDS.map((feed) => fetchFeed(feed)));

  const allStories: PulseStory[] = [];
  const sources: { name: string; ok: boolean }[] = [];

  results.forEach((result, i) => {
    const feed = RSS_FEEDS[i];
    if (result.status === "fulfilled") {
      allStories.push(...result.value);
      sources.push({ name: feed.name, ok: true });
    } else {
      sources.push({ name: feed.name, ok: false });
    }
  });

  const seen = new Set<string>();
  const deduped = allStories
    .filter((s) => { if (seen.has(s.url)) return false; seen.add(s.url); return true; })
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 80);

  pulseCache.set(CACHE_KEY, { stories: deduped, expiresAt: Date.now() + PULSE_CACHE_TTL_MS });
  return { stories: deduped, fetchedAt: new Date().toISOString(), sources };
}

async function fetchFeed(feed: RssFeed): Promise<PulseStory[]> {
  const response = await fetch(feed.url, {
    headers: { "User-Agent": "Hemlo/1.0 startup pulse aggregator", Accept: "application/rss+xml, application/xml, text/xml" },
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 3600 },
  });
  if (!response.ok) throw new Error(`${feed.url} returned ${response.status}`);
  const xml = await response.text();
  const parsed = parser.parse(xml);
  const channel = parsed?.rss?.channel ?? parsed?.feed ?? parsed?.["rdf:RDF"]?.channel;
  if (!channel) throw new Error(`${feed.url}: could not find RSS channel`);
  const rawItems: unknown[] = Array.isArray(channel.item) ? channel.item : channel.item ? [channel.item] : Array.isArray(channel.entry) ? channel.entry : channel.entry ? [channel.entry] : [];
  return rawItems.map((item) => parseRssItem(item, feed)).filter((s): s is PulseStory => s !== null).slice(0, 20);
}

function parseRssItem(item: unknown, feed: RssFeed): PulseStory | null {
  if (typeof item !== "object" || item === null) return null;
  const raw = item as Record<string, unknown>;
  const title = extractText(raw.title);
  const url = extractText(raw.link) ?? extractAttr(raw.link, "href") ?? extractText(raw.guid);
  const description = extractText(raw.description) ?? extractText(raw.summary) ?? extractText(raw.content) ?? "";
  const pubDate = extractText(raw.pubDate) ?? extractText(raw.published) ?? extractText(raw.updated) ?? new Date().toISOString();
  if (!title || !url) return null;
  const publishedAt = parseDate(pubDate);
  if (!publishedAt) return null;
  if (Date.now() - new Date(publishedAt).getTime() > 30 * 24 * 3600 * 1000) return null;
  return {
    id: url,
    title: stripHtml(title).trim(),
    description: stripHtml(description).slice(0, 280),
    url,
    source: feed.name,
    sourceDomain: feed.domain,
    publishedAt,
    category: detectCategory(title, description),
    imageUrl: extractImageUrl(raw),
  };
}

function detectCategory(title: string, description: string): StoryCategory {
  const text = `${title} ${description}`.toLowerCase();
  if (/\braised\b|\bfunding\b|\bseries [a-e]\b|\bseed round\b|\bcrore\b|\bmillion\b|\binvestment\b/.test(text)) return "funding";
  if (/\blaunched\b|\bannounces\b|\bnew product\b|\bintroducing\b|\brolls out\b/.test(text)) return "launch";
  if (/\bbooming\b|\bsurge\b|\bgrowth\b|\brecord\b|\btrending\b|\bsoaring\b/.test(text)) return "trend";
  return "news";
}

function extractText(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    return extractText(obj["__cdata"]) ?? extractText(obj["#text"]) ?? extractText(obj["_"]) ?? null;
  }
  return null;
}

function extractAttr(value: unknown, attr: string): string | null {
  if (typeof value === "object" && value !== null) {
    return extractText((value as Record<string, unknown>)[`@_${attr}`]);
  }
  return null;
}

function extractImageUrl(raw: Record<string, unknown>): string | null {
  const mc = raw["media:content"] as Record<string, unknown> | undefined;
  if (mc) { const u = extractAttr(mc, "url"); if (u) return u; }
  const enc = raw.enclosure as Record<string, unknown> | undefined;
  if (enc) { const t = extractAttr(enc, "type") ?? ""; const u = extractAttr(enc, "url") ?? ""; if (u && t.startsWith("image")) return u; }
  const img = raw.image as Record<string, unknown> | undefined;
  if (img) { const u = extractText(img.url); if (u) return u; }
  return null;
}

function parseDate(raw: string): string | null {
  try { const d = new Date(raw); if (isNaN(d.getTime())) return null; return d.toISOString(); } catch { return null; }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/\s{2,}/g, " ").trim();
}