import { getStartupPulse } from "@/lib/services/startup-pulse";
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const data = await getStartupPulse();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch startup pulse" }, { status: 500 });
  }
}