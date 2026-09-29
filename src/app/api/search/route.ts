import { getNearbyJobs } from "@/lib/services/jobs";
import { nearbyJobsSchema, zodErrorResponse } from "@/lib/validation";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = nearbyJobsSchema.safeParse({
    lat: url.searchParams.get("lat") ?? "12.9716",
    lng: url.searchParams.get("lng") ?? "77.5946",
    radius: url.searchParams.get("radius") ?? "50",
    employment_type: url.searchParams.get("employment_type") ?? "all",
    field: url.searchParams.get("field") ?? "all",
    work_mode: url.searchParams.get("work_mode") ?? "any",
    freshness: url.searchParams.get("freshness") ?? "any",
    query: url.searchParams.get("q") ?? url.searchParams.get("query") ?? "",
    page: url.searchParams.get("page") ?? "1",
    limit: url.searchParams.get("limit") ?? "25",
  });

  if (!parsed.success) {
    return zodErrorResponse(parsed.error);
  }

  const data = parsed.data;
  return Response.json(
    await getNearbyJobs({
      lat: data.lat,
      lng: data.lng,
      radius: data.radius,
      employmentType: data.employment_type,
      field: data.field,
      workMode: data.work_mode,
      salaryMin: data.salary_min ?? null,
      freshness: data.freshness,
      query: data.query,
      page: data.page,
      limit: data.limit,
    }),
  );
}
