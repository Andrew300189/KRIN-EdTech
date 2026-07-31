export type CredentialsLoginUser = {
  id: string;
  passwordHash: string;
  isBlocked: boolean;
  deletedAt: Date | null;
};

type CredentialsLoginDependencies<T extends CredentialsLoginUser> = {
  findByIdentifier(identifier: string): Promise<T | null>;
  verifyPassword(password: string, passwordHash: string): boolean;
};

export type CredentialsLoginResult<T extends CredentialsLoginUser> =
  | { ok: true; user: T; identifier: string }
  | { ok: false; reason: "INVALID_INPUT" | "INVALID_CREDENTIALS" };

/** Keeps the credential decision independent of HTTP/cookies and testable. */
export async function authenticateCredentials<T extends CredentialsLoginUser>(
  input: { identifier?: unknown; password?: unknown },
  dependencies: CredentialsLoginDependencies<T>,
): Promise<CredentialsLoginResult<T>> {
  const identifier = typeof input.identifier === "string"
    ? input.identifier.trim().toLowerCase()
    : "";
  const password = typeof input.password === "string" ? input.password : "";

  if (!identifier || !password) {
    return { ok: false, reason: "INVALID_INPUT" };
  }

  const user = await dependencies.findByIdentifier(identifier);
  if (
    !user ||
    !dependencies.verifyPassword(password, user.passwordHash) ||
    user.isBlocked ||
    user.deletedAt
  ) {
    return { ok: false, reason: "INVALID_CREDENTIALS" };
  }

  return { ok: true, user, identifier };
}
