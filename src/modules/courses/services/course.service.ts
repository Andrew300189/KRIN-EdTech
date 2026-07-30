import type {
  CourseLevel,
  CreateTeacherCourseInput,
  TeacherCourse,
} from "@/core/types/course";
import {
  getDefaultAcademy,
  getDefaultPathSlugForAcademy,
  isAcademySlug,
  isCourseStage,
} from "@/modules/courses/constants/learning-paths";

const inMemoryCourses: TeacherCourse[] = [];

const toIsoNow = () => new Date().toISOString();

const safeLevel = (level: string): CourseLevel => {
  if (level === "advanced" || level === "intermediate") return level;
  return "beginner";
};

const safeAcademy = (academy?: string) => {
  if (academy && isAcademySlug(academy)) return academy;
  return getDefaultAcademy().slug;
};

const safeStage = (stage?: string) => {
  if (stage && isCourseStage(stage)) return stage;
  return "all-levels" as const;
};

export function listCoursesForOwner(ownerId: string): TeacherCourse[] {
  return inMemoryCourses.filter((course) => course.ownerId === ownerId);
}

export function createCourseForOwner(
  ownerId: string,
  input: CreateTeacherCourseInput,
): TeacherCourse {
  const academy = safeAcademy(input.academy);

  const created: TeacherCourse = {
    id: `course_${Math.random().toString(36).slice(2, 10)}`,
    title: input.title.trim(),
    description: input.description.trim(),
    level: safeLevel(input.level),
    academy,
    path: (input.path || getDefaultPathSlugForAcademy(academy)).trim(),
    stage: safeStage(input.stage),
    visibility: input.visibility ?? "private",
    status: input.status ?? "draft",
    ownerId,
    createdAt: toIsoNow(),
  };

  inMemoryCourses.push(created);
  return created;
}
