import { NextResponse } from "next/server";
import { getPublicLearningStatistics } from "@/modules/analytics/services/platform-statistics.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getPublicLearningStatistics();
  const response = NextResponse.json({ data });
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}
