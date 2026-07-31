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
) {
  const base = new URL(baseUrl);

  try {
    const candidate = new URL(value ?? DEFAULT_AUTHENTICATED_PATH, base);
    if (candidate.origin !== base.origin) return base.toString();

    return new URL(
      getSafeInternalPath(
        `${candidate.pathname}${candidate.search}${candidate.hash}`,
      ),
      base,
    ).toString();
  } catch {
    return base.toString();
  }
}
