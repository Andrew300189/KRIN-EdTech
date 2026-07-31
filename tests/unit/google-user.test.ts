import {
  getVerifiedGoogleIdentity,
  provisionGoogleUser,
} from "@/core/server/google-user";

type StoredUser = {
  id: string;
  email: string;
  username: string;
  name: string;
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

function user(overrides: Partial<StoredUser> = {}): StoredUser {
  return {
    id: "user-1",
    email: "student@example.com",
    username: "student",
    name: "Student",
    firstName: null,
    lastName: null,
    avatar: null,
    provider: null,
    providerAccountId: null,
    emailVerified: false,
    role: "STUDENT",
    isBlocked: false,
    deletedAt: null,
    lastLoginAt: null,
    ...overrides,
  };
}

function createStore(records: StoredUser[]) {
  const findUnique = jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
    if ("email" in where) return records.find((record) => record.email === where.email) ?? null;
    if ("username" in where) return records.find((record) => record.username === where.username) ?? null;

    const identity = where.provider_providerAccountId as
      | { provider: string; providerAccountId: string }
      | undefined;
    return (
      records.find(
        (record) =>
          record.provider === identity?.provider &&
          record.providerAccountId === identity?.providerAccountId,
      ) ?? null
    );
  });

  const create = jest.fn(async ({ data }: { data: StoredUser }) => {
    const created = user({ ...data, id: `user-${records.length + 1}` });
    records.push(created);
    return created;
  });

  const update = jest.fn(async ({
    where,
    data,
  }: {
    where: { id: string };
    data: Partial<StoredUser>;
  }) => {
    const existing = records.find((record) => record.id === where.id);
    if (!existing) throw new Error("User not found");
    Object.assign(existing, data);
    return existing;
  });

  return { findUnique, create, update };
}

const identity = {
  provider: "google" as const,
  providerAccountId: "google-sub-123",
  email: "student@example.com",
  avatar: "https://images.example/avatar.png",
  firstName: "Student",
  lastName: "Name",
};

describe("Google user provisioning", () => {
  it("accepts only Google profiles with a verified email and stable subject", () => {
    expect(
      getVerifiedGoogleIdentity({
        sub: "google-sub-123",
        email: " Student@Example.com ",
        email_verified: true,
        given_name: "Student",
        family_name: "Name",
      }),
    ).toEqual({ ...identity, avatar: null });
    expect(
      getVerifiedGoogleIdentity({
        sub: "google-sub-123",
        email: "student@example.com",
        email_verified: false,
      }),
    ).toBeNull();
  });

  it("creates one new Student user with Google identity fields", async () => {
    const records: StoredUser[] = [];
    const store = createStore(records);

    const result = await provisionGoogleUser(identity, "Student Name", store as never);

    expect(result).toMatchObject({ id: "user-1", role: "STUDENT", isNewUser: true });
    expect(store.create).toHaveBeenCalledTimes(1);
    expect(records[0]).toMatchObject({
      email: identity.email,
      name: "Student Name",
      firstName: "Student",
      lastName: "Name",
      provider: "google",
      providerAccountId: "google-sub-123",
      emailVerified: true,
      role: "STUDENT",
    });
    expect(records[0].lastLoginAt).toBeInstanceOf(Date);
  });

  it("signs in an existing Google user without creating a duplicate", async () => {
    const records = [
      user({
        provider: "google",
        providerAccountId: "google-sub-123",
        emailVerified: true,
      }),
    ];
    const store = createStore(records);

    const result = await provisionGoogleUser(identity, "Updated Name", store as never);

    expect(result).toMatchObject({ id: "user-1", isNewUser: false });
    expect(store.create).not.toHaveBeenCalled();
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      name: "Student",
      firstName: "Student",
      lastName: "Name",
      emailVerified: true,
    });
    expect(records[0].lastLoginAt).toBeInstanceOf(Date);
  });

  it("links a pre-existing email/password user to the verified Google account", async () => {
    const records = [user()];
    const store = createStore(records);

    const result = await provisionGoogleUser(identity, "Student", store as never);

    expect(result).toMatchObject({ id: "user-1", isNewUser: false });
    expect(store.create).not.toHaveBeenCalled();
    expect(records[0]).toMatchObject({
      provider: "google",
      providerAccountId: "google-sub-123",
      emailVerified: true,
    });
  });

  it("refuses to link a Google account that belongs to another application user", async () => {
    const records = [
      user({
        id: "user-2",
        email: "other@example.com",
        username: "other",
        provider: "google",
        providerAccountId: "google-sub-123",
      }),
      user(),
    ];
    const store = createStore(records);

    const result = await provisionGoogleUser(identity, "Student", store as never);

    expect(result).toBeNull();
    expect(store.create).not.toHaveBeenCalled();
    expect(store.update).not.toHaveBeenCalled();
  });
});
