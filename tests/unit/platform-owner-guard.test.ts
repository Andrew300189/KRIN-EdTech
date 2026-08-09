jest.mock("@/core/server/session", () => ({
  requireAuth: jest.fn(),
}));

import { requireAuth } from "@/core/server/session";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";

const mockedRequireAuth = jest.mocked(requireAuth);

describe("requirePlatformOwner", () => {
  const originalOwnerEmail = process.env.PLATFORM_OWNER_EMAIL;

  beforeEach(() => {
    process.env.PLATFORM_OWNER_EMAIL = "andreykosir@gmail.com";
    jest.resetAllMocks();
  });

  afterAll(() => {
    if (originalOwnerEmail === undefined) {
      delete process.env.PLATFORM_OWNER_EMAIL;
    } else {
      process.env.PLATFORM_OWNER_EMAIL = originalOwnerEmail;
    }
  });

  it("returns 401 when no validated server session exists", async () => {
    mockedRequireAuth.mockResolvedValue(null);

    await expect(requirePlatformOwner()).resolves.toEqual({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });
  });

  it("returns 403 for an authenticated non-owner", async () => {
    mockedRequireAuth.mockResolvedValue({
      user: { id: "student-1", email: "student@example.com", role: "STUDENT" },
    } as never);

    await expect(requirePlatformOwner()).resolves.toEqual({
      ok: false,
      status: 403,
      error: "Forbidden",
    });
  });

  it("accepts the normalized owner identity and forwards request headers", async () => {
    const user = { id: "owner-1", email: "  ANDREYKOSIR@GMAIL.COM ", role: "STUDENT" };
    const headers = new Headers({ cookie: "session=value" });
    mockedRequireAuth.mockResolvedValue({ user } as never);

    await expect(requirePlatformOwner({ headers })).resolves.toEqual({
      ok: true,
      user,
      role: "student",
    });
    expect(mockedRequireAuth).toHaveBeenCalledWith({ headers });
  });
});
