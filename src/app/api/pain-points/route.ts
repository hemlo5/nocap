import { getMarketProblems } from "@/lib/services/pain-points";
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const data = await getMarketProblems();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch market problems" }, { status: 500 });
  }
}