import { normalizeEmail } from "@/core/server/platform-owner";
import { hasDisallowedAccountLanguage } from "@/core/server/account-language-policy";

export type RegistrationInput = {
  username: string;
  email: string;
  password: string;
};

export type RegistrationValidationResult =
  | { ok: true; input: RegistrationInput }
  | { ok: false; error: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Normalizes and validates public registration input before it reaches Prisma. */
export function validateRegistrationInput(
  body: unknown,
): RegistrationValidationResult {
  const values = body && typeof body === "object"
    ? (body as Record<string, unknown>)
    : {};
  const username = typeof values.username === "string"
    ? values.username.trim().toLowerCase()
    : "";
  const email = normalizeEmail(typeof values.email === "string" ? values.email : undefined);
  const password = typeof values.password === "string" ? values.password : "";

  if (!username || !email || !password) {
    return { ok: false, error: "Username, email, and password are required" };
  }

  if (username.length < 3 || username.length > 50) {
    return { ok: false, error: "Username must be between 3 and 50 characters" };
  }

  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return { ok: false, error: "Enter a valid email address" };
  }

  if (hasDisallowedAccountLanguage(username, "username")) {
    return { ok: false, error: "Choose a username without offensive or vulgar language." };
  }

  if (hasDisallowedAccountLanguage(email, "email")) {
    return { ok: false, error: "Use an email address without offensive or vulgar language." };
  }

  if (password.length < 6) {
    return { ok: false, error: "Password should be at least 6 characters" };
  }

  if (password.length > 128) {
    return { ok: false, error: "Password must be 128 characters or fewer" };
  }

  return { ok: true, input: { username, email, password } };
}

/** Avoid importing Prisma runtime classes just to recognize a database race. */
export function isUniqueConstraintError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: unknown }).code === "P2002",
  );
}
