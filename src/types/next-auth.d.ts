import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string | null;
      role: string;
      isNewGoogleUser: boolean;
    } & Omit<NonNullable<DefaultSession["user"]>, "email">;
  }

  interface User {
    role?: string;
    isNewGoogleUser?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    /** Primary application user id. `sub` remains for existing tokens. */
    userId?: string;
    role?: string;
    isNewGoogleUser?: boolean;
  }
}

export {};
