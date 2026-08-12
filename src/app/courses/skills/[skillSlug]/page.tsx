import { notFound } from "next/navigation";
import { SkillCourseCollectionPage } from "@/modules/courses/components/SkillCourseCollectionPage";
import { courseSkillLevels, getCourseSkill } from "@/modules/courses/data/skill-course-catalog";
import { normalizeCefrLevelCode } from "@/modules/courses/services/content.service";

export default async function SkillCoursesPage({ params, searchParams }: { params: Promise<{ skillSlug: string }>; searchParams: Promise<{ level?: string | string[] }> }) {
  const [{ skillSlug }, query] = await Promise.all([params, searchParams]);
  const skill = getCourseSkill(skillSlug);
  if (!skill) notFound();

  const rawLevel = typeof query.level === "string" ? query.level : undefined;
  const selectedLevel = rawLevel ? normalizeCefrLevelCode(rawLevel) : null;
  if (rawLevel && !selectedLevel) notFound();

  return <SkillCourseCollectionPage skill={skill} selectedLevel={selectedLevel && courseSkillLevels.includes(selectedLevel) ? selectedLevel : null} />;
}
