import { translateEnglishTerm } from "@/modules/vocabulary/services/libretranslate.service";

const originalUrl = process.env.LIBRETRANSLATE_API_URL;
const originalKey = process.env.LIBRETRANSLATE_API_KEY;
const originalFallback = process.env.TRANSLATION_PUBLIC_FALLBACK_ENABLED;

describe("LibreTranslate vocabulary provider", () => {
  beforeEach(() => {
    process.env.LIBRETRANSLATE_API_URL = "http://localhost:5000";
    delete process.env.LIBRETRANSLATE_API_KEY;
    process.env.TRANSLATION_PUBLIC_FALLBACK_ENABLED = "true";
  });

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.LIBRETRANSLATE_API_URL;
    else process.env.LIBRETRANSLATE_API_URL = originalUrl;
    if (originalKey === undefined) delete process.env.LIBRETRANSLATE_API_KEY;
    else process.env.LIBRETRANSLATE_API_KEY = originalKey;
    if (originalFallback === undefined) delete process.env.TRANSLATION_PUBLIC_FALLBACK_ENABLED;
    else process.env.TRANSLATION_PUBLIC_FALLBACK_ENABLED = originalFallback;
    jest.restoreAllMocks();
  });

  it("sends only the selected term and the learner's target language to the server provider", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ translatedText: "готовый" }), { status: 200 }));

    await expect(translateEnglishTerm(" ready ", "ru-RU")).resolves.toBe("готовый");

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("http://localhost:5000/translate");
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(request.method).toBe("POST");
    expect(JSON.parse(String(request.body))).toMatchObject({ q: "ready", source: "en", target: "ru" });
  });

  it("uses the no-key fallback when the managed translator is not configured", async () => {
    process.env.LIBRETRANSLATE_API_URL = "https://libretranslate.com";
    delete process.env.LIBRETRANSLATE_API_KEY;
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ responseData: { translatedText: "готовый" } }), { status: 200 }));

    await expect(translateEnglishTerm("ready", "ru")).resolves.toBe("готовый");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("https://api.mymemory.translated.net/get");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("langpair=en%7Cru");
  });
});
