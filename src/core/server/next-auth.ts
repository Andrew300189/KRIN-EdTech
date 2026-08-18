import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import {
  getVerifiedGoogleIdentity,
  provisionGoogleUser,
} from "@/core/server/google-user";
import { logAuthDiagnostic } from "@/core/server/auth-diagnostics";
import { isPlatformOwner, normalizeEmail } from "@/core/server/platform-owner";
import { touchUserPresence } from "@/core/server/presence";
import { clearLegacySession } from "@/core/server/session";
import { getSafePostAuthRedirectUrl } from "@/core/utils/safe-internal-path";

export const nextAuthOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  // Keep the callback/session cookies usable on HTTP localhost while
  // requiring Secure cookies in every production deployment. No `domain`
  // option is set, so browser cookies remain host-only and cannot be shared
  // with a different hostname.
  useSecureCookies: process.env.NODE_ENV === "production",
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: { params: { prompt: "select_account", access_type: "offline", response_type: "code" } },
    }),
  ],
  callbacks: {
    async signIn({ user, profile }) {
      logAuthDiagnostic({ event: "auth_provider", provider: "google" });

      const identity = getVerifiedGoogleIdentity(
        profile as Parameters<typeof getVerifiedGoogleIdentity>[0],
        user.image,
      );
      if (!identity) return false;

      const appUser = await provisionGoogleUser(identity, user.name);
      if (!appUser) return false;

      try {
        await touchUserPresence(appUser.id);
      } catch {
        // Presence must not block a successful Google sign-in.
      }

      // Google login replaces any stale password-session cookie from a
      // previously signed-in user in the same browser.
      await clearLegacySession();

      user.id = appUser.id;
      // Do not trust the provider's loose user object after verification.
      // The JWT/session must always contain the verified, normalized address
      // that provisionGoogleUser used to find or link the application user.
      user.email = identity.email;
      user.role = appUser.role;
      user.isNewGoogleUser = appUser.isNewUser;

      // Owner eligibility is deliberately independent of the database role.
      // The definitive CMS authorization remains in server route guards, but
      // a verified owner must never be rejected by the OAuth sign-in callback.
      const matchesOwner = isPlatformOwner(identity.email);
      logAuthDiagnostic({ event: "normalized_email_match_owner", matchesOwner });
      logAuthDiagnostic({
        event: "auth_success",
        provider: "google",
        isNewUser: appUser.isNewUser,
      });

      if (matchesOwner) return true;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        // `user` is present only for a new sign-in. Reissue all identity
        // claims from that verified sign-in instead of retaining stale values
        // from an older token.
        token.userId = user.id;
        token.sub = user.id;
        // Keep the verified Google address in the signed JWT explicitly.
        // CMS owner access is email-based and must not depend on a provider
        // default that can vary between callback/session invocations.
        const email = normalizeEmail(user.email);
        if (email) {
          token.email = email;
        } else {
          delete token.email;
        }
        token.role = user.role ?? "STUDENT";
        token.isNewGoogleUser = Boolean(user.isNewGoogleUser);
      }
      return token;
    },
    async session({ session, token }) {
      const userId = typeof token.userId === "string"
        ? token.userId
        : typeof token.sub === "string"
          ? token.sub
          : null;

      if (!userId) return session;

      session.user.id = userId;
      session.user.email = typeof token.email === "string"
        ? normalizeEmail(token.email) || null
        : null;
      session.user.role = typeof token.role === "string" ? token.role : "STUDENT";
      session.user.isNewGoogleUser = token.isNewGoogleUser === true;
      return session;
    },
    redirect({ url, baseUrl }) {
      return getSafePostAuthRedirectUrl(url, baseUrl);
    },
  },
  pages: { signIn: "/login", error: "/auth/error" },
};
