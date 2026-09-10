import { SESSION_CONFIG } from "@/core/constants/session";

/**
 * Keeps the previous persistent-cookie behaviour for callers that do not yet
 * send a preference, while allowing an explicit unchecked "Remember me"
 * control to create a browser-session cookie.
 */
export function getSessionCookieMaxAge(rememberMe?: boolean) {
  return rememberMe === false
    ? undefined
    : SESSION_CONFIG.ABSOLUTE_TTL_SECONDS;
}
