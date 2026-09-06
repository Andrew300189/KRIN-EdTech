import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit } from "@/core/server/rate-limit";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { getExerciseTranslationSource, purchaseExerciseTranslation } from "@/modules/courses/services/content.service";
import { getVocabularySettings } from "@/modules/vocabulary/services/vocabulary.service";
import { TranslationProviderError, translateEnglishTerm } from "@/modules/vocabulary/services/libretranslate.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ exerciseId: string }> }) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: "Sign in to show a translation." }, { status: 401 });

  const { exerciseId } = await params;
  const limit = consumeRateLimit(`exercise-translation:${guard.user.id}:${exerciseId}`, 8, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many translation requests. Please wait before trying again." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  }

  try {
    const source = await getExerciseTranslationSource(guard.user.id, exerciseId);
    // Translate before the debit. A provider failure can never cost the learner XP.
    const translation = source.authoredTranslation ?? await translateEnglishTerm(
      source.source,
      (await getVocabularySettings(guard.user.id)).translationLanguage,
    );
    const purchase = await purchaseExerciseTranslation(guard.user.id, exerciseId);
    return NextResponse.json({ data: { translation, ...purchase } });
  } catch (error) {
    if (error instanceof TranslationProviderError) return NextResponse.json({ error: error.message }, { status: error.status });
    const message = error instanceof Error ? error.message : "Unable to show the translation.";
    return NextResponse.json({ error: message }, { status: /access|sign in|different learner/i.test(message) ? 403 : 400 });
  }
}
