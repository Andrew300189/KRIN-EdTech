export const coursesApi = {
  list: async () => ({ ok: true, courses: [] }),
  getById: async (id: string) => ({ ok: true, course: { id, title: 'Sample Course', description: 'A demo course' } }),
};
