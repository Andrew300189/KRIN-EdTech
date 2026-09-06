import "server-only";

import { cacheTranslation, getCachedTranslation } from "@/modules/vocabulary/services/translation-cache.service";

type LibreTranslateResponse = {
  translatedText?: unknown;
};

type MyMemoryResponse = {
  responseData?: { translatedText?: unknown };
};

export class TranslationProviderError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "TranslationProviderError";
  }
}

function providerUrl() {
  const configuredUrl = process.env.LIBRETRANSLATE_API_URL?.trim() || "https://libretranslate.com";
  let url: URL;
  try {
    url = new URL(configuredUrl);
  } catch {
    throw new TranslationProviderError("Translation service is not configured.", 503);
  }

  const isLocalService = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1";
  const allowPrivateHttp = process.env.LIBRETRANSLATE_ALLOW_INSECURE_HTTP === "true";
  if (url.protocol !== "https:" && !isLocalService && !allowPrivateHttp) {
    throw new TranslationProviderError("Translation service is not configured.", 503);
  }
  if (url.hostname === "libretranslate.com" && !process.env.LIBRETRANSLATE_API_KEY?.trim()) {
    throw new TranslationProviderError("Translation service is not configured.", 503);
  }

  return new URL("translate", `${url.toString().replace(/\/+$/, "")}/`);
}

function targetLanguage(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase().split(/[-_]/)[0] ?? "ru";
  return /^[a-z]{2,3}$/.test(normalized) ? normalized : "ru";
}

function publicFallbackEnabled() {
  return process.env.TRANSLATION_PUBLIC_FALLBACK_ENABLED !== "false";
}

async function translateWithLibreTranslate(term: string, target: string) {
  const response = await fetch(providerUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      q: term,
      source: "en",
      target,
      format: "text",
      alternatives: 0,
      ...(process.env.LIBRETRANSLATE_API_KEY?.trim() ? { api_key: process.env.LIBRETRANSLATE_API_KEY.trim() } : {}),
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(6_000),
  });

  if (!response.ok) {
    if (response.status === 429) throw new TranslationProviderError("Too many translation requests. Please try again shortly.", 429);
    throw new TranslationProviderError("Translation is temporarily unavailable.", 502);
  }

  const payload = await response.json().catch(() => null) as LibreTranslateResponse | null;
  const translation = typeof payload?.translatedText === "string" ? payload.translatedText.trim() : "";
  if (!translation) throw new TranslationProviderError("Translation is temporarily unavailable.", 502);
  return translation;
}

/**
 * Keeps short, learner-selected vocabulary usable while the platform-owned
 * LibreTranslate instance is offline. The result is cached by the caller,
 * so a repeated lookup does not create a second provider request.
 */
async function translateWithPublicFallback(term: string, target: string) {
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", term);
  url.searchParams.set("langpair", `en|${target}`);

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(6_000),
  });
  if (!response.ok) throw new TranslationProviderError("Translation is temporarily unavailable.", 502);

  const payload = await response.json().catch(() => null) as MyMemoryResponse | null;
  const translation = typeof payload?.responseData?.translatedText === "string" ? payload.responseData.translatedText.trim() : "";
  if (!translation) throw new TranslationProviderError("Translation is temporarily unavailable.", 502);
  return translation;
}

/**
 * Translates learner-selected vocabulary or a short exercise sentence. It is
 * intentionally server-only: the provider key and endpoint never reach the
 * lesson bundle.
 */
export async function translateEnglishTerm(termInput: string, targetLocale: string | null | undefined) {
  const term = termInput.trim().replace(/\s+/g, " ");
  if (!term || term.length > 1000) throw new TranslationProviderError("Enter a word, phrase or short sentence.", 400);
  const target = targetLanguage(targetLocale);

  const cachedTranslation = await getCachedTranslation(term, "en", target);
  if (cachedTranslation) return cachedTranslation;

  let translation: string;
  try {
    translation = await translateWithLibreTranslate(term, target);
  } catch (error) {
    // Do not bypass an intentional rate limit or malformed input. These are
    // meaningful errors and should reach the learner unchanged.
    if (!(error instanceof TranslationProviderError) || error.status === 400 || error.status === 429 || !publicFallbackEnabled()) throw error;
    translation = await translateWithPublicFallback(term, target);
  }

  await cacheTranslation(term, "en", target, translation);
  return translation;
}
