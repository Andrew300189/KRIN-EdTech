import { redirect } from "next/navigation";
import { requireRole } from "@/core/server/role-guard";
import {
  getRoleWorkspacePath,
  hasCmsAccess,
} from "@/core/utils/workspace-path";
import { WorkspaceShell } from "@/modules/teaching/components/WorkspaceShell";

const navigation = [
  { href: "/teacher", label: "Overview" },
  { href: "/teacher/groups", label: "Groups" },
  { href: "/teacher/students", label: "Students" },
  { href: "/teacher/courses", label: "Courses" },
  { href: "/teacher/assignments", label: "Assignments" },
  { href: "/teacher/reviews", label: "Reviews" },
  { href: "/teacher/analytics", label: "Analytics" },
  { href: "/teacher/settings", label: "Settings" },
];

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const guard = await requireRole(["teacher"]);
  if (!guard.ok)
    redirect(
      guard.status === 401
        ? "/login?reason=session_required"
        : `${getRoleWorkspacePath(guard.role)}?reason=role_required`,
    );
  const showCmsLink = hasCmsAccess(guard.user.email, guard.user.role);
  return (
    <WorkspaceShell
      title="Teacher workspace"
      navigation={navigation}
      searchContext="TEACHER"
      showCmsLink={showCmsLink}
    >
      {children}
    </WorkspaceShell>
  );
}
