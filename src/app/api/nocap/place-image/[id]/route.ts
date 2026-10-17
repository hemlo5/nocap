import { findNocapPlace } from "@/lib/nocap/places";

type CommonsResponse = {
  query?: { pages?: Record<string, { imageinfo?: Array<{ thumburl?: string }> }> };
};

type ArticleResponse = {
  query?: { pages?: Record<string, { thumbnail?: { source?: string } }> };
};

export async function GET(_request: Request, context: RouteContext<"/api/nocap/place-image/[id]">) {
  const { id } = await context.params;
  const place = findNocapPlace(id);
  if (!place) return fallback("?");
  const query = `${place.name} ${place.area} Bengaluru`;
  const articleUrl = new URL("https://en.wikipedia.org/w/api.php");
  articleUrl.searchParams.set("action", "query");
  articleUrl.searchParams.set("format", "json");
  articleUrl.searchParams.set("generator", "search");
  articleUrl.searchParams.set("gsrsearch", query);
  articleUrl.searchParams.set("gsrnamespace", "0");
  articleUrl.searchParams.set("gsrlimit", "1");
  articleUrl.searchParams.set("prop", "pageimages");
  articleUrl.searchParams.set("pithumbsize", "96");
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("generator", "search");
  url.searchParams.set("gsrsearch", query);
  url.searchParams.set("gsrnamespace", "6");
  url.searchParams.set("gsrlimit", "1");
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "url");
  url.searchParams.set("iiurlwidth", "96");

  try {
    const articleResponse = await fetch(articleUrl, { next: { revalidate: 60 * 60 * 24 * 30 }, headers: { "User-Agent": "NoCap place map/0.1" } });
    const articlePayload = await articleResponse.json() as ArticleResponse;
    const articleThumbnail = Object.values(articlePayload.query?.pages ?? {}).find((page) => page.thumbnail?.source)?.thumbnail?.source;
    if (articleThumbnail) return Response.redirect(articleThumbnail, 307);
    const response = await fetch(url, { next: { revalidate: 60 * 60 * 24 * 30 }, headers: { "User-Agent": "NoCap place map/0.1" } });
    const payload = await response.json() as CommonsResponse;
    const thumbnail = Object.values(payload.query?.pages ?? {}).flatMap((page) => page.imageinfo ?? []).find((image) => image.thumburl)?.thumburl;
    if (thumbnail) return Response.redirect(thumbnail, 307);
  } catch {}
  return fallback(place.name.slice(0, 1).toUpperCase(), place.category);
}

function fallback(label: string, category: string = "culture") {
  const colorMap: Record<string, string[]> = {
    eat: ["#F97316", "#F43F5E"],
    street: ["#2563EB", "#06B6D4"],
    park: ["#15803D", "#84CC16"],
    culture: ["#7C3AED", "#EC4899"],
    other: ["#D97706", "#F59E0B"],
  };
  const colors = colorMap[category] || ["#7C3AED", "#EC4899"];
  const safeLabel = label.replace(/[<&>]/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient></defs><rect width="64" height="64" fill="url(#g)"/><path d="M0 48C16 35 28 56 64 30V64H0Z" fill="white" fill-opacity=".18"/><circle cx="47" cy="17" r="8" fill="white" fill-opacity=".2"/><text x="32" y="40" text-anchor="middle" font-family="Arial,sans-serif" font-size="28" font-weight="700" fill="white">${safeLabel}</text></svg>`;
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" } });
}
