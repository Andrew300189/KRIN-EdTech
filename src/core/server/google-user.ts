import { randomBytes } from "crypto";
import type { PrismaClient, User } from "@/generated/prisma-client-payments-runtime";
import { hashPassword } from "@/core/server/password";
import { normalizeEmail } from "@/core/server/platform-owner";
import { prisma } from "@/core/server/prisma";

export const GOOGLE_PROVIDER = "google";

export type GoogleProfile = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  picture?: string | null;
  given_name?: string;
  family_name?: string;
};

export type GoogleIdentity = {
  provider: typeof GOOGLE_PROVIDER;
  providerAccountId: string;
  email: string;
  avatar: string | null;
  firstName: string | null;
  lastName: string | null;
};

type GoogleUserStore = Pick<
  PrismaClient["user"],
  "findUnique" | "create" | "update"
>;

type ProvisionedGoogleUser = Pick<User, "id" | "role"> & {
  isNewUser: boolean;
};

function usernameBase(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 30) || "user"
  );
}

async function createUniqueUsername(
  store: GoogleUserStore,
  email: string,
  name: string | null | undefined,
) {
  const base = usernameBase(email.split("@")[0] || name || "user");

  for (let suffix = 0; ; suffix += 1) {
    const suffixText = suffix === 0 ? "" : `-${suffix}`;
    const username = `${base.slice(0, 30 - suffixText.length)}${suffixText}`;
    const existing = await store.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!existing) return username;
  }
}

export function getVerifiedGoogleIdentity(
  profile: GoogleProfile | undefined,
  fallbackAvatar?: string | null,
): GoogleIdentity | null {
  const providerAccountId = profile?.sub?.trim();
  // Keep the identity that reaches Prisma and NextAuth in the same canonical
  // form used by all owner-access checks.
  const email = normalizeEmail(profile?.email);

  if (!providerAccountId || !email || profile?.email_verified !== true) {
    return null;
  }

  return {
    provider: GOOGLE_PROVIDER,
    providerAccountId,
    email,
    avatar: profile.picture?.trim() || fallbackAvatar?.trim() || null,
    firstName: profile.given_name?.trim() || null,
    lastName: profile.family_name?.trim() || null,
  };
}

function nameParts(value: string | null | undefined): [string | null, string | null] {
  const parts = value?.trim().split(/\s+/).filter(Boolean) ?? [];
  return [parts[0] ?? null, parts.slice(1).join(" ") || null];
}

function profileUpdateData(
  identity: GoogleIdentity,
  name: string | null | undefined,
  existing: Pick<User, "avatar" | "name" | "firstName" | "lastName">,
) {
  const trimmedName = name?.trim();
  const [fallbackFirstName, fallbackLastName] = nameParts(trimmedName);
  const firstName = identity.firstName ?? fallbackFirstName;
  const lastName = identity.lastName ?? fallbackLastName;

  return {
    provider: identity.provider,
    providerAccountId: identity.providerAccountId,
    emailVerified: true,
    avatar: existing.avatar ?? identity.avatar,
    name: existing.name || trimmedName || firstName || "Learner",
    firstName: existing.firstName ?? firstName,
    lastName: existing.lastName ?? lastName,
    lastLoginAt: new Date(),
  };
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

/**
 * Resolves a verified Google identity to exactly one application user.
 * Email and provider identity are both unique in the database; a retry covers
 * the narrow race where two OAuth callbacks arrive at the same time.
 */
export async function provisionGoogleUser(
  identity: GoogleIdentity,
  name: string | null | undefined,
  store: GoogleUserStore = prisma.user,
): Promise<ProvisionedGoogleUser | null> {
  // Keep this function safe even if a future server caller constructs an
  // identity directly instead of going through getVerifiedGoogleIdentity.
  const normalizedIdentity = {
    ...identity,
    email: normalizeEmail(identity.email),
  };
  if (!normalizedIdentity.email) return null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const providerUser = await store.findUnique({
      where: {
        provider_providerAccountId: {
          provider: normalizedIdentity.provider,
          providerAccountId: normalizedIdentity.providerAccountId,
        },
      },
    });

    if (providerUser) {
      if (providerUser.isBlocked || providerUser.deletedAt) return null;

      if (providerUser.email !== normalizedIdentity.email) {
        const emailOwner = await store.findUnique({
          where: { email: normalizedIdentity.email },
          select: { id: true },
        });
        if (emailOwner && emailOwner.id !== providerUser.id) return null;
      }

      const updatedUser = await store.update({
        where: { id: providerUser.id },
        data: {
          ...profileUpdateData(normalizedIdentity, name, providerUser),
          email: normalizedIdentity.email,
        },
      });
      return { id: updatedUser.id, role: updatedUser.role, isNewUser: false };
    }

    const emailUser = await store.findUnique({ where: { email: normalizedIdentity.email } });
    if (emailUser) {
      if (emailUser.isBlocked || emailUser.deletedAt) return null;
      if (
        emailUser.providerAccountId &&
        (emailUser.provider !== normalizedIdentity.provider ||
          emailUser.providerAccountId !== normalizedIdentity.providerAccountId)
      ) {
        return null;
      }

      const updatedUser = await store.update({
        where: { id: emailUser.id },
        // profileUpdateData has no passwordHash field, so a credentials
        // password and all unrelated learner data remain intact.
        data: profileUpdateData(normalizedIdentity, name, emailUser),
      });
      return { id: updatedUser.id, role: updatedUser.role, isNewUser: false };
    }

    try {
      const username = await createUniqueUsername(store, normalizedIdentity.email, name);
      const [fallbackFirstName, fallbackLastName] = nameParts(name);
      const firstName = normalizedIdentity.firstName ?? fallbackFirstName ?? username;
      const lastName = normalizedIdentity.lastName ?? fallbackLastName;
      const newUser = await store.create({
        data: {
          email: normalizedIdentity.email,
          username,
          name: name?.trim() || `${firstName} ${lastName ?? ""}`.trim(),
          firstName,
          lastName,
          passwordHash: hashPassword(randomBytes(48).toString("base64url")),
          avatar: normalizedIdentity.avatar,
          provider: normalizedIdentity.provider,
          providerAccountId: normalizedIdentity.providerAccountId,
          emailVerified: true,
          role: "STUDENT",
          lastLoginAt: new Date(),
        },
      });
      return { id: newUser.id, role: newUser.role, isNewUser: true };
    } catch (error) {
      if (!isUniqueViolation(error) || attempt === 1) throw error;
    }
  }

  return null;
}
