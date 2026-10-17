import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = process.cwd();
process.loadEnvFile(resolve(root, ".env"));
const cachePath = resolve(root, "data/nocap/reddit-reviews.json");
const placeApiUrl = process.env.NOCAP_PLACE_API_URL ?? "http://localhost:3000/api/nocap/places";
const token = process.env.APIFY_API_TOKEN;
const actorId = process.env.APIFY_REDDIT_ACTOR_ID ?? "FgJtjDwJCLhRH9saM";
const batchSize = Math.max(1, Number(process.env.NOCAP_REDDIT_BATCH_SIZE ?? 1));
const maxPlaces = Number(process.env.NOCAP_REDDIT_MAX_PLACES ?? 0);
const force = process.argv.includes("--force");
const retryBlocked = process.argv.includes("--retry-blocked");

if (!token) throw new Error("APIFY_API_TOKEN must be set before ingesting NoCap Reddit data.");

const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

async function request(url, options = {}) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, { ...options, headers: { ...headers, ...options.headers }, cache: "no-store" });
      if (response.ok) return response.json();
      if (response.status < 500 || attempt === 2) {
        const error = new Error(`Apify request failed (${response.status}) for ${new URL(url).pathname}.`);
        error.status = response.status;
        throw error;
      }
      lastError = new Error(`Apify request failed (${response.status}) for ${new URL(url).pathname}.`);
    } catch (error) {
      if (error && typeof error === "object" && "status" in error && error.status < 500) throw error;
      lastError = error;
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 1_500 * (attempt + 1)));
  }
  throw lastError;
}

async function readCache() {
  try {
    return JSON.parse(await readFile(cachePath, "utf8"));
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return { version: 1, createdAt: new Date().toISOString(), updatedAt: null, places: {} };
    }
    throw error;
  }
}

async function saveCache(cache) {
  cache.updatedAt = new Date().toISOString();
  await mkdir(dirname(cachePath), { recursive: true });
  await writeFile(cachePath, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
}

function normalizeForMatch(value) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isRelevantToPlace(item, place) {
  const text = normalizeForMatch(`${item.title ?? ""} ${item.body ?? ""}`);
  if (!text) return false;
  const phrases = [place.name, ...place.aliases]
    .map(normalizeForMatch)
    .filter((value) => value.length >= 3);
  if (phrases.some((phrase) => text.includes(phrase))) return true;

  const ignoredTerms = new Set(["road", "street", "park", "lake", "gate", "the", "and", "for", "cafe", "hotel"]);
  const meaningfulTerms = normalizeForMatch(place.name)
    .split(" ")
    .filter((term) => term.length >= 4 && !ignoredTerms.has(term));
  return meaningfulTerms.length > 0 && meaningfulTerms.every((term) => text.includes(term));
}

function actorInput(places) {
  return {
    searches: places.map((place) => place.searchQuery || `${place.name} Bengaluru`),
    searchPosts: true,
    searchComments: false,
    searchCommunities: false,
    searchUsers: false,
    searchMedia: false,
    includeNSFW: false,
    skipComments: false,
    skipCommunity: true,
    skipUserPosts: true,
    maxPostCount: 12,
    maxComments: 6,
    maxItems: Math.max(80, places.length * 80),
    maxRequestRetries: 4,
    navigationTimeout: 60,
    scrollTimeout: 30,
    sort: "relevance",
    proxy: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
  };
}

async function waitForRun(runId) {
  const deadline = Date.now() + 20 * 60_000;
  while (Date.now() < deadline) {
    const run = await request(`https://api.apify.com/v2/actor-runs/${encodeURIComponent(runId)}`);
    const status = run.data?.status;
    if (status === "SUCCEEDED") return run.data;
    if (["FAILED", "ABORTED", "TIMED-OUT"].includes(status)) {
      throw new Error(`Apify run ${runId} ended as ${status}.`);
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 8_000));
  }
  throw new Error(`Apify run ${runId} did not finish within 20 minutes.`);
}

