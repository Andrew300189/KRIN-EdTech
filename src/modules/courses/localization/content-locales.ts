/**
 * Course-content locales are intentionally independent from the client i18n
 * context. This module is safe to import in server code, route handlers and
 * client components without coupling learner content to localStorage.
 */
export const contentLocales = ["en", "uk", "ru", "es", "fr", "it", "de", "pt", "pl"] as const;

export type ContentLocaleCode = (typeof contentLocales)[number];

export const defaultContentLocale: ContentLocaleCode = "en";

export const contentLocaleLabels: Record<ContentLocaleCode, { label: string; nativeLabel: string }> = {
  en: { label: "English", nativeLabel: "English" },
  uk: { label: "Ukrainian", nativeLabel: "Українська" },
  ru: { label: "Russian", nativeLabel: "Русский" },
  es: { label: "Spanish", nativeLabel: "Español" },
  fr: { label: "French", nativeLabel: "Français" },
  it: { label: "Italian", nativeLabel: "Italiano" },
  de: { label: "German", nativeLabel: "Deutsch" },
  pt: { label: "Portuguese", nativeLabel: "Português" },
  pl: { label: "Polish", nativeLabel: "Polski" },
};

export function normalizeContentLocale(value: string | null | undefined): ContentLocaleCode {
  const normalized = value?.trim().toLowerCase().split("-")[0] ?? defaultContentLocale;
  return contentLocales.includes(normalized as ContentLocaleCode)
    ? normalized as ContentLocaleCode
    : defaultContentLocale;
}

export function isContentLocale(value: string | null | undefined): value is ContentLocaleCode {
  return contentLocales.includes(value as ContentLocaleCode);
}

export function isTranslatableContentLocale(value: string | null | undefined): value is Exclude<ContentLocaleCode, "en"> {
  return normalizeContentLocale(value) !== defaultContentLocale;
}
