import { redirect } from "next/navigation";
import { requireAuth } from "@/core/server/session";
import { prisma } from "@/core/server/prisma";
import { getPostLoginPath } from "@/core/utils/workspace-path";
import { OnboardingFlow } from "@/modules/onboarding/components/OnboardingFlow";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const authenticated = await requireAuth();
  if (!authenticated) redirect("/login?reason=session_required");
  const requestedNext = (await searchParams).next;
  const destination = getPostLoginPath(authenticated.user.email, authenticated.user.role, requestedNext);
  if (authenticated.user.onboardingCompletedAt) redirect(destination);
  const notificationSettings = await prisma.userNotificationSettings.findUnique({ where: { userId: authenticated.user.id }, select: { dailyReminderTime: true } });
  const name = authenticated.user.firstName || authenticated.user.name?.split(" ")[0] || "your";
  return <OnboardingFlow name={name} initialGoal={authenticated.user.learningGoal} initialDailyGoalMinutes={authenticated.user.dailyGoalMinutes} initialPlacementTest={authenticated.user.takePlacementTest} initialReminderTime={notificationSettings?.dailyReminderTime ?? null} destination={destination} />;
}
