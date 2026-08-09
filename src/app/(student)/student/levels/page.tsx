import { LevelCard } from "@/modules/courses/components/LevelCard";
import { courseCatalog } from "@/modules/courses/data/course-catalog";

export default function StudentLevelsPage() {
  return <section>
    <header>
      <p className="text-sm font-semibold text-blue-700">COURSE LEVELS</p>
      <h2 className="mt-1 text-3xl font-bold">Choose your level</h2>
      <p className="mt-2 text-slate-600">Each level contains only its own sections and topics.</p>
    </header>
    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Object.values(courseCatalog).map((level) => <LevelCard key={level.level} level={level} />)}
    </div>
  </section>;
}
