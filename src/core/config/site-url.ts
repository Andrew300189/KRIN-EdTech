/** Canonical public origin. Override when the custom domain is actually live. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://krin-ed-tech.vercel.app").replace(/\/$/, "");
