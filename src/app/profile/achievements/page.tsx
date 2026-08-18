import { AchievementsPageContent, type AchievementSearchParams } from "./AchievementsPageContent";

export default async function ProfileAchievementsPage({ searchParams }: { searchParams: AchievementSearchParams }) {
  return <AchievementsPageContent searchParams={searchParams} />;
}
