import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/core/server/prisma";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { createLessonBlockSchema } from "@/modules/courses/schemas/content.schemas";
import { createLessonBlock } from "@/modules/courses/services/content.service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const lesson = await prisma.lesson.findUnique({
    where: { id: (await params).lessonId },
    include: {
      blocks: {
        orderBy: { order: "asc" },
        include: { exercises: { orderBy: { order: "asc" } } },
      },
    },
  });
  return lesson ? NextResponse.json({ data: lesson }) : NextResponse.json({ error: "Lesson not found" }, { status: 404 });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const input = createLessonBlockSchema.parse(await request.json());
    const block = await createLessonBlock(guard.user.id, (await params).lessonId, input);
    return NextResponse.json({ data: block }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid lesson block data", issues: error.issues }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create lesson block" }, { status: 400 });
  }
}
