import { redirect } from "next/navigation";
import { requireRole } from "@/core/server/role-guard";
import {
  getRoleWorkspacePath,
  hasCmsAccess,
} from "@/core/utils/workspace-path";
import { WorkspaceShell } from "@/modules/teaching/components/WorkspaceShell";

const navigation = [
  { href: "/student", label: "Home", labelKey: "student.nav.home" },
  { href: "/student/courses", label: "My courses", labelKey: "student.nav.courses", notificationSection: "courses" as const },
  { href: "/student/vocabulary", label: "Vocabulary", labelKey: "student.nav.vocabulary", notificationSection: "vocabulary" as const },
  { href: "/student/catalog", label: "Catalog", labelKey: "student.nav.catalog" },
  { href: "/student/homework", label: "Homework", labelKey: "student.nav.homework" },
  { href: "/student/progress", label: "Progress", labelKey: "student.nav.progress" },
  { href: "/student/mistakes", label: "My mistakes", labelKey: "student.nav.mistakes" },
  { href: "/student/achievements", label: "Achievements", labelKey: "student.nav.achievements", notificationSection: "achievements" as const },
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
  return (
    <WorkspaceShell
      title=""
      navigation={navigation}
      searchContext="STUDENT"
      showCmsLink={showCmsLink}
      showExperience
      lockDesktopViewport
    >
      {children}
    </WorkspaceShell>
  );
}
