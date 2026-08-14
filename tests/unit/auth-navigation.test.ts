import { nextAuthOptions } from "@/core/server/next-auth";
import {
  DEFAULT_AUTHENTICATED_PATH,
  getSafeInternalPath,
  getSafeInternalUrl,
  getSafePostAuthRedirectUrl,
} from "@/core/utils/safe-internal-path";
import { authorizeCredentials } from "@/modules/auth/services/credentials-login.service";
import {
  isUniqueConstraintError,
  validateRegistrationInput,
} from "@/modules/auth/services/registration-input.service";
import { getPostLoginPath, getRoleWorkspacePath } from "@/core/utils/workspace-path";

const activeUser = {
  id: "user-1",
  email: "user@example.com",
  name: "User Example",
  role: "STUDENT",
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
    ).toBe("http://localhost:3000/dashboard");
  });

  it("preserves safe CMS redirects and routes unsafe post-auth URLs through completion", async () => {
    expect(
      getSafePostAuthRedirectUrl("/cms/users?tab=active", "http://localhost:3000"),
    ).toBe("http://localhost:3000/cms/users?tab=active");
    expect(
      getSafePostAuthRedirectUrl("https://evil.example", "http://localhost:3000"),
    ).toBe("http://localhost:3000/auth/complete");
    expect(
      getSafePostAuthRedirectUrl("http://localhost:3000/", "http://localhost:3000"),
    ).toBe("http://localhost:3000/auth/complete");
    expect(
      getSafePostAuthRedirectUrl("/api/auth/signin/google", "http://localhost:3000"),
    ).toBe("http://localhost:3000/auth/complete");

    const redirect = nextAuthOptions.callbacks?.redirect;
    if (!redirect) throw new Error("NextAuth redirect callback is not configured");
    expect(
      await redirect({ url: "/cms", baseUrl: "http://localhost:3000" }),
    ).toBe("http://localhost:3000/cms");
    expect(
      await redirect({ url: "https://evil.example", baseUrl: "http://localhost:3000" }),
    ).toBe("http://localhost:3000/auth/complete");
  });

  it("authenticates valid credentials once normalized", async () => {
    const findByEmail = jest.fn().mockResolvedValue(activeUser);
    const verifyPassword = jest.fn().mockReturnValue(true);
    const result = await authorizeCredentials(
      { email: "  USER@example.com ", password: "correct-password" },
      { findByEmail, verifyPassword },
    );

    expect(result).toMatchObject({
      ok: true,
      user: {
        id: "user-1",
        email: "user@example.com",
        name: "User Example",
        role: "STUDENT",
      },
    });
    expect(findByEmail).toHaveBeenCalledWith("user@example.com");
    expect(verifyPassword).toHaveBeenCalledTimes(1);
  });

  it("returns the same successful authorization shape for an owner account", async () => {
    const owner = {
      ...activeUser,
      email: "andreykosir@gmail.com",
      name: "Andrey",
      role: "STUDENT",
    };
    const result = await authorizeCredentials(
      { email: " ANDREYKOSIR@GMAIL.COM ", password: "correct-password" },
      {
        findByEmail: jest.fn().mockResolvedValue(owner),
        verifyPassword: jest.fn().mockReturnValue(true),
      },
    );

    expect(result).toMatchObject({
      ok: true,
      user: { id: "user-1", email: "andreykosir@gmail.com", name: "Andrey" },
    });
  });

  it("rejects malformed email before querying a user", async () => {
    const findByEmail = jest.fn();
    const result = await authorizeCredentials(
      { email: "not-an-email", password: "password" },
      { findByEmail, verifyPassword: jest.fn() },
    );

    expect(result).toEqual({ ok: false, reason: "INVALID_INPUT" });
    expect(findByEmail).not.toHaveBeenCalled();
  });

  it.each([
    ["wrong password", activeUser, false],
    ["unknown user", null, false],
    ["blocked user", { ...activeUser, isBlocked: true }, true],
  ])("rejects %s without exposing an account", async (_label, user, passwordMatches) => {
    const result = await authorizeCredentials(
      { email: "user@example.com", password: "password" },
      {
        findByEmail: jest.fn().mockResolvedValue(user),
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
    expect(nextAuthOptions.useSecureCookies).toBe(false);
    expect(typeof nextAuthOptions.callbacks?.signIn).toBe("function");
  });

  it("reissues JWT identity claims from the current sign-in instead of retaining an old email", async () => {
    const jwt = nextAuthOptions.callbacks?.jwt;
    const session = nextAuthOptions.callbacks?.session;
    if (!jwt || !session) throw new Error("NextAuth callbacks are not configured");

    const token = await jwt({
      token: { sub: "old-user", email: "old@example.com", role: "ADMIN" },
      user: {
        id: "user-1",
        email: "  NEW@Example.com ",
        name: "New User",
      },
    } as never);

    expect(token).toMatchObject({
      sub: "user-1",
      userId: "user-1",
      email: "new@example.com",
      role: "STUDENT",
    });

    const resolvedSession = await session({
      session: {
        user: { name: "Old User", email: "old@example.com", image: null },
        expires: "2099-01-01T00:00:00.000Z",
      },
      token,
    } as never);

    expect(resolvedSession.user).toMatchObject({
      id: "user-1",
      email: "new@example.com",
      role: "STUDENT",
    });
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
    expect(getRoleWorkspacePath("TEACHER")).toBe("/teacher");
    expect(getRoleWorkspacePath("ADMIN")).toBe("/admin");
    expect(getPostLoginPath("student@example.com", "STUDENT", "/teacher/groups")).toBe("/student");
    expect(getPostLoginPath("teacher@example.com", "TEACHER", "/student/courses")).toBe("/teacher");
    expect(getPostLoginPath("teacher@example.com", "TEACHER", "/teacher/groups")).toBe("/teacher/groups");
  });

  it.each([
    ["student", "student@example.com", "STUDENT", "/student"],
    ["teacher", "teacher@example.com", "TEACHER", "/teacher"],
    ["platform owner", "andreykosir@gmail.com", "STUDENT", "/cms"],
  ])(
    "uses the credentials login destination for %s",
    (_accountType, email, role, destination) => {
      expect(getPostLoginPath(email, role)).toBe(destination);
    },
  );

  it("resolves final Google callback destinations on the server for every workspace", () => {
    expect(
      getPostLoginPath("  ANDREYKOSIR@GMAIL.COM ", "STUDENT", "/teacher"),
    ).toBe("/cms");
    expect(
        getPostLoginPath("teacher@example.com", "TEACHER", "/student/courses"),
    ).toBe("/teacher");
    expect(
      getPostLoginPath("student@example.com", "STUDENT", "https://evil.example"),
    ).toBe("/student");
  });
});
