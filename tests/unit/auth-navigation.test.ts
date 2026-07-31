import { nextAuthOptions } from "@/core/server/next-auth";
import {
  DEFAULT_AUTHENTICATED_PATH,
  getSafeInternalPath,
  getSafeInternalUrl,
} from "@/core/utils/safe-internal-path";
import { authenticateCredentials } from "@/modules/auth/services/credentials-login.service";
import {
  isUniqueConstraintError,
  validateRegistrationInput,
} from "@/modules/auth/services/registration-input.service";
import { getPostLoginPath, getRoleWorkspacePath } from "@/core/utils/workspace-path";

const activeUser = {
  id: "user-1",
  passwordHash: "hash",
  isBlocked: false,
  deletedAt: null,
};

describe("authentication navigation", () => {
  it("accepts only safe internal callback paths", () => {
    expect(getSafeInternalPath("/dashboard/courses?tab=active")).toBe(
      "/dashboard/courses?tab=active",
    );
    expect(getSafeInternalPath("https://evil.example")).toBe(
      DEFAULT_AUTHENTICATED_PATH,
    );
    expect(getSafeInternalPath("//evil.example")).toBe(
      DEFAULT_AUTHENTICATED_PATH,
    );
    expect(getSafeInternalPath("/%2f%2fevil.example")).toBe(
      DEFAULT_AUTHENTICATED_PATH,
    );
    expect(
      getSafeInternalUrl("https://evil.example", "http://localhost:3000"),
    ).toBe("http://localhost:3000/");
  });

  it("authenticates valid credentials once normalized", async () => {
    const findByIdentifier = jest.fn().mockResolvedValue(activeUser);
    const verifyPassword = jest.fn().mockReturnValue(true);
    const result = await authenticateCredentials(
      { identifier: "  USER@example.com ", password: "correct-password" },
      { findByIdentifier, verifyPassword },
    );

    expect(result).toMatchObject({ ok: true, user: { id: "user-1" } });
    expect(findByIdentifier).toHaveBeenCalledWith("user@example.com");
    expect(verifyPassword).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["wrong password", activeUser, false],
    ["unknown user", null, false],
    ["blocked user", { ...activeUser, isBlocked: true }, true],
  ])("rejects %s without exposing an account", async (_label, user, passwordMatches) => {
    const result = await authenticateCredentials(
      { identifier: "user@example.com", password: "password" },
      {
        findByIdentifier: jest.fn().mockResolvedValue(user),
        verifyPassword: jest.fn().mockReturnValue(passwordMatches),
      },
    );

    expect(result).toEqual({ ok: false, reason: "INVALID_CREDENTIALS" });
  });

  it("keeps the Google provider and JWT session strategy configured", () => {
    const providerIds = (nextAuthOptions.providers ?? []).map(
      (provider) => provider.id,
    );

    expect(providerIds).toContain("google");
    expect(nextAuthOptions.session?.strategy).toBe("jwt");
    expect(typeof nextAuthOptions.callbacks?.signIn).toBe("function");
  });

  it("normalizes valid registration input and rejects malformed requests", () => {
    expect(
      validateRegistrationInput({
        username: "  New.User ",
        email: " NEW@Example.com ",
        password: "secure-password",
      }),
    ).toEqual({
      ok: true,
      input: {
        username: "new.user",
        email: "new@example.com",
        password: "secure-password",
      },
    });
    expect(validateRegistrationInput({ username: "new", email: "bad", password: "123456" })).toEqual({
      ok: false,
      error: "Enter a valid email address",
    });
  });

  it("recognizes database uniqueness races without exposing a server error", () => {
    expect(isUniqueConstraintError({ code: "P2002" })).toBe(true);
    expect(isUniqueConstraintError({ code: "P2021" })).toBe(false);
    expect(isUniqueConstraintError(null)).toBe(false);
  });

  it("sends each role to its own workspace and rejects cross-workspace callbacks", () => {
    expect(getRoleWorkspacePath("STUDENT")).toBe("/student");
    expect(getRoleWorkspacePath("INSTRUCTOR")).toBe("/teacher");
    expect(getRoleWorkspacePath("ADMIN")).toBe("/admin");
    expect(getPostLoginPath("STUDENT", "/teacher/groups")).toBe("/student");
    expect(getPostLoginPath("INSTRUCTOR", "/student/courses")).toBe("/teacher");
    expect(getPostLoginPath("INSTRUCTOR", "/teacher/groups")).toBe("/teacher/groups");
  });
});
