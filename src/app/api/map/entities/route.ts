import { getMapEntities } from "@/lib/services/map-entities";
import { mapEntitiesSchema, zodErrorResponse } from "@/lib/validation";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = mapEntitiesSchema.safeParse(
    Object.fromEntries(url.searchParams.entries()),
  );

  if (!parsed.success) {
    return zodErrorResponse(parsed.error);
  }

  const data = parsed.data;
  const response = await getMapEntities({
    lat: data.lat,
    lng: data.lng,
    radius: data.radius,
    layers: data.layers,
    limit: data.limit,
  });

  return Response.json(response, {
    headers: {
      "Cache-Control": "public, max-age=1800, stale-while-revalidate=86400",
    },
  });
}
