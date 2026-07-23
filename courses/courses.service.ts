import { coursesApi } from "./courses.api";

export async function fetchCourses() {
  return coursesApi.list();
}

export async function fetchCourseById(id: string) {
  return coursesApi.getById(id);
}
