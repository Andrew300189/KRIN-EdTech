import { redirect } from "next/navigation";

export default async function AdminCourseModulesPage({ params }: { params: Promise<{ courseId: string }> }) {
  redirect(`/admin/courses/${(await params).courseId}`);
}
