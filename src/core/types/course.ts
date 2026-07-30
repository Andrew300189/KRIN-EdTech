import type { AppRole } from "@/core/constants/roles";
import type {
  AcademySlug,
  CourseStage,
} from "@/modules/courses/constants/learning-paths";

export type CourseLevel = "beginner" | "intermediate" | "advanced";
export type CourseVisibility = "private" | "public";
export type CourseStatus = "draft" | "published";

export type CourseOwner = {
  id: string;
  name: string;
  role: AppRole;
};

export type TeacherCourse = {
  id: string;
  title: string;
  description: string;
  level: CourseLevel;
  academy: AcademySlug;
  path: string;
  stage: CourseStage;
  visibility: CourseVisibility;
  status: CourseStatus;
  ownerId: string;
  createdAt: string;
};

export type CreateTeacherCourseInput = {
  title: string;
  description: string;
  level: CourseLevel;
  academy?: AcademySlug;
  path?: string;
  stage?: CourseStage;
  visibility?: CourseVisibility;
  status?: CourseStatus;
};
