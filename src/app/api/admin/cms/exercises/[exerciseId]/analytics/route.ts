import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { getCmsExerciseAnalytics, validateExerciseConfiguration } from "@/modules/cms/services/exercise-operations.service";
import { prisma } from "@/core/server/prisma";

export async function GET(request: NextRequest, { params }: { params: Promise<{ exerciseId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const exercise = await prisma.exercise.findUnique({ where: { id: (await params).exerciseId }, select: { type: true, engineKey: true, instruction: true, question: true, content: true, correctAnswer: true } });
  if (!exercise) return NextResponse.json({ error: "Exercise not found." }, { status: 404 });
  try {
    return NextResponse.json({ data: { analytics: await getCmsExerciseAnalytics((await params).exerciseId), configurationIssues: validateExerciseConfiguration(exercise) } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load exercise analytics." }, { status: 400 });
  }
}
