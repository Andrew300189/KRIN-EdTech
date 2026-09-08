import { notFound } from "next/navigation";
import { requireRole } from "@/core/server/role-guard";
import { listLearnerCourses } from "@/modules/courses/services/learner-course.service";
import { learnerCourseContinueHref } from "@/modules/courses/utils/learner-course-path";
import { StudentCourseDetail } from "./StudentCourseDetail";

export default async function StudentCoursePage({ params }: { params: Promise<{ courseSlug: string }> }) {
  const guard = await requireRole(["student"]);
  if (!guard.ok) notFound();

  const { courseSlug } = await params;
  const course = (await listLearnerCourses(guard.user.id)).find((item) => item.slug === courseSlug);
  if (!course) notFound();

  return <StudentCourseDetail course={course} continueHref={learnerCourseContinueHref(course)} />;
}
