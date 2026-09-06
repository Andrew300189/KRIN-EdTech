import { revalidateTag, unstable_cache } from "next/cache";

/**
 * All learner-visible catalogue and lesson data shares one tag. A CMS write
 * invalidates it immediately, while the long TTL keeps Neon untouched for
 * normal anonymous traffic between edits.
 */
export const PUBLIC_CONTENT_CACHE_TAG = "public-content";
export const PUBLIC_CONTENT_REVALIDATE_SECONDS = 60 * 60;

export function cachePublicContent<Args extends unknown[], Result>(
  keyParts: string[],
  read: (...args: Args) => Promise<Result>,
) {
  return unstable_cache(read, keyParts, {
    revalidate: PUBLIC_CONTENT_REVALIDATE_SECONDS,
    tags: [PUBLIC_CONTENT_CACHE_TAG],
  });
}

/** Call only after a successful CMS transaction, never before it commits. */
export function invalidatePublicContentCache() {
  // `max` gives public visitors stale-while-revalidate behaviour: no thundering
  // herd against Neon after an editor publishes content.
  revalidateTag(PUBLIC_CONTENT_CACHE_TAG, "max");
}
