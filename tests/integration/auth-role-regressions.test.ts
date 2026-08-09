import { createHmac } from "crypto";
import { NextRequest } from "next/server";
import { hashPassword, verifyPassword } from "@/core/server/password";
import { authorizeCredentials } from "@/modules/auth/services/credentials-login.service";
import { getPostLoginPath, resolvePostAuthDestination } from "@/core/utils/workspace-path";
import { proxy } from "@/proxy";

const TEST_SECRET = "role-regression-test-secret";

function createCredentialsCookie(user: { id: string; email: string; role: string }) {
  const payload = Buffer.from(JSON.stringify({
    userId: user.id,
    sessionId: `session-${user.id}`,
    email: user.email,
    role: user.role.toLowerCase(),
    nonce: "test-nonce",
    exp: Math.floor(Date.now() / 1000) + 60,
  }), "utf8").toString("base64url");
  const signature = createHmac("sha256", TEST_SECRET).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

describe("role-routing regressions", () => {
  const originalOwnerEmail = process.env.PLATFORM_OWNER_EMAIL;
  const originalNextAuthSecret = process.env.NEXTAUTH_SECRET;

  beforeEach(() => {
    process.env.PLATFORM_OWNER_EMAIL = "andreykosir@gmail.com";
    process.env.NEXTAUTH_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    if (originalOwnerEmail === undefined) delete process.env.PLATFORM_OWNER_EMAIL;
    else process.env.PLATFORM_OWNER_EMAIL = originalOwnerEmail;
    if (originalNextAuthSecret === undefined) delete process.env.NEXTAUTH_SECRET;
    else process.env.NEXTAUTH_SECRET = originalNextAuthSecret;
  });

  it.each([
    ["Student", "student@test.com", "student-password", "STUDENT", "/student"],
    ["Teacher", "teacher@test.com", "teacher-password", "TEACHER", "/teacher"],
  ])("keeps %s credentials outside CMS", async (_label, email, password, role, destination) => {
    const user = {
      id: `id-${role.toLowerCase()}`,
      email,
      name: role,
      role,
      passwordHash: hashPassword(password),
      isBlocked: false,
      deletedAt: null,
    };
    const authorization = await authorizeCredentials(
      { email, password },
      { findByEmail: jest.fn().mockResolvedValue(user), verifyPassword },
    );

    expect(authorization).toMatchObject({ ok: true, user: { email, role } });
    if (!authorization.ok) throw new Error("Credentials authorization unexpectedly failed");
    expect(getPostLoginPath(authorization.user.email, authorization.user.role)).toBe(destination);

    const response = await proxy(new NextRequest("http://localhost:3000/cms", {
      headers: { cookie: `krin_session=${createCredentialsCookie(authorization.user)}` },
    }));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`http://localhost:3000${destination}`);
  });

  it("sends non-owner Google users to their role dashboard and owner Google users to CMS", () => {
    expect(resolvePostAuthDestination("student-google@test.com", "STUDENT")).toBe("/student");
    expect(resolvePostAuthDestination("teacher-google@test.com", "TEACHER")).toBe("/teacher");
    expect(resolvePostAuthDestination("andreykosir@gmail.com", "STUDENT")).toBe("/cms");
  });
});
