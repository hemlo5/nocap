import { getCompanies } from "@/lib/services/jobs";

export async function GET() {
  return Response.json({ companies: await getCompanies() });
}
