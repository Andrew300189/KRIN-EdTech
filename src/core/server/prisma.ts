import { PrismaClient } from "@/generated/prisma-client-payments-runtime";

declare global {
  // eslint-disable-next-line no-var
  var __krinPrismaSubscriptionSchema: PrismaClient | undefined;
}

export const prisma =
  global.__krinPrismaSubscriptionSchema ??
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
