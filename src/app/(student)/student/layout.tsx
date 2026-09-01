import { redirect } from "next/navigation";
import { requireRole } from "@/core/server/role-guard";
import {
  getRoleWorkspacePath,
  hasCmsAccess,
} from "@/core/utils/workspace-path";
import { WorkspaceShell } from "@/modules/teaching/components/WorkspaceShell";

const navigation = [
  { href: "/student", label: "Home" },
  { href: "/student/courses", label: "My courses", notificationSection: "courses" as const },
  { href: "/student/vocabulary", label: "Vocabulary", notificationSection: "vocabulary" as const },
  { href: "/student/catalog", label: "Catalog" },
  { href: "/student/homework", label: "Homework" },
  { href: "/student/progress", label: "Progress" },
  { href: "/student/mistakes", label: "My mistakes" },
  { href: "/student/achievements", label: "Achievements", notificationSection: "achievements" as const },
  { href: "/student/support", label: "Support", notificationSection: "support" as const },
  { href: "/student/settings", label: "Settings", notificationSection: "settings" as const },
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
