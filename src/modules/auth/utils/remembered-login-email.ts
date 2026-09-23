const STORAGE_KEY = "krin-last-login-email";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validEmail(value: unknown) {
  if (typeof value !== "string") return "";
  const email = value.trim().toLowerCase();
  return EMAIL_PATTERN.test(email) ? email : "";
}

/** Remember only the login email on this device, never credentials or names. */
export function rememberLoginEmail(value: unknown) {
  const email = validEmail(value);
  if (!email || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, email);
  } catch {
    // Private browsing and restrictive storage settings must not block login.
  }
}

export function getRememberedLoginEmail() {
  if (typeof window === "undefined") return "";
  try {
    return validEmail(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return "";
  }
}
