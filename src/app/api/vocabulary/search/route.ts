import { NextRequest, NextResponse } from "next/server";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { searchCentralWords } from "@/modules/vocabulary/services/vocabulary.service";

export async function GET(request: NextRequest) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const query = request.nextUrl.searchParams.get("q") ?? "";
  return NextResponse.json({ data: await searchCentralWords(query) });
}
