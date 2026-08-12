import { redirect } from "next/navigation";
import { requireRole } from "@/core/server/role-guard";
import {
  getRoleWorkspacePath,
  hasCmsAccess,
} from "@/core/utils/workspace-path";
import { WorkspaceShell } from "@/modules/teaching/components/WorkspaceShell";

const navigation = [
  { href: "/student", label: "Home" },
  { href: "/student/courses", label: "My courses" },
  { href: "/student/catalog", label: "Catalog" },
  { href: "/student/levels", label: "Levels A1–C2" },
  { href: "/student/search", label: "Search" },
  { href: "/student/academies", label: "Academies" },
  { href: "/student/homework", label: "Homework" },
  { href: "/student/progress", label: "Progress" },
  { href: "/student/vocabulary", label: "Vocabulary" },
  { href: "/student/mistakes", label: "My mistakes" },
  { href: "/student/achievements", label: "Achievements" },
  { href: "/student/notifications", label: "Notifications" },
  { href: "/student/billing", label: "Billing" },
  { href: "/student/support", label: "Support" },
  { href: "/student/settings", label: "Settings" },
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
      title="Learning space"
      navigation={navigation}
      searchContext="STUDENT"
      showCmsLink={showCmsLink}
    >
      {children}
    </WorkspaceShell>
  );
}
