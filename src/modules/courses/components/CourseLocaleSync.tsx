"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "@/core/i18n/locale";

/**
 * Course copy is rendered on the server, whereas the interface language is
 * chosen in the browser.  Keep the legacy To Be course on a locale route once
 * a learner has selected Russian or Ukrainian, so the server receives the
 * same locale and never renders a mixed-language page.
 */
export function CourseLocaleSync({ courseSlug, routeLocale }: { courseSlug: string; routeLocale?: string }) {
  const { locale } = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (routeLocale || courseSlug !== "verb-to-be-masterclass") return;
    const canonicalPath = pathname.replace(/^\/(?:uk|ru)(?=\/courses\/)/, "");
    if (!new RegExp(`^/courses/${courseSlug}(?:/|$)`).test(canonicalPath)) return;
    if (locale !== "uk" && locale !== "ru") return;
    router.replace(`/${locale}${canonicalPath}`);
  }, [courseSlug, locale, pathname, routeLocale, router]);

  return null;
}
