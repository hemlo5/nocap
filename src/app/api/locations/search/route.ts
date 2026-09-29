import { searchLocations } from "@/lib/services/geocoding";
import { searchSchema, zodErrorResponse } from "@/lib/validation";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = searchSchema.safeParse({ q: url.searchParams.get("q") ?? "" });

  if (!parsed.success) {
    return zodErrorResponse(parsed.error);
  }

  try {
    const results = await searchLocations(parsed.data.q);
    return Response.json({ results });
  } catch {
    return Response.json(
      {
        error:
          "We couldn't find that location. Try entering a city, neighborhood or PIN code.",
      },
      { status: 502 },
    );
  }
}
