import { getNearbyJobs } from "@/lib/services/jobs";
import { nearbyJobsSchema, zodErrorResponse } from "@/lib/validation";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = nearbyJobsSchema.safeParse(
    Object.fromEntries(url.searchParams.entries()),
  );

  if (!parsed.success) {
    return zodErrorResponse(parsed.error);
  }

  const data = parsed.data;
  const response = await getNearbyJobs({
    lat: data.lat,
    lng: data.lng,
    radius: data.radius,
    sourceProvider: data.source_provider,
    employmentType: data.employment_type,
    field: data.field,
    workMode: data.work_mode,
    salaryMin: data.salary_min ?? null,
    freshness: data.freshness,
    query: data.query,
    startupOnly: data.startup_only,
    studentRelevantOnly: data.student_relevant,
    startupRoleType: data.startup_role_type,
    showRemoteOnMap: data.show_remote_on_map,
    page: data.page,
    limit: data.limit,
  });

  return Response.json(response, {
    headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
  });
}
