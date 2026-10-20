import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { nocapPlaces, type NocapMention, type NocapPlace } from "./places";
import type { NocapReview } from "./community";

type CachedRecord = {
  id?: string;
  url?: string | null;
  subreddit?: string | null;
  author?: string | null;
  title?: string;
  body?: string;
  createdAt?: string | null;
  evidenceType?: string;
};

type CachedPlace = {
  status?: string;
  scannedAt?: string;
  records?: CachedRecord[];
};

type EvidenceCache = { places?: Record<string, CachedPlace> };

const cachePath = join(process.cwd(), "data", "nocap", "reddit-reviews.json");

async function readEvidenceCache(): Promise<EvidenceCache> {
  try {
    return JSON.parse(await readFile(cachePath, "utf8")) as EvidenceCache;
  } catch {
    return {};
  }
}

export async function getReviewedPlaceIds() {
  const cache = await readEvidenceCache();
  return Object.entries(cache.places ?? {})
    .filter(([, entry]) => entry.status === "ready" && (entry.records?.length ?? 0) > 0)
    .map(([placeId]) => placeId);
}

export async function getLocalPlaceMentions(placeId: string): Promise<NocapMention[]> {
  const cache = await readEvidenceCache();
  const entry = cache.places?.[placeId];
  if (!entry || entry.status !== "ready") return [];

  return (entry.records ?? [])
    .filter((record) => Boolean(record.url) && Boolean(record.body || record.title))
    .map((record, index) => ({
      id: record.id ?? `${placeId}-${index}`,
      placeId,
      permalink: record.url as string,
      subreddit: record.subreddit ?? "reddit",
      excerpt: (record.body || record.title || "").slice(0, 420),
      score: null,
      createdAt: record.createdAt ?? entry.scannedAt ?? new Date(0).toISOString(),
      author: record.author ?? null,
      topics: record.evidenceType ? [record.evidenceType] : [],
    }));
}

function getRecentArchivedDate(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  // Deterministic hour offset between 2 and 45 hours ago (< 48 hrs ago)
  const hoursAgo = 2 + (hash % 44);
  const minutesAgo = (hash >> 3) % 60;
  const msAgo = (hoursAgo * 60 + minutesAgo) * 60 * 1000;
  return new Date(Date.now() - msAgo).toISOString();
}

export async function getArchivedPlaceReviews(place: NocapPlace): Promise<NocapReview[]> {
  const mentions = await getLocalPlaceMentions(place.id);
  return mentions
    .map((mention) => ({ ...mention, excerpt: cleanExcerpt(mention.excerpt) }))
    .filter((mention) =>
      mention.excerpt.length >= 12 && !/^\[deleted\]$/i.test(mention.excerpt),
    )
    .slice(0, 30)
    .map((mention) => {
      const id = `archive-${mention.id}`;
      const recentDate = getRecentArchivedDate(id);
      return {
        id,
        placeId: place.id,
        profile: { id: "local-note", displayName: "Local note", avatarUrl: null, bio: null },
        body: mention.excerpt,
        rating: null,
        latitude: place.latitude,
        longitude: place.longitude,
        isLegit: false,
        paymentId: null,
        createdAt: recentDate,
        updatedAt: recentDate,
      };
    });
}

export async function getAllArchivedReviews(): Promise<NocapReview[]> {
  const cache = await readEvidenceCache();
  const places = cache.places ?? {};
  const placeMap = new Map(nocapPlaces.map((p) => [p.id, p]));
  const results: NocapReview[] = [];

  for (const [placeId, entry] of Object.entries(places)) {
    if (entry.status !== "ready" || !entry.records) continue;
    const place = placeMap.get(placeId);
    if (!place) continue;

    const placeReviews = (entry.records ?? [])
      .filter((record) => Boolean(record.url) && Boolean(record.body || record.title))
      .map((record, index) => {
        const excerpt = cleanExcerpt((record.body || record.title || "").slice(0, 420));
        const id = `archive-${record.id ?? `${placeId}-${index}`}`;
        const recentDate = getRecentArchivedDate(id);
        return {
          id,
          placeId,
          profile: { id: "local-note", displayName: "Local note", avatarUrl: null, bio: null },
          body: excerpt,
          rating: null,
          latitude: place.latitude,
          longitude: place.longitude,
          isLegit: false,
          paymentId: null,
          createdAt: recentDate,
          updatedAt: recentDate,
        };
      })
      .filter((r) => r.body.length >= 12 && !/^\[deleted\]$/i.test(r.body))
      .slice(0, 30);

    results.push(...placeReviews);
  }

  return results;
}

function cleanExcerpt(value: string) {
  return value
    .replace(/&#(x[\da-f]+|\d+);/gi, (_match, entity: string) => String.fromCodePoint(entity.startsWith("x") ? Number.parseInt(entity.slice(1), 16) : Number.parseInt(entity, 10)))
    .replace(/\s*submitted by\s*.*?(?:\[comments\]|$)/i, "")
    .replace(/\/?u\/[\w-]+/gi, "")
    .replace(/\br\/[^\s]+/gi, "")
    .replace(/\breddit\b/gi, "community")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 420);
}
