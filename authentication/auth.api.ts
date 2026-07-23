export const authApi = {
  login: async (payload: { email: string; password: string }) => ({ ok: true, payload }),
  register: async (payload: { name: string; email: string; password: string }) => ({ ok: true, payload }),
  forgotPassword: async (email: string) => ({ ok: true, email }),
  resetPassword: async (payload: { password: string; token: string }) => ({ ok: true, payload }),
  verifyEmail: async (token: string) => ({ ok: true, token }),
};
