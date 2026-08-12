import { NextResponse } from "next/server";
import { listPublicLeaderboard } from "@/modules/motivation/services/motivation.service";

export async function GET() {
  return NextResponse.json({ data: await listPublicLeaderboard() }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
}
