import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireContentManager } from "@/modules/courses/server/content-access";
import { adjustUserRewards } from "@/modules/motivation/services/motivation.service";

export async function POST(request: NextRequest) {
  const guard = await requireContentManager(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try { return NextResponse.json({ data: await adjustUserRewards(guard.user.id, await request.json()) }); }
  catch (error) { if (error instanceof ZodError) return NextResponse.json({ error: "Invalid adjustment", issues: error.issues }, { status: 400 }); return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to adjust rewards" }, { status: 400 }); }
}
