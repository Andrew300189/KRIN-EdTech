import { createHash, randomBytes } from "crypto";
import { normalizeEmail } from "@/core/server/platform-owner";

export const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
export const EMAIL_VERIFICATION_COOLDOWN_MS = 60 * 1000;
export const EMAIL_VERIFICATION_MAX_TOKEN_LENGTH = 128;

export type EmailVerificationRequestInput =
  | { ok: true; email: string }
  | { ok: false; error: string };

export type EmailVerificationSubmissionInput =
  | { ok: true; token: string }
  | { ok: false; error: string };

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** A high-entropy token is sent by email; only its SHA-256 digest is persisted. */
export function createEmailVerificationToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashEmailVerificationToken(token) };
}

export function hashEmailVerificationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function parseEmailVerificationRequest(
  input: unknown,
): EmailVerificationRequestInput {
  const value =
    input && typeof input === "object" && "email" in input
      ? (input as { email?: unknown }).email
      : undefined;
  const email = normalizeEmail(typeof value === "string" ? value : undefined);

  return isEmail(email)
    ? { ok: true, email }
    : { ok: false, error: "Enter a valid email address." };
}

export function parseEmailVerificationSubmission(
  input: unknown,
): EmailVerificationSubmissionInput {
  const value =
    input && typeof input === "object" && "token" in input
      ? (input as { token?: unknown }).token
      : undefined;
  const token = typeof value === "string" ? value.trim() : "";

  // Tokens generated above are base64url. Rejecting arbitrary long input keeps
  // the verification endpoint cheap even when it is targeted by malformed requests.
  if (
    token.length < 40 ||
    token.length > EMAIL_VERIFICATION_MAX_TOKEN_LENGTH ||
    !/^[A-Za-z0-9_-]+$/.test(token)
  ) {
    return {
      ok: false,
      error: "This verification link is invalid or has expired.",
    };
  }

  return { ok: true, token };
}
