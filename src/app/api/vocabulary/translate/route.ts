import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { consumeRateLimit } from "@/core/server/rate-limit";
import { getVocabularySettings } from "@/modules/vocabulary/services/vocabulary.service";
import { TranslationProviderError, translateEnglishTerm } from "@/modules/vocabulary/services/libretranslate.service";

const querySchema = z.object({
  q: z.string().trim().min(1).max(1000),
  target: z.enum(["ru", "uk"]).optional(),
});

export async function GET(request: NextRequest) {
  const guard = await requireLearningUser(request);

  const parsed = querySchema.safeParse({
    q: request.nextUrl.searchParams.get("q") ?? "",
    target: request.nextUrl.searchParams.get("target") ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: "Enter a word, phrase or short sentence." }, { status: 400 });

  const visitor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
  const rateSubject = guard.ok ? `user:${guard.user.id}` : `guest:${visitor}`;
  const rate = consumeRateLimit(`vocabulary-translation:${rateSubject}`, 24, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many translation requests. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });
  }

  try {
    // A lesson's content language wins over the learner's general dictionary
    // setting. Other callers without an explicit target keep that setting.
    const targetLanguage = parsed.data.target ?? (guard.ok
      ? (await getVocabularySettings(guard.user.id)).translationLanguage
      : "ru");
    const translation = await translateEnglishTerm(parsed.data.q, targetLanguage);
    return NextResponse.json({ data: { translation } });
  } catch (error) {
    if (error instanceof TranslationProviderError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Translation is temporarily unavailable." }, { status: 502 });
  }
}
