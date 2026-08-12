jest.mock("@/core/server/auth", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/core/server/rate-limit", () => ({
  consumeRateLimit: jest.fn(),
}));

jest.mock("@/modules/search/services/search.service", () => ({
  SearchService: { searchAll: jest.fn() },
  toSearchPrincipal: jest.fn(),
}));

jest.mock("@/modules/search/services/search-analytics.service", () => ({
  recordSearchQuery: jest.fn(),
}));

import { NextRequest } from "next/server";
import { GET } from "@/app/api/search/route";
import { getCurrentUser } from "@/core/server/auth";
import { consumeRateLimit } from "@/core/server/rate-limit";
import {
  SearchService,
  toSearchPrincipal,
} from "@/modules/search/services/search.service";
import { recordSearchQuery } from "@/modules/search/services/search-analytics.service";

const mockedUser = jest.mocked(getCurrentUser);
const mockedRate = jest.mocked(consumeRateLimit);
const mockedSearch = jest.mocked(SearchService.searchAll);
const mockedPrincipal = jest.mocked(toSearchPrincipal);
const mockedRecordSearchQuery = jest.mocked(recordSearchQuery);

describe("api search route", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockedRate.mockReturnValue({ allowed: true, retryAfterSeconds: 0 });
    mockedPrincipal.mockReturnValue({ userId: null, role: null, locale: "en" });
    mockedRecordSearchQuery.mockResolvedValue(undefined);
  });

  it("returns guidance for short query", async () => {
    mockedUser.mockResolvedValue(null as never);

    const request = new NextRequest(
      "http://localhost:3000/api/search?q=a&context=PUBLIC",
    );
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.total).toBe(0);
    expect(payload.message).toMatch(/at least two/i);
    expect(mockedSearch).not.toHaveBeenCalled();
  });

  it("rejects when rate limit is exceeded", async () => {
    mockedUser.mockResolvedValue(null as never);
    mockedRate.mockReturnValue({ allowed: false, retryAfterSeconds: 10 });

    const request = new NextRequest(
      "http://localhost:3000/api/search?q=english",
    );
    const response = await GET(request);

    expect(response.status).toBe(429);
    expect(mockedSearch).not.toHaveBeenCalled();
  });

  it("passes normalized params to SearchService", async () => {
    mockedUser.mockResolvedValue({
      id: "u1",
      role: "teacher",
      interfaceLanguage: "en",
    } as never);

    mockedSearch.mockResolvedValue({
      query: "english",
      context: "TEACHER",
      groups: [],
      items: [],
      total: 0,
      cursor: 0,
      nextCursor: null,
    } as never);

    const request = new NextRequest(
      "http://localhost:3000/api/search?q= english  &context=TEACHER&limit=25&cursor=5&sort=title&types=COURSE,LESSON&level=B1&category=business",
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockedSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        query: "english",
        requestedContext: "TEACHER",
        limit: 25,
        cursor: 5,
        sort: "title",
        filters: expect.objectContaining({
          level: "B1",
          category: "business",
          types: ["COURSE", "LESSON"],
        }),
      }),
    );
    expect(mockedRecordSearchQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        query: "english",
        context: "TEACHER",
        resultCount: 0,
      }),
    );
  });
});