function cleanText(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function normalizeItem(item, placeId) {
  const body = cleanText(item.body ?? item.text);
  const title = cleanText(item.title);
  const sourceText = `${title} ${body}`.toLowerCase();
  const kind = /\b(review|recommend|best|must try|worth|food|menu|service|taste|price|visit|experience|crowd|wait|parking)\b/.test(sourceText)
    ? "review"
    : /\b(anyone|where|how|which|what|suggest|recommendation)\b/.test(sourceText)
      ? "question"
      : "mention";
  return {
    id: item.id ?? `${placeId}-${item.parsedId ?? crypto.randomUUID()}`,
    kind: item.dataType === "comment" || item.category === "comment" ? "comment" : "post",
    evidenceType: kind,
    url: item.url ?? item.permalink ?? null,
    subreddit: cleanText(item.parsedCommunityName ?? item.communityName).replace(/^r\//, "") || null,
    author: cleanText(item.username ?? item.author) || null,
    title,
    body,
    createdAt: item.createdAt ?? null,
    scrapedAt: item.scrapedAt ?? null,
    postId: item.postId ?? null,
  };
}

function mergePlaceRecords(place, cache, newRecords, runId, datasetId) {
  const existingRecords = cache.places[place.id]?.records ?? [];
  const recordsById = new Map(existingRecords.map((record) => [record.id, record]));
  newRecords.forEach((record) => recordsById.set(record.id, record));
  const records = [...recordsById.values()];
  cache.places[place.id] = {
    place: { id: place.id, name: place.name, area: place.area, searchQuery: place.searchQuery },
    status: "ready",
    runId,
    datasetId,
    scannedAt: new Date().toISOString(),
    records,
  };
  return records.length;
}

async function scanBatch(places, cache) {
  const started = await request(`https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/runs`, {
    method: "POST",
    body: JSON.stringify(actorInput(places)),
  });
  const runId = started.data?.id;
  if (!runId) throw new Error("Apify did not return a run id.");
  const completed = await waitForRun(runId);
  const datasetId = completed.defaultDatasetId ?? started.data?.defaultDatasetId;
  if (!datasetId) throw new Error(`Run ${runId} completed without a dataset.`);
  const items = await request(`https://api.apify.com/v2/datasets/${encodeURIComponent(datasetId)}/items?clean=true&format=json`);
  const counts = places.map((place) => {
    const newRecords = Array.isArray(items)
      ? items.filter((item) => isRelevantToPlace(item, place)).map((item) => normalizeItem(item, place.id))
      : [];
    return { place, count: mergePlaceRecords(place, cache, newRecords, runId, datasetId) };
  });
  await saveCache(cache);
  return counts;
}

async function main() {
  const placesResponse = await fetch(placeApiUrl, { cache: "no-store" });
  if (!placesResponse.ok) throw new Error(`Could not load NoCap places from ${placeApiUrl}. Start the app first or set NOCAP_PLACE_API_URL.`);
  const payload = await placesResponse.json();
  const allPlaces = Array.isArray(payload.places) ? payload.places : [];
  const cache = await readCache();
  const pending = allPlaces.filter((place) => {
    const previous = cache.places[place.id];
    const status = previous?.status;
    const blockedByBilling = status === "blocked" || previous?.error?.includes("(402)");
    return force || (status !== "ready" && (retryBlocked || !blockedByBilling));
  });
  const queue = maxPlaces > 0 ? pending.slice(0, maxPlaces) : pending;
  let cursor = 0;
  let completed = 0;
  let billingBlocked = false;

  while (!billingBlocked && cursor < queue.length) {
    const batch = queue.slice(cursor, cursor + batchSize);
    cursor += batch.length;
    try {
      const results = await scanBatch(batch, cache);
      completed += batch.length;
      console.log(`[${completed}/${queue.length}] ${results.map(({ place, count }) => `${place.name}: ${count}`).join(" | ")}`);
    } catch (error) {
      const blocked = error && typeof error === "object" && "status" in error && error.status === 402;
      if (blocked) billingBlocked = true;
      for (const place of batch) {
        cache.places[place.id] = { place: { id: place.id, name: place.name, area: place.area, searchQuery: place.searchQuery }, status: blocked ? "blocked" : "failed", scannedAt: new Date().toISOString(), error: error instanceof Error ? error.message : "Unknown error", records: cache.places[place.id]?.records ?? [] };
      }
      await saveCache(cache);
      console.error(`[${completed}/${queue.length}] ${batch.map((place) => place.name).join(", ")}: ${blocked ? "blocked by Apify billing" : "failed"}`);
    }
  }

  const ready = Object.values(cache.places).filter((entry) => entry.status === "ready");
  const records = ready.reduce((total, entry) => total + entry.records.length, 0);
  console.log(`Saved ${records} Reddit records across ${ready.length}/${allPlaces.length} NoCap places to ${cachePath}.`);
  if (billingBlocked) console.error("Stopped because Apify returned 402. Add credits, then rerun with --retry-blocked.");
}

await main();
