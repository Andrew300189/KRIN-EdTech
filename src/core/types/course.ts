import type { AppRole } from "@/core/constants/roles";

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
  visibility: CourseVisibility;
  status: CourseStatus;
  ownerId: string;
  createdAt: string;
};

export type CreateTeacherCourseInput = {
  title: string;
  description: string;
  level: CourseLevel;
  visibility?: CourseVisibility;
  status?: CourseStatus;
};
