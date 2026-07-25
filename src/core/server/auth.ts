import { prisma } from "@/core/server/prisma";
import { getSessionUserId } from "@/core/server/session";

export async function getCurrentUser() {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      emailVerified: true,
      targetLanguage: true,
      learningGoal: true,
      currentLevel: true,
      dailyIntensityMinutes: true,
      dailyGoalMinutes: true,
      takePlacementTest: true,
      onboardingCompletedAt: true,
      welcomeBonusPoints: true,
      guidedTourCompleted: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  return user;
}
