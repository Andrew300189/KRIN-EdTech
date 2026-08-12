import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { nextAuthOptions } from "@/core/server/next-auth";
import { logAuthDiagnostic } from "@/core/server/auth-diagnostics";
import { getPublicAuthErrorPath } from "@/core/server/auth-error";
import { isPlatformOwner, normalizeEmail } from "@/core/server/platform-owner";
import { requireAuth } from "@/core/server/session";
import { getPostLoginPath } from "@/core/utils/workspace-path";
import { recordFunnelEvent } from "@/modules/analytics/services/funnel.service";

export default async function AuthCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [session, params] = await Promise.all([
    getServerSession(nextAuthOptions),
    searchParams,
  ]);
  if (!session?.user) redirect(getPublicAuthErrorPath("google_sign_in_failed"));

  const userId = session.user.id;
  if (!userId) redirect(getPublicAuthErrorPath("google_sign_in_failed"));

  // This is intentionally server-side. A verified Google session without an
  // email cannot be routed safely to an owner, teacher, or student workspace.
  const email = normalizeEmail(session.user.email);
  logAuthDiagnostic({ event: "session_has_email", hasEmail: Boolean(email) });
  if (!email) redirect(getPublicAuthErrorPath("google_sign_in_failed"));

  // NextAuth has already created its JWT cookie in the OAuth callback route.
  // Server Components cannot mutate cookies, and the shared session guard
  // validates this JWT directly. getPostLoginPath rechecks the owner-first
  // resolver and accepts only a safe internal callback target.
  let destination: string;
  try {
    destination = getPostLoginPath(email, session.user.role, params.next);
  } catch {
    redirect(getPublicAuthErrorPath("auth_unavailable"));
  }

  const authenticated = await requireAuth();
  if (!authenticated) redirect(getPublicAuthErrorPath("google_sign_in_failed"));

  if (destination === "/cms" || destination.startsWith("/cms/")) {
    let confirmedOwner = false;
    try {
      confirmedOwner = isPlatformOwner(authenticated.user.email);
    } catch {
      confirmedOwner = false;
    }

    if (!confirmedOwner) {
      redirect(getPublicAuthErrorPath("cms_access_denied"));
    }
  }

  if (
    session.user.isNewGoogleUser &&
    !authenticated.user.onboardingCompletedAt &&
    !(destination === "/cms" || destination.startsWith("/cms/"))
  ) {
    destination = `/onboarding?next=${encodeURIComponent(destination)}`;
  }

  if (session.user.isNewGoogleUser) {
    void recordFunnelEvent({
      eventId: `signup-complete:${authenticated.user.id}`,
      eventType: "SIGNUP_COMPLETE",
      pagePath: "/auth/complete",
      userId: authenticated.user.id,
      result: "SUCCEEDED",
    }).catch(() => undefined);
  }

  logAuthDiagnostic({ event: "post_auth_destination", destination });
  redirect(destination);
}
