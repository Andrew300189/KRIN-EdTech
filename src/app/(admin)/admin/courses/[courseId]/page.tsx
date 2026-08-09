import Link from "next/link";
import { notFound } from "next/navigation";
import { CmsLifecycleControls } from "@/modules/cms/components/CmsLifecycleControls";
import { AdminLessonForm, AdminModuleForm } from "@/modules/courses/components/admin/ContentForms";
import { getManagedCourse } from "@/modules/courses/services/content.service";

export default async function AdminCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const course = await getManagedCourse((await params).courseId);
  if (!course) notFound();
  return <div><Link href="/admin/courses" className="text-sm font-semibold text-blue-700 hover:underline">← Courses</Link><div className="mt-4 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold">{course.title}</h1><p className="mt-2 text-gray-600">{course.shortDescription}</p></div><CmsLifecycleControls entityType="COURSE" entityId={course.id} status={course.contentStatus} /></div><AdminModuleForm courseId={course.id} /><section className="mt-8 space-y-4"><h2 className="text-2xl font-bold">Modules</h2>{course.modules.length === 0 ? <p className="rounded-xl border border-dashed border-gray-300 p-5 text-gray-600">Create a module to add lessons.</p> : course.modules.map((module) => <article key={module.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="text-xl font-bold">{module.order}. {module.title}</h3>{module.description ? <p className="mt-1 text-gray-600">{module.description}</p> : null}<p className="mt-2 text-sm text-gray-500">{module._count.lessons} lessons · {module.contentStatus}</p></div><CmsLifecycleControls entityType="COURSE_MODULE" entityId={module.id} status={module.contentStatus} compact /></div>{module.lessons.length > 0 ? <ul className="mt-4 space-y-2">{module.lessons.map((lesson) => <li key={lesson.id}><Link href={`/admin/lessons/${lesson.id}`} className="text-sm font-semibold text-blue-700 hover:underline">{lesson.order}. {lesson.title} ({lesson.contentStatus})</Link></li>)}</ul> : null}<AdminLessonForm moduleId={module.id} /></article>)}</section></div>;
}
