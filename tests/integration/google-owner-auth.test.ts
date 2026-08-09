import { encode } from "next-auth/jwt";
import { NextRequest } from "next/server";
import { nextAuthOptions } from "@/core/server/next-auth";
import {
  getVerifiedGoogleIdentity,
  provisionGoogleUser,
} from "@/core/server/google-user";
import { isPlatformOwner } from "@/core/server/platform-owner";
import { getPostLoginPath } from "@/core/utils/workspace-path";
import { proxy } from "@/proxy";

type StoredGoogleUser = {
  id: string;
  email: string;
  username: string;
  name: string;
  passwordHash: string;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
  provider: string | null;
  providerAccountId: string | null;
  emailVerified: boolean;
  role: "STUDENT";
  isBlocked: boolean;
  deletedAt: Date | null;
  lastLoginAt: Date | null;
};

function createGoogleUserStore(records: StoredGoogleUser[]) {
  return {
    findUnique: jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
      if ("email" in where) return records.find((user) => user.email === where.email) ?? null;
      if ("username" in where) return records.find((user) => user.username === where.username) ?? null;

      const account = where.provider_providerAccountId as
        | { provider: string; providerAccountId: string }
        | undefined;
      return records.find((user) =>
        user.provider === account?.provider && user.providerAccountId === account?.providerAccountId,
      ) ?? null;
    }),
    create: jest.fn(),
    update: jest.fn(async ({ where, data }: {
      where: { id: string };
      data: Partial<StoredGoogleUser>;
    }) => {
      const user = records.find((candidate) => candidate.id === where.id);
      if (!user) throw new Error("Test user not found");
      Object.assign(user, data);
      return user;
    }),
  };
}

describe("Google owner authentication integration", () => {
  const originalOwnerEmail = process.env.PLATFORM_OWNER_EMAIL;
  const originalNextAuthSecret = process.env.NEXTAUTH_SECRET;

  beforeEach(() => {
    process.env.PLATFORM_OWNER_EMAIL = "andreykosir@gmail.com";
    process.env.NEXTAUTH_SECRET = "google-owner-integration-secret";
  });

  afterEach(() => {
    if (originalOwnerEmail === undefined) delete process.env.PLATFORM_OWNER_EMAIL;
    else process.env.PLATFORM_OWNER_EMAIL = originalOwnerEmail;
    if (originalNextAuthSecret === undefined) delete process.env.NEXTAUTH_SECRET;
    else process.env.NEXTAUTH_SECRET = originalNextAuthSecret;
  });

  it("links a verified Google callback to the existing owner and preserves CMS access", async () => {
    const records: StoredGoogleUser[] = [{
      id: "owner-1",
      email: "andreykosir@gmail.com",
      username: "andrey",
      name: "Andrey",
      passwordHash: "existing-credentials-password-hash",
      firstName: "Andrey",
      lastName: null,
      avatar: null,
      provider: null,
      providerAccountId: null,
      emailVerified: false,
      role: "STUDENT",
      isBlocked: false,
      deletedAt: null,
      lastLoginAt: null,
    }];
    const store = createGoogleUserStore(records);
    const identity = getVerifiedGoogleIdentity({
      sub: "google-owner-subject",
      email: " ANDREYKOSIR@GMAIL.COM ",
      email_verified: true,
      given_name: "Andrey",
    });

    expect(identity).toMatchObject({
      provider: "google",
      providerAccountId: "google-owner-subject",
      email: "andreykosir@gmail.com",
    });
    if (!identity) throw new Error("Verified Google identity was not created");

    const provisioned = await provisionGoogleUser(identity, "Andrey", store as never);

    expect(provisioned).toEqual({ id: "owner-1", role: "STUDENT", isNewUser: false });
    expect(store.create).not.toHaveBeenCalled();
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      provider: "google",
      providerAccountId: "google-owner-subject",
      emailVerified: true,
      passwordHash: "existing-credentials-password-hash",
    });

    const jwt = nextAuthOptions.callbacks?.jwt;
    const session = nextAuthOptions.callbacks?.session;
    if (!jwt || !session) throw new Error("NextAuth callbacks are not configured");

    const token = await jwt({
      token: {},
      user: { id: provisioned.id, email: identity.email, name: "Andrey", role: provisioned.role },
    } as never);
    expect(token).toMatchObject({ userId: "owner-1", email: identity.email });

    const resolvedSession = await session({
      session: { user: { name: null, email: null, image: null }, expires: "2099-01-01T00:00:00.000Z" },
      token,
    } as never);
    expect(resolvedSession.user.email).toBe(identity.email);
    expect(isPlatformOwner(resolvedSession.user.email)).toBe(true);
    expect(getPostLoginPath(resolvedSession.user.email, resolvedSession.user.role)).toBe("/cms");

    const nextAuthSessionToken = await encode({
      secret: process.env.NEXTAUTH_SECRET!,
      token: { sub: "owner-1", userId: "owner-1", email: identity.email, role: "STUDENT" },
      maxAge: 60,
    });
    const middlewareResponse = await proxy(new NextRequest("http://localhost:3000/cms", {
      headers: { cookie: `next-auth.session-token=${nextAuthSessionToken}` },
    }));
    expect(middlewareResponse.status).toBe(200);
    expect(middlewareResponse.headers.get("x-middleware-next")).toBe("1");
  });
});
