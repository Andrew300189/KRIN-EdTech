import { requireRole } from "@/core/server/role-guard";
import { listLearnerCourses } from "@/modules/courses/services/learner-course.service";
import { StudentCoursesClient } from "./StudentCoursesClient";

/**
 * Render the initial library on the server so the learner lands on useful
 * content immediately, rather than waiting for a second browser request.
 */
export default async function StudentCoursesPage() {
  const guard = await requireRole(["student"]);
  if (!guard.ok) return null;

  try {
    const courses = await listLearnerCourses(guard.user.id);
    return <StudentCoursesClient initialCourses={courses} />;
  } catch {
    return <StudentCoursesClient initialCourses={[]} initialError="Unable to load your courses right now." />;
  }
}
