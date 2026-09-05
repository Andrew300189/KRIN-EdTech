"use client";

import { useLocale } from "./locale";

/**
 * Lets server-rendered pages opt into the interface locale without moving
 * their data loading to the browser. Content authored in CMS stays untouched.
 */
export function LocalizedText({
  id,
  fallback,
  values,
}: {
  id: string;
  fallback: string;
  values?: Record<string, string | number>;
}) {
  const { t } = useLocale();
  const translated = t(id, values);
  return <>{translated === id ? fallback : translated}</>;
}
