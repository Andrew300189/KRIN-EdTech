import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { updateMotivationSettings } from "@/modules/motivation/services/motivation.service";

export async function PATCH(request: NextRequest) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try { return NextResponse.json({ data: await updateMotivationSettings(guard.user.id, await request.json()) }); }
  catch (error) { if (error instanceof ZodError) return NextResponse.json({ error: "Invalid motivation settings", issues: error.issues }, { status: 400 }); return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save settings" }, { status: 400 }); }
}
