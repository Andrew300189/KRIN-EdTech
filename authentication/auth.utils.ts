export function saveAuthToken(token: string) {
  localStorage.setItem('krin-auth-token', token);
}

export function getAuthToken() {
  return localStorage.getItem('krin-auth-token');
}

export function clearAuthToken() {
  localStorage.removeItem('krin-auth-token');
}

export function isAuthenticated() {
  return Boolean(getAuthToken());
}
