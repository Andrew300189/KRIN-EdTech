import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __krinPrisma: PrismaClient | undefined;
}

export const prisma =
  global.__krinPrisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__krinPrisma = prisma;
}
