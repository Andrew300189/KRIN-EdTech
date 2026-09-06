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
  "lessonSpacedReviewRun" in cachedPrisma &&
  "courseReview" in cachedPrisma,
);

function runtimeDatabaseUrl() {
  // Runtime requests must prefer DATABASE_URL. Keep an unpooled URL only for
  // Prisma migrations and local development; a serverless request against an
  // unpooled Neon endpoint can create too many direct connections.
  const configuredUrl = process.env.DATABASE_URL || process.env.DIRECT_DATABASE_URL;
  if (!configuredUrl) return undefined;

  const url = new URL(configuredUrl);
  const isNeon = url.hostname.endsWith(".neon.tech");
  const isPooledNeonUrl = url.hostname.includes("-pooler.");

  // Neon identifies the transaction pooler through the endpoint hostname.
  // This normalisation protects production if a direct Neon URL is pasted
  // into DATABASE_URL by mistake, but leaves local and non-Neon databases
  // untouched.
  if (isNeon && !isPooledNeonUrl) {
    const [endpoint, ...domain] = url.hostname.split(".");
    url.hostname = `${endpoint}-pooler.${domain.join(".")}`;
  }

  return url.toString();
}

export const prisma =
  (cachedClientIsCurrent ? cachedPrisma : undefined) ??
  new PrismaClient({
    datasources: {
      db: {
        // Serverless runtime: pooled Neon URL. The migration script explicitly
        // selects DATABASE_URL_UNPOOLED/DIRECT_DATABASE_URL instead.
        url: runtimeDatabaseUrl(),
      },
    },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__krinPrismaSubscriptionSchema = prisma;
}
