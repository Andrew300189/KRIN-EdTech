import { lessonsApi } from "./lessons.api";

export async function fetchLessons() {
  return lessonsApi.list();
}

export async function fetchLessonById(id: string) {
  return lessonsApi.getById(id);
}
