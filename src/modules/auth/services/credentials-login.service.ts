import { normalizeEmail } from "@/core/server/platform-owner";

export type CredentialsLoginUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  passwordHash: string;
  isBlocked: boolean;
  deletedAt: Date | null;
};

type CredentialsLoginDependencies<T extends CredentialsLoginUser> = {
  findByEmail(email: string): Promise<T | null>;
  verifyPassword(password: string, passwordHash: string): boolean;
};

export type CredentialsLoginResult<T extends CredentialsLoginUser> =
  | { ok: true; user: T; email: string }
  | { ok: false; reason: "INVALID_INPUT" | "INVALID_CREDENTIALS" };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Server-side equivalent of a NextAuth CredentialsProvider `authorize` callback.
 * It makes no cookie or redirect decisions, so callers cannot accidentally
 * send an authenticated owner to a role-based route before server resolution.
 */
export async function authorizeCredentials<T extends CredentialsLoginUser>(
  credentials: { email?: unknown; password?: unknown },
  dependencies: CredentialsLoginDependencies<T>,
): Promise<CredentialsLoginResult<T>> {
  const email = normalizeEmail(
    typeof credentials.email === "string" ? credentials.email : undefined,
  );
  const password = typeof credentials.password === "string" ? credentials.password : "";

  if (!email || !EMAIL_PATTERN.test(email) || !password) {
    return { ok: false, reason: "INVALID_INPUT" };
  }

  const user = await dependencies.findByEmail(email);
  if (
    !user ||
    !dependencies.verifyPassword(password, user.passwordHash) ||
    user.isBlocked ||
    user.deletedAt
  ) {
    return { ok: false, reason: "INVALID_CREDENTIALS" };
  }

  // T requires id/email/name/role, which guarantees that the successful
  // authorization result is suitable for a session without another lookup.
  return { ok: true, user: { ...user, email }, email };
}
