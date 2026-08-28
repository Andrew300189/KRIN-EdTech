import "server-only";

import { cacheTranslation, getCachedTranslation } from "@/modules/vocabulary/services/translation-cache.service";

type LibreTranslateResponse = {
  translatedText?: unknown;
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

/**
 * Translates a short learner-selected term. It is intentionally server-only:
 * the provider key and endpoint are never exposed in the lesson bundle.
 */
export async function translateEnglishTerm(termInput: string, targetLocale: string | null | undefined) {
  const term = termInput.trim().replace(/\s+/g, " ");
  if (!term || term.length > 160) throw new TranslationProviderError("Enter a word or short phrase.", 400);
  const target = targetLanguage(targetLocale);

  const cachedTranslation = await getCachedTranslation(term, "en", target);
  if (cachedTranslation) return cachedTranslation;

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
  await cacheTranslation(term, "en", target, translation);
  return translation;
}
