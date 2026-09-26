import { NextRequest } from "next/server";

jest.mock("@/modules/courses/server/content-access", () => ({ requireLearningUser: jest.fn() }));
jest.mock("@/core/server/rate-limit", () => ({ consumeRateLimit: jest.fn() }));
jest.mock("@/modules/vocabulary/services/vocabulary.service", () => ({ getVocabularySettings: jest.fn() }));
jest.mock("@/modules/vocabulary/services/libretranslate.service", () => ({
  TranslationProviderError: class TranslationProviderError extends Error {},
  translateEnglishTerm: jest.fn(),
}));

import { GET } from "@/app/api/vocabulary/translate/route";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { consumeRateLimit } from "@/core/server/rate-limit";
import { getVocabularySettings } from "@/modules/vocabulary/services/vocabulary.service";
import { translateEnglishTerm } from "@/modules/vocabulary/services/libretranslate.service";

describe("lesson dictionary translation locale", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(requireLearningUser).mockResolvedValue({ ok: true, user: { id: "learner" } } as never);
    jest.mocked(consumeRateLimit).mockReturnValue({ allowed: true, retryAfterSeconds: 0 });
    jest.mocked(getVocabularySettings).mockResolvedValue({ translationLanguage: "ru" } as never);
    jest.mocked(translateEnglishTerm).mockResolvedValue("переклад");
  });

  it("uses Ukrainian for a Ukrainian lesson even when the profile language is Russian", async () => {
    const response = await GET(new NextRequest("https://example.test/api/vocabulary/translate?q=book&target=uk"));

    expect(response.status).toBe(200);
    expect(translateEnglishTerm).toHaveBeenCalledWith("book", "uk");
    expect(getVocabularySettings).not.toHaveBeenCalled();
  });

  it("uses Russian for a Russian lesson even when the profile language is Ukrainian", async () => {
    jest.mocked(getVocabularySettings).mockResolvedValue({ translationLanguage: "uk" } as never);
    await GET(new NextRequest("https://example.test/api/vocabulary/translate?q=book&target=ru"));

    expect(translateEnglishTerm).toHaveBeenCalledWith("book", "ru");
  });

  it("retains the profile setting for callers outside a localized lesson", async () => {
    jest.mocked(getVocabularySettings).mockResolvedValue({ translationLanguage: "uk" } as never);
    await GET(new NextRequest("https://example.test/api/vocabulary/translate?q=book"));

    expect(translateEnglishTerm).toHaveBeenCalledWith("book", "uk");
  });

  it("rejects unsupported target languages", async () => {
    const response = await GET(new NextRequest("https://example.test/api/vocabulary/translate?q=book&target=de"));

    expect(response.status).toBe(400);
    expect(translateEnglishTerm).not.toHaveBeenCalled();
  });
});
