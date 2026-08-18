import { requireRole } from "@/core/server/role-guard";
import { getStudentProgressOverview } from "@/modules/courses/services/student-progress.service";
import { StudentProgressDashboard } from "./StudentProgressDashboard";

/** Current role-specific progress workspace, backed by saved learning data. */
export default async function StudentProgressPage() {
  const guard = await requireRole(["student"]);
  if (!guard.ok) return null;

  const overview = await getStudentProgressOverview(guard.user.id);
  return <StudentProgressDashboard overview={overview} />;
}
