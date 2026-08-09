jest.mock("@/core/server/session", () => ({
  requireAuth: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

import CmsLayout from "@/app/cms/layout";
import { nextAuthOptions } from "@/core/server/next-auth";
import { hashPassword, verifyPassword } from "@/core/server/password";
import { isPlatformOwner } from "@/core/server/platform-owner";
import { requireAuth } from "@/core/server/session";
import { getPostLoginPath } from "@/core/utils/workspace-path";
import { redirect } from "next/navigation";
import { authorizeCredentials } from "@/modules/auth/services/credentials-login.service";

const TEST_OWNER_EMAIL = "andreykosir@gmail.com";
const TEST_OWNER_PASSWORD = "integration-test-owner-password";

describe("credentials owner authentication integration", () => {
  const originalOwnerEmail = process.env.PLATFORM_OWNER_EMAIL;
  const mockedRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;
  const mockedRedirect = redirect as jest.MockedFunction<typeof redirect>;

  beforeEach(() => {
    process.env.PLATFORM_OWNER_EMAIL = TEST_OWNER_EMAIL;
  });

  afterEach(() => {
    if (originalOwnerEmail === undefined) {
      delete process.env.PLATFORM_OWNER_EMAIL;
    } else {
      process.env.PLATFORM_OWNER_EMAIL = originalOwnerEmail;
    }
    mockedRequireAuth.mockReset();
    mockedRedirect.mockReset();
  });

  it("authorizes the owner, preserves email claims, and allows the CMS layout", async () => {
    const owner = {
      id: "integration-owner-id",
      email: TEST_OWNER_EMAIL,
      name: "Integration Owner",
      role: "STUDENT",
      passwordHash: hashPassword(TEST_OWNER_PASSWORD),
      isBlocked: false,
      deletedAt: null,
    };
    const findByEmail = jest.fn(async (email: string) =>
      email === TEST_OWNER_EMAIL ? owner : null,
    );

    const authorization = await authorizeCredentials(
      {
        email: " ANDREYKOSIR@GMAIL.COM ",
        password: TEST_OWNER_PASSWORD,
      },
      { findByEmail, verifyPassword },
    );

    expect(authorization).toMatchObject({
      ok: true,
      user: {
        id: owner.id,
        email: TEST_OWNER_EMAIL,
        name: owner.name,
        role: "STUDENT",
      },
    });
    expect(findByEmail).toHaveBeenCalledWith(TEST_OWNER_EMAIL);

    if (!authorization.ok) throw new Error("Test owner was not authorized");

    const jwt = nextAuthOptions.callbacks?.jwt;
    const session = nextAuthOptions.callbacks?.session;
    if (!jwt || !session) throw new Error("NextAuth callbacks are not configured");

    const token = await jwt({
      token: {},
      user: authorization.user,
    } as never);
    expect(token).toMatchObject({
      userId: owner.id,
      email: TEST_OWNER_EMAIL,
      role: "STUDENT",
    });

    const resolvedSession = await session({
      session: {
        user: { name: null, email: null, image: null },
        expires: "2099-01-01T00:00:00.000Z",
      },
      token,
    } as never);
    expect(resolvedSession.user).toMatchObject({
      id: owner.id,
      email: TEST_OWNER_EMAIL,
      role: "STUDENT",
    });

    expect(isPlatformOwner(resolvedSession.user.email)).toBe(true);
    expect(getPostLoginPath(resolvedSession.user.email, resolvedSession.user.role)).toBe(
      "/cms",
    );

    mockedRequireAuth.mockResolvedValue({
      session: { userId: owner.id, sessionId: "integration-session-id" },
      user: { id: owner.id, email: TEST_OWNER_EMAIL, role: "STUDENT" },
    } as never);

    expect(await CmsLayout({ children: "CMS content" })).toBeDefined();
    expect(mockedRedirect).not.toHaveBeenCalled();
  });
});
