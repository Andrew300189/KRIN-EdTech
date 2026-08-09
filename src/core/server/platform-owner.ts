import "server-only";

let missingOwnerConfigurationReported = false;

/** Canonical email normalization for all server-side identity checks. */
export function normalizeEmail(email: string | null | undefined): string {
  return email?.trim().toLowerCase() ?? "";
}

/**
 * The platform owner is identified solely by the configured email address.
 * Roles remain independent, so an owner can retain the STUDENT role without
 * losing CMS access.
 */
export function isPlatformOwner(
  email: string | null | undefined,
): boolean {
  const ownerEmail = normalizeEmail(process.env.PLATFORM_OWNER_EMAIL);
  if (!ownerEmail) {
    const message = "PLATFORM_OWNER_EMAIL is not configured";
    if (process.env.NODE_ENV === "development" && !missingOwnerConfigurationReported) {
      missingOwnerConfigurationReported = true;
      console.error(message);
    }
    // Fail closed: nobody gains owner access while configuration is absent.
    // Development still surfaces a concise operator-facing diagnostic above.
    return false;
  }

  return normalizeEmail(email) === ownerEmail;
}
