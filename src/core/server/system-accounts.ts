import type { Prisma } from "@/generated/prisma-client-payments-runtime";

/**
 * Technical identities create and own seeded content, but are never people in
 * learner-facing directories, rankings, or account reports.
 */
export const SYSTEM_ACCOUNT_EMAILS = ["content@seed.krin.local"] as const;

export function excludeSystemAccounts(): Prisma.UserWhereInput {
  return { email: { notIn: [...SYSTEM_ACCOUNT_EMAILS] } };
}

export function isSystemAccountEmail(email: string | null | undefined) {
  return Boolean(email && SYSTEM_ACCOUNT_EMAILS.includes(email.trim().toLowerCase() as (typeof SYSTEM_ACCOUNT_EMAILS)[number]));
}
