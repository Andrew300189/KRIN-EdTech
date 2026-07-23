import { useEffect, useState } from 'react';
import { fetchCourses } from './courses.service';

export default function useCourses() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCourses() {
      const response = await fetchCourses();
      setCourses(response.courses ?? []);
      setLoading(false);
    }

    loadCourses();
  }, []);

  return { courses, loading };
}
