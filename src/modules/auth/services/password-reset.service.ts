import { createHash, randomBytes } from "crypto";
import { normalizeEmail } from "@/core/server/platform-owner";

export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
export const PASSWORD_RESET_COOLDOWN_MS = 60 * 1000;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export type PasswordResetRequestInput =
  | { ok: true; email: string }
  | { ok: false; error: string };

export type PasswordResetSubmissionInput =
  | { ok: true; token: string; password: string }
  | { ok: false; error: string };

export type NewPasswordInput =
  | { ok: true; password: string }
  | { ok: false; error: string };

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function parsePasswordResetRequest(input: unknown): PasswordResetRequestInput {
  const emailValue = input && typeof input === "object" && "email" in input
    ? (input as { email?: unknown }).email
    : undefined;
  const email = normalizeEmail(typeof emailValue === "string" ? emailValue : undefined);

  return isEmail(email)
    ? { ok: true, email }
    : { ok: false, error: "Enter a valid email address." };
}

export function parsePasswordResetSubmission(input: unknown): PasswordResetSubmissionInput {
  const values = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const token = typeof values.token === "string" ? values.token.trim() : "";

  if (!token || token.length > 512) {
    return { ok: false, error: "This password-reset link is invalid or has expired." };
  }
  const password = validateNewPassword(values);
  return password.ok ? { ok: true, token, password: password.password } : password;
}

export function validateNewPassword(input: unknown): NewPasswordInput {
  const values = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const password = typeof values.password === "string" ? values.password : "";
  const passwordConfirmation = typeof values.passwordConfirmation === "string"
    ? values.passwordConfirmation
    : password;

  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    return {
      ok: false,
      error: `Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters.`,
    };
  }
  if (password !== passwordConfirmation) {
    return { ok: false, error: "Passwords do not match." };
  }

  return { ok: true, password };
}

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createPasswordResetToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashPasswordResetToken(token) };
}
