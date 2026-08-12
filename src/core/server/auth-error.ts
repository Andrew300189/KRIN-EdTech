import "server-only";
import { randomUUID } from "crypto";

export type PublicAuthErrorCode =
  | "google_sign_in_failed"
  | "invalid_credentials"
  | "cms_access_denied"
  | "auth_unavailable";

const PUBLIC_AUTH_MESSAGES: Record<PublicAuthErrorCode, string> = {
  google_sign_in_failed: "Не удалось войти через Google. Попробуйте ещё раз.",
  invalid_credentials: "Неверный email или пароль.",
  cms_access_denied: "Не удалось подтвердить права владельца.",
  auth_unavailable: "Не удалось выполнить вход. Попробуйте ещё раз.",
};

const ERROR_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getPublicAuthErrorMessage(code: PublicAuthErrorCode) {
  return PUBLIC_AUTH_MESSAGES[code];
}

/**
 * Creates an opaque development-only ID. It is safe to show to a developer
 * and deliberately contains no provider response, credentials, tokens, or
 * database error detail.
 */
export function createPublicAuthFailure(code: PublicAuthErrorCode) {
  // Invalid credentials and access denials are expected user-facing states,
  // not server failures. Do not make them look like an internal exception.
  const includeErrorId = code === "auth_unavailable" || code === "google_sign_in_failed";
  const errorId = includeErrorId ? randomUUID() : null;

  if (process.env.NODE_ENV === "development" && errorId) {
    console.warn("[auth-error]", JSON.stringify({ code, errorId }));
  }

  return {
    error: getPublicAuthErrorMessage(code),
    ...(process.env.NODE_ENV === "development" && errorId ? { errorId } : {}),
  };
}

export function getPublicAuthErrorPath(code: PublicAuthErrorCode) {
  const failure = createPublicAuthFailure(code);
  const params = new URLSearchParams({ error: code });
  if (failure.errorId) params.set("errorId", failure.errorId);
  return `/auth/error?${params.toString()}`;
}

export function getDevelopmentErrorId(errorId: string | null | undefined) {
  if (process.env.NODE_ENV !== "development") return null;
  if (errorId && ERROR_ID_PATTERN.test(errorId)) return errorId;
  return randomUUID();
}
