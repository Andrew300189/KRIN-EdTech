import { LevelCard } from "@/modules/courses/components/LevelCard";
import { getPublishedCurriculumLevelPage, listPublishedLanguageLevels } from "@/modules/courses/services/content.service";

export default async function StudentLevelsPage() {
  const levels = await listPublishedLanguageLevels();
  const navigationLevels = await Promise.all(levels.map(async (level) => {
    const page = await getPublishedCurriculumLevelPage(level.code);
    return { code: level.code, title: level.title, description: level.description, sectionCount: page?.sections.length ?? 0 };
  }));
  return <section>
    <header>
      <p className="text-sm font-semibold text-blue-700">COURSE LEVELS</p>
      <h2 className="mt-1 text-3xl font-bold">Choose your level</h2>
      <p className="mt-2 text-slate-600">Each level contains only its own sections and topics.</p>
    </header>
    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {navigationLevels.map((level) => <LevelCard key={level.code} level={level} />)}
    </div>
  </section>;
}
