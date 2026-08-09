import {
  createPublicAuthFailure,
  getDevelopmentErrorId,
  getPublicAuthErrorMessage,
} from "@/core/server/auth-error";

describe("public auth errors", () => {
  const originalEnvironment = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnvironment;
    jest.restoreAllMocks();
  });

  it("maps Google, credentials, and CMS failures to safe public messages", () => {
    expect(getPublicAuthErrorMessage("google_sign_in_failed")).toBe(
      "Не удалось войти через Google. Попробуйте ещё раз.",
    );
    expect(getPublicAuthErrorMessage("invalid_credentials")).toBe(
      "Неверный email или пароль.",
    );
    expect(getPublicAuthErrorMessage("cms_access_denied")).toBe(
      "Не удалось подтвердить права владельца.",
    );
  });

  it("adds only an opaque error ID in development", () => {
    process.env.NODE_ENV = "development";
    const warn = jest.spyOn(console, "warn").mockImplementation();

    const failure = createPublicAuthFailure("google_sign_in_failed");

    expect(failure.error).toBe("Не удалось войти через Google. Попробуйте ещё раз.");
    expect(failure.errorId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(warn).toHaveBeenCalledWith(
      "[auth-error]",
      expect.stringContaining('"code":"google_sign_in_failed"'),
    );
  });

  it("does not include error IDs in production or trust malformed ones", () => {
    process.env.NODE_ENV = "production";
    const failure = createPublicAuthFailure("invalid_credentials");

    expect(failure).toEqual({ error: "Неверный email или пароль." });
    expect(getDevelopmentErrorId("not-an-id")).toBeNull();
  });
});
