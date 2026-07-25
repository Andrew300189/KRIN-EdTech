import type {
  CourseLevel,
  CreateTeacherCourseInput,
  TeacherCourse,
} from "@/core/types/course";

const inMemoryCourses: TeacherCourse[] = [];

const toIsoNow = () => new Date().toISOString();

const safeLevel = (level: string): CourseLevel => {
  if (level === "advanced" || level === "intermediate") return level;
  return "beginner";
};

export function listCoursesForOwner(ownerId: string): TeacherCourse[] {
  return inMemoryCourses.filter((course) => course.ownerId === ownerId);
}

export function createCourseForOwner(
  ownerId: string,
  input: CreateTeacherCourseInput,
): TeacherCourse {
  const created: TeacherCourse = {
    id: `course_${Math.random().toString(36).slice(2, 10)}`,
    title: input.title.trim(),
    description: input.description.trim(),
    level: safeLevel(input.level),
    visibility: input.visibility ?? "private",
    status: input.status ?? "draft",
    ownerId,
    createdAt: toIsoNow(),
  };

  inMemoryCourses.push(created);
  return created;
}
