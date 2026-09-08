import { redirect } from "next/navigation";
import { requireRole } from "@/core/server/role-guard";
import {
  getRoleWorkspacePath,
  hasCmsAccess,
} from "@/core/utils/workspace-path";
import { WorkspaceShell } from "@/modules/teaching/components/WorkspaceShell";
import { getDashboardLeaderboard } from "@/modules/motivation/services/motivation.service";
import { getWeeklyLeague } from "@/modules/motivation/services/weekly-league.service";

const navigation = [
  { href: "/student", label: "Home", labelKey: "student.nav.home" },
  { href: "/student/courses", label: "My courses", labelKey: "student.nav.courses", notificationSection: "courses" as const },
  { href: "/student/vocabulary", label: "Vocabulary", labelKey: "student.nav.vocabulary", notificationSection: "vocabulary" as const },
  { href: "/student/catalog", label: "Catalog", labelKey: "student.nav.catalog" },
  { href: "/student/homework", label: "Homework", labelKey: "student.nav.homework" },
  { href: "/student/progress", label: "Progress", labelKey: "student.nav.progress" },
  { href: "/student/mistakes", label: "My mistakes", labelKey: "student.nav.mistakes" },
  { href: "/student/achievements", label: "Achievements", labelKey: "student.nav.achievements", notificationSection: "achievements" as const },
  { href: "/student/shop", label: "Shop", labelKey: "student.nav.shop" },
  { href: "/student/support", label: "Support", labelKey: "student.nav.support", notificationSection: "support" as const },
  { href: "/student/settings", label: "Settings", labelKey: "student.nav.settings", notificationSection: "settings" as const },
];

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const guard = await requireRole(["student"]);
  if (!guard.ok)
    redirect(
      guard.status === 401
        ? "/login?reason=session_required"
        : `${getRoleWorkspacePath(guard.role)}?reason=role_required`,
  );
  const showCmsLink = hasCmsAccess(guard.user.email, guard.user.role);
  const [leaderboard, weeklyLeague] = await Promise.all([
    getDashboardLeaderboard(guard.user.id),
    getWeeklyLeague(guard.user.id),
  ]);
  const groupRank = weeklyLeague.members.findIndex((member) => member.isCurrentUser) + 1;
  const leaderboardSummary = {
    rank: leaderboard.current?.rank ?? null,
    participantCount: leaderboard.participantCount,
    league: {
      tier: weeklyLeague.tier,
      groupNumber: weeklyLeague.groupNumber,
      groupRank: Math.max(1, groupRank),
      groupSize: weeklyLeague.members.length,
      movement: weeklyLeague.movement,
    },
  };
  return (
    <WorkspaceShell
      title=""
      navigation={navigation}
      searchContext="STUDENT"
      showCmsLink={showCmsLink}
      showExperience
      shopAvatar={guard.user.equippedShopAvatar}
      leaderboardSummary={leaderboardSummary}
      lockDesktopViewport
    >
      {children}
    </WorkspaceShell>
  );
}
