import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/core/server/prisma";
import { requireAuth } from "@/core/server/session";

export const runtime = "nodejs";

const onboardingSchema = z.object({
  learningGoal: z.enum(["GENERAL", "CONVERSATION", "TRAVEL", "CAREER", "EXAMS"]).default("GENERAL"),
  dailyGoalMinutes: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(20), z.literal(30), z.literal(45), z.literal(60)]),
  takePlacementTest: z.boolean().default(false),
  dailyReminderTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
});

export async function POST(request: Request) {
  const authenticated = await requireAuth();
  if (!authenticated) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });

  try {
    const input = onboardingSchema.parse(await request.json());
    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: authenticated.user.id },
        data: {
          learningGoal: input.learningGoal,
          dailyGoalMinutes: input.dailyGoalMinutes,
          dailyIntensityMinutes: input.dailyGoalMinutes,
          takePlacementTest: input.takePlacementTest,
          onboardingCompletedAt: new Date(),
        },
        select: { learningGoal: true, dailyGoalMinutes: true, takePlacementTest: true, onboardingCompletedAt: true },
      });

      await tx.userNotificationSettings.upsert({
        where: { userId: authenticated.user.id },
        create: {
          userId: authenticated.user.id,
          locale: authenticated.user.interfaceLanguage,
          timezone: authenticated.user.timeZone,
          dailyReminderTime: input.dailyReminderTime ?? null,
          learningEnabled: true,
        },
        update: {
          dailyReminderTime: input.dailyReminderTime ?? null,
          locale: authenticated.user.interfaceLanguage,
          timezone: authenticated.user.timeZone,
        },
      });

      return updated;
    });

    return NextResponse.json({ data: user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Choose a learning goal and a daily study pace." }, { status: 400 });
    }
    return NextResponse.json({ error: "We could not save your learning plan. Please try again." }, { status: 500 });
  }
}
