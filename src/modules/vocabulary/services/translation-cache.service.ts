import "server-only";

import { createHash } from "node:crypto";
import { createClient } from "redis";

type TranslationRedisClient = ReturnType<typeof createClient>;

let clientPromise: Promise<TranslationRedisClient | null> | null = null;

function cacheEnabled() {
  return process.env.TRANSLATION_CACHE_ENABLED !== "false" && Boolean(process.env.TRANSLATION_REDIS_URL?.trim());
}

function normalizedTerm(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
}

export function translationCacheKey(term: string, sourceLanguage: string, targetLanguage: string) {
  const digest = createHash("sha256")
    .update(`${sourceLanguage.trim().toLowerCase()}\u0000${targetLanguage.trim().toLowerCase()}\u0000${normalizedTerm(term)}`)
    .digest("hex");
  return `krin:translation:v1:${digest}`;
}

export function secondsUntilNextUtcDay(now = new Date()) {
  const nextDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(1, Math.ceil((nextDay - now.getTime()) / 1_000));
}

async function getClient() {
  if (!cacheEnabled()) return null;
  if (clientPromise) return clientPromise;

  clientPromise = (async () => {
    const client = createClient({
      url: process.env.TRANSLATION_REDIS_URL?.trim(),
      socket: { connectTimeout: 500, reconnectStrategy: false },
    });
    client.on("error", () => undefined);
    try {
      await client.connect();
      return client;
    } catch {
      clientPromise = null;
      if (client.isOpen) await client.disconnect().catch(() => undefined);
      return null;
    }
  })();

  return clientPromise;
}

export async function getCachedTranslation(term: string, sourceLanguage: string, targetLanguage: string) {
  try {
    const client = await getClient();
    if (!client) return null;
    const value = await client.get(translationCacheKey(term, sourceLanguage, targetLanguage));
    return value?.trim() || null;
  } catch {
    return null;
  }
}

export async function cacheTranslation(term: string, sourceLanguage: string, targetLanguage: string, translation: string) {
  try {
    const client = await getClient();
    if (!client) return;
    await client.set(translationCacheKey(term, sourceLanguage, targetLanguage), translation, {
      expiration: { type: "EX", value: secondsUntilNextUtcDay() },
    });
  } catch {
    // Cache is an optimization. Provider availability must not depend on Redis.
  }
}
