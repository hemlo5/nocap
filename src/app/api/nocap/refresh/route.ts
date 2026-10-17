import { startPlaceScan } from "@/lib/nocap/reddit";
import { requireBearerSecret } from "@/lib/validation";

export async function POST(request: Request) {
  const authError = requireBearerSecret(request, "ADMIN_TOKEN");
  if (authError) return authError;

  const body = (await request.json().catch(() => null)) as { placeId?: unknown } | null;
  if (!body || typeof body.placeId !== "string") {
    return Response.json({ error: "placeId is required" }, { status: 400 });
  }

  try {
    const run = await startPlaceScan(body.placeId);
    return Response.json({ status: "started", ...run }, { status: 202 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not start scan." },
      { status: 500 },
    );
  }
}
