import { findNocapPlace, type NocapMention, type NocapPlace } from "./places";

type ApifyRunResponse = {
  data?: { id?: string; defaultDatasetId?: string };
};

type ApifyRedditItem = {
  id?: string;
  permalink?: string;
  url?: string;
  subreddit?: string;
  body?: string;
  text?: string;
  title?: string;
  score?: number;
  createdAt?: string;
  created_utc?: number;
  author?: string;
};

type RuntimeStore = {
  mentions: Map<string, NocapMention[]>;
  runs: Map<string, { id: string; datasetId: string; startedAt: string }>;
};

const runtimeStore = globalThis as typeof globalThis & { __nocapStore?: RuntimeStore };

function store() {
  runtimeStore.__nocapStore ??= { mentions: new Map(), runs: new Map() };
  return runtimeStore.__nocapStore;
}

export function getPlaceMentions(placeId: string) {
  return store().mentions.get(placeId) ?? [];
}

export function getPlaceScanStatus(placeId: string) {
  const run = store().runs.get(placeId);
  return run ? { status: "syncing" as const, startedAt: run.startedAt } : { status: "idle" as const };
}

function actorInput(place: NocapPlace) {
  const template = process.env.APIFY_REDDIT_INPUT_JSON?.trim();
  if (!template) {
    throw new Error(
      "APIFY_REDDIT_INPUT_JSON is required because Apify actor input schemas differ. Use {{placeQuery}} in the JSON template.",
    );
  }

  const interpolated = template
    .replaceAll("{{placeQuery}}", place.searchQuery)
    .replaceAll("{{placeName}}", place.name)
    .replaceAll("{{area}}", place.area);
  return JSON.parse(interpolated) as Record<string, unknown>;
}

export async function startPlaceScan(placeId: string) {
  const place = findNocapPlace(placeId);
  if (!place) throw new Error("Place not found.");

  const token = process.env.APIFY_API_TOKEN?.trim();
  const actorId = process.env.APIFY_REDDIT_ACTOR_ID?.trim();
  if (!token || !actorId) {
    throw new Error("APIFY_API_TOKEN and APIFY_REDDIT_ACTOR_ID must be configured.");
  }

  const response = await fetch(
    `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/runs?token=${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(actorInput(place)),
      cache: "no-store",
    },
  );
  if (!response.ok) throw new Error(`Apify rejected the scan (${response.status}).`);

  const payload = (await response.json()) as ApifyRunResponse;
  const runId = payload.data?.id;
  const datasetId = payload.data?.defaultDatasetId;
  if (!runId || !datasetId) throw new Error("Apify did not return a run dataset.");

  store().runs.set(placeId, { id: runId, datasetId, startedAt: new Date().toISOString() });
  return { runId, datasetId };
}

export async function syncFinishedPlaceScan(placeId: string) {
  const activeRun = store().runs.get(placeId);
  if (!activeRun) return { status: "idle" as const, mentions: getPlaceMentions(placeId) };

  const token = process.env.APIFY_API_TOKEN?.trim();
  if (!token) throw new Error("APIFY_API_TOKEN must be configured.");

  const runResponse = await fetch(
    `https://api.apify.com/v2/actor-runs/${activeRun.id}?token=${encodeURIComponent(token)}`,
    { cache: "no-store" },
  );
  if (!runResponse.ok) throw new Error(`Could not read Apify run (${runResponse.status}).`);
  const runPayload = (await runResponse.json()) as { data?: { status?: string } };
  const status = runPayload.data?.status;
  if (status !== "SUCCEEDED") return { status: "syncing" as const, mentions: getPlaceMentions(placeId) };

  const datasetResponse = await fetch(
    `https://api.apify.com/v2/datasets/${activeRun.datasetId}/items?clean=true&format=json&token=${encodeURIComponent(token)}`,
    { cache: "no-store" },
  );
  if (!datasetResponse.ok) throw new Error(`Could not read Apify dataset (${datasetResponse.status}).`);

  const items = (await datasetResponse.json()) as ApifyRedditItem[];
  const mentions = items
    .map((item, index): NocapMention | null => {
      const excerpt = (item.body ?? item.text ?? item.title ?? "").trim();
      const permalink = item.permalink ?? item.url;
      if (!excerpt || !permalink) return null;
      return {
        id: item.id ?? `${placeId}-${index}`,
        placeId,
        permalink: permalink.startsWith("http") ? permalink : `https://www.reddit.com${permalink}`,
        subreddit: item.subreddit ?? "reddit",
        excerpt: excerpt.slice(0, 420),
        score: typeof item.score === "number" ? item.score : null,
        createdAt: item.createdAt ?? (item.created_utc ? new Date(item.created_utc * 1000).toISOString() : new Date().toISOString()),
        author: item.author ?? null,
        topics: [],
      };
    })
    .filter((mention): mention is NocapMention => Boolean(mention));

  store().mentions.set(placeId, mentions);
  store().runs.delete(placeId);
  return { status: "ready" as const, mentions };
}
