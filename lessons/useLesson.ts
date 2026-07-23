import { useEffect, useState } from "react";
import { fetchLessonById } from "./lessons.service";

export default function useLesson(id: string) {
  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLesson() {
      const response = await fetchLessonById(id);
      setLesson(response.lesson ?? null);
      setLoading(false);
    }

    loadLesson();
  }, [id]);

  return { lesson, loading };
}
