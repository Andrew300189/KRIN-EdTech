import Link from "next/link";
import { LEARNING_ACADEMIES } from "@/modules/courses/constants/learning-paths";

export default function AcademiesPage() {
  return (
    <section>
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Explore by skill</p>
      <h2 className="mt-2 text-3xl font-bold">Academies</h2>
      <p className="mt-2 max-w-2xl text-slate-600">Academies are curated learning paths. They are separate from courses you already own or have started.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {LEARNING_ACADEMIES.map((academy) => (
          <Link key={academy.slug} href={`/dashboard/academies/${academy.slug}`} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <h3 className="text-xl font-bold text-slate-900">{academy.title}</h3>
            <p className="mt-3 text-sm text-slate-600">{academy.paths.length} structured paths</p>
            <p className="mt-5 text-sm font-semibold text-blue-700">Explore academy →</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
