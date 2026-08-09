import "server-only";

type AuthProvider = "google" | "credentials";

export type AuthDiagnosticEvent =
  | { event: "auth_provider"; provider: AuthProvider }
  | { event: "auth_success"; provider: AuthProvider; isNewUser?: boolean }
  | { event: "normalized_email_match_owner"; matchesOwner: boolean }
  | { event: "session_has_email"; hasEmail: boolean }
  | { event: "post_auth_destination"; destination: string }
  | { event: "cms_guard_result"; result: "allowed" | "unauthorized" | "forbidden" };

function writeAuthDiagnostic(payload: Record<string, string | boolean>) {
  // Next.js development logging can render object arguments as `{}`. A JSON
  // string keeps the allowlisted event fields visible while remaining safe.
  console.info("[auth-diagnostic]", JSON.stringify(payload));
}

function diagnosticPathname(value: string) {
  return value.split(/[?#]/, 1)[0] || "/";
}

/**
 * Short-lived, allowlisted authentication diagnostics. The event shape
 * intentionally has no field for addresses, credentials, OAuth tokens,
 * session tokens, cookies, secrets, or raw errors.
 */
export function logAuthDiagnostic(event: AuthDiagnosticEvent) {
  if (process.env.NODE_ENV !== "development") return;

  switch (event.event) {
    case "auth_provider":
      writeAuthDiagnostic({ event: event.event, provider: event.provider });
      return;
    case "auth_success":
      writeAuthDiagnostic({
        event: event.event,
        provider: event.provider,
        ...(event.isNewUser === undefined ? {} : { isNewUser: event.isNewUser }),
      });
      return;
    case "normalized_email_match_owner":
      writeAuthDiagnostic({
        event: event.event,
        matchesOwner: event.matchesOwner,
      });
      return;
    case "session_has_email":
      writeAuthDiagnostic({ event: event.event, hasEmail: event.hasEmail });
      return;
    case "post_auth_destination":
      writeAuthDiagnostic({
        event: event.event,
        destination: diagnosticPathname(event.destination),
      });
      return;
    case "cms_guard_result":
      writeAuthDiagnostic({ event: event.event, result: event.result });
      return;
  }
}
