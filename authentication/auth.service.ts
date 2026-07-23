import { authApi } from './auth.api';

export async function loginUser(email: string, password: string) {
  return authApi.login({ email, password });
}

export async function registerUser(name: string, email: string, password: string) {
  return authApi.register({ name, email, password });
}

export async function requestPasswordReset(email: string) {
  return authApi.forgotPassword(email);
}

export async function resetUserPassword(password: string, token: string) {
  return authApi.resetPassword({ password, token });
}

export async function verifyUserEmail(token: string) {
  return authApi.verifyEmail(token);
}
