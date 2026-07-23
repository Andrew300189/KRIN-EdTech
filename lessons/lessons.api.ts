export const lessonsApi = {
  list: async () => ({ ok: true, lessons: [] }),
  getById: async (id: string) => ({ ok: true, lesson: { id, title: 'Sample Lesson', type: 'reading' } }),
};
