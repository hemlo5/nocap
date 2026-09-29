import { getCompanies } from "@/lib/services/jobs";

export async function GET(_request: Request, context: RouteContext<"/api/companies/[id]">) {
  const { id } = await context.params;
  const companies = await getCompanies();
  const company = companies.find((item) => item.id === decodeURIComponent(id));

  if (!company) {
    return Response.json({ error: "Company not found" }, { status: 404 });
  }

  return Response.json({ company });
}
