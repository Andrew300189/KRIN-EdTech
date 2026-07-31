import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import {
  getVerifiedGoogleIdentity,
  provisionGoogleUser,
} from "@/core/server/google-user";
import { clearLegacySession } from "@/core/server/session";
import { getSafeInternalUrl } from "@/core/utils/safe-internal-path";

export const nextAuthOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: { params: { prompt: "select_account", access_type: "offline", response_type: "code" } },
    }),
  ],
  callbacks: {
    async signIn({ user, profile }) {
      const identity = getVerifiedGoogleIdentity(
        profile as Parameters<typeof getVerifiedGoogleIdentity>[0],
        user.image,
      );
      if (!identity) return false;

      const appUser = await provisionGoogleUser(identity, user.name);
      if (!appUser) return false;

      // Google login replaces any stale password-session cookie from a
      // previously signed-in user in the same browser.
      await clearLegacySession();

      user.id = appUser.id;
      (user as typeof user & { role?: string; isNewGoogleUser?: boolean }).role = appUser.role;
      (user as typeof user & { role?: string; isNewGoogleUser?: boolean }).isNewGoogleUser = appUser.isNewUser;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = (user as typeof user & { role?: string }).role ?? "STUDENT";
        token.isNewGoogleUser = Boolean(
          (user as typeof user & { isNewGoogleUser?: boolean }).isNewGoogleUser,
        );
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as typeof session.user & { id: string; role?: string }).id = token.sub;
        (session.user as typeof session.user & { id?: string; role?: string }).role = typeof token.role === "string" ? token.role : "STUDENT";
        (session.user as typeof session.user & { id?: string; isNewGoogleUser?: boolean }).isNewGoogleUser = token.isNewGoogleUser === true;
      }
      return session;
    },
    redirect({ url, baseUrl }) {
      return getSafeInternalUrl(url, baseUrl);
    },
  },
  pages: { signIn: "/login", error: "/auth/error" },
};
