import { PrismaClient } from "@/generated/prisma-client-payments-runtime";

declare global {
  // eslint-disable-next-line no-var
  var __krinPrismaSubscriptionSchema: PrismaClient | undefined;
}

const cachedPrisma = global.__krinPrismaSubscriptionSchema;
// Prisma delegates are fixed when the client is created. During `next dev`
// the global singleton can outlive a schema generation, leaving a stale
// client without a newly added model. Replace that client once, rather than
// surfacing a vague "updateMany of undefined" error from a route.
const cachedClientIsCurrent = Boolean(
  cachedPrisma &&
  "mistakeReviewRun" in cachedPrisma &&
  "courseReview" in cachedPrisma,
);

export const prisma =
  (cachedClientIsCurrent ? cachedPrisma : undefined) ??
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__krinPrismaSubscriptionSchema = prisma;
}
