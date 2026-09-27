import { AchievementsPageContent } from "@/app/profile/achievements/AchievementsPageContent";

export default function StudentAchievementsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; section?: string }>;
}) {
  return <AchievementsPageContent searchParams={searchParams} basePath="/student/achievements" />;
}
