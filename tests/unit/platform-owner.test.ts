import {
  isPlatformOwner,
  normalizeEmail,
} from "@/core/server/platform-owner";
import { resolvePostAuthDestination } from "@/core/utils/workspace-path";

describe("platform owner identity", () => {
  const originalOwnerEmail = process.env.PLATFORM_OWNER_EMAIL;
  const originalEnvironment = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.PLATFORM_OWNER_EMAIL = "andreykosir@gmail.com";
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    if (originalOwnerEmail === undefined) {
      delete process.env.PLATFORM_OWNER_EMAIL;
    } else {
      process.env.PLATFORM_OWNER_EMAIL = originalOwnerEmail;
    }
    process.env.NODE_ENV = originalEnvironment;
    jest.restoreAllMocks();
  });

  it("normalizes email values", () => {
    expect(normalizeEmail(" ANDREYKOSIR@GMAIL.COM ")).toBe(
      "andreykosir@gmail.com",
    );
    expect(normalizeEmail(undefined)).toBe("");
  });

  it.each([
    ["andreykosir@gmail.com", true],
    ["ANDREYKOSIR@GMAIL.COM", true],
    [" andreykosir@gmail.com ", true],
    ["other@example.com", false],
    [undefined, false],
  ])("identifies owner email %p as %p", (email, expected) => {
    expect(isPlatformOwner(email)).toBe(expected);
  });

  it("fails closed and reports a safe diagnostic in development when owner configuration is absent", () => {
    process.env.NODE_ENV = "development";
    delete process.env.PLATFORM_OWNER_EMAIL;
    const error = jest.spyOn(console, "error").mockImplementation();

    expect(isPlatformOwner("andreykosir@gmail.com")).toBe(false);
    expect(error).toHaveBeenCalledWith("PLATFORM_OWNER_EMAIL is not configured");
  });

  it("resolves the post-auth destination in owner-first order", () => {
    expect(resolvePostAuthDestination("andreykosir@gmail.com", "STUDENT")).toBe(
      "/cms",
    );
    expect(resolvePostAuthDestination("andreykosir@gmail.com", "TEACHER")).toBe(
      "/cms",
    );
    expect(resolvePostAuthDestination("teacher@example.com", "TEACHER")).toBe(
      "/teacher",
    );
    expect(resolvePostAuthDestination("student@example.com", "STUDENT")).toBe(
      "/student",
    );
  });
});
