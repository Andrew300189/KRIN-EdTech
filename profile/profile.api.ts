export const profileApi = {
  getProfile: async () => ({ ok: true, profile: { name: 'Alex Johnson', email: 'alex@example.com', bio: 'English learner and product enthusiast.' } }),
  updateProfile: async (payload: unknown) => ({ ok: true, payload }),
};
