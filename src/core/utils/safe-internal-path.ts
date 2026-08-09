const EXTERNAL_OR_ENCODED_PATH_SEPARATOR = /%(2f|5c)/i;

export const DEFAULT_AUTHENTICATED_PATH = "/dashboard";

/** Accept only application-relative navigation targets. */
export function getSafeInternalPath(
  value: string | null | undefined,
  fallback = DEFAULT_AUTHENTICATED_PATH,
) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    EXTERNAL_OR_ENCODED_PATH_SEPARATOR.test(value)
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(value, "https://krin.invalid");
    return parsed.origin === "https://krin.invalid"
      ? `${parsed.pathname}${parsed.search}${parsed.hash}`
      : fallback;
  } catch {
    return fallback;
  }
}

export function getSafeInternalUrl(
  value: string | null | undefined,
  baseUrl: string,
  fallback = DEFAULT_AUTHENTICATED_PATH,
) {
  const base = new URL(baseUrl);
  const safeFallback = getSafeInternalPath(fallback);
  const fallbackUrl = new URL(safeFallback, base).toString();

  try {
    const candidate = new URL(value ?? safeFallback, base);
    if (candidate.origin !== base.origin) return fallbackUrl;

    return new URL(
      getSafeInternalPath(
        `${candidate.pathname}${candidate.search}${candidate.hash}`,
        safeFallback,
      ),
      base,
    ).toString();
  } catch {
    return fallbackUrl;
  }
}

/**
 * Restricts the final NextAuth redirect to a safe internal destination.
 * The completion page runs the owner-first resolver after a session exists,
 * which avoids routing a platform owner through a generic dashboard.
 */
export function getSafePostAuthRedirectUrl(
  value: string | null | undefined,
  baseUrl: string,
) {
  const completionUrl = getSafeInternalUrl("/auth/complete", baseUrl);
  const resolvedUrl = getSafeInternalUrl(value, baseUrl, "/auth/complete");
  const candidate = new URL(resolvedUrl);

  if (
    candidate.pathname === "/" ||
    candidate.pathname === "/login" ||
    candidate.pathname === "/register" ||
    candidate.pathname.startsWith("/api/auth/")
  ) {
    return completionUrl;
  }

  return resolvedUrl;
}
