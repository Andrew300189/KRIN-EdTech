import Link from "next/link";
import { notFound } from "next/navigation";
import { getAcademyBySlug } from "@/modules/courses/constants/learning-paths";

export default async function AcademyDetailsPage({ params }: { params: Promise<{ academySlug: string }> }) {
  const academy = getAcademyBySlug((await params).academySlug);
  if (!academy) notFound();

  return (
    <section>
      <Link href="/dashboard/academies" className="text-sm font-semibold text-blue-700 hover:underline">← All academies</Link>
      <h2 className="mt-5 text-3xl font-bold">{academy.title}</h2>
      <p className="mt-2 max-w-2xl text-slate-600">Choose a path to understand the skills covered. Available courses remain listed only in My Courses after you gain access.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {academy.paths.map((path) => (
          <article key={path.slug} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold">{path.title}</h3>
            <p className="mt-3 text-sm text-slate-600">Course content for this path is added through the catalog and appears here as access is granted.</p>
            <Link href="/courses" className="mt-5 inline-block text-sm font-semibold text-blue-700 hover:underline">Browse course catalog →</Link>
          </article>
        ))}
      </div>
    </section>
  );
}
