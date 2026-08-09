import { notFound } from "next/navigation";
import { CourseBreadcrumbs } from "@/modules/courses/components/CourseBreadcrumbs";
import { EmptyCategoryState } from "@/modules/courses/components/EmptyCategoryState";
import { SectionCard } from "@/modules/courses/components/SectionCard";
import { getLevel } from "@/modules/courses/utils/get-level";
import { DashboardBackButton } from "@/modules/teaching/components/DashboardBackButton";

export default async function StudentLevelPage({ params }: { params: Promise<{ levelCode: string }> }) {
  const level = getLevel((await params).levelCode);
  if (!level) notFound();

  return <section className="space-y-6">
    <DashboardBackButton fallbackHref="/student/levels" />
    <CourseBreadcrumbs items={[{ label: "Levels", href: "/student/levels" }, { label: level.level }]} />
    <header>
      <p className="text-sm font-semibold text-blue-700">{level.level}</p>
      <h2 className="mt-1 text-3xl font-bold">{level.title}</h2>
      <p className="mt-2 max-w-3xl text-slate-600">{level.description}</p>
    </header>
    {level.sections.length === 0 ? <EmptyCategoryState message="Content for this level has not been added yet." /> : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {level.sections.map((section) => <SectionCard key={section.id} level={level.level} section={section} />)}
    </div>}
  </section>;
}
