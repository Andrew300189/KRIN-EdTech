jest.mock("@/core/server/auth", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/core/server/rate-limit", () => ({
  consumeRateLimit: jest.fn(),
}));

jest.mock("@/modules/search/services/search-analytics.service", () => ({
  recordSearchResultClick: jest.fn(),
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/search/click/route";
import { getCurrentUser } from "@/core/server/auth";
import { consumeRateLimit } from "@/core/server/rate-limit";
import { recordSearchResultClick } from "@/modules/search/services/search-analytics.service";

const mockedUser = jest.mocked(getCurrentUser);
const mockedRate = jest.mocked(consumeRateLimit);
const mockedRecordClick = jest.mocked(recordSearchResultClick);

describe("api search click route", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockedUser.mockResolvedValue(null as never);
    mockedRate.mockReturnValue({ allowed: true, retryAfterSeconds: 0 });
    mockedRecordClick.mockResolvedValue(undefined);
  });

  it("returns 429 when rate limit is exceeded", async () => {
    mockedRate.mockReturnValue({ allowed: false, retryAfterSeconds: 9 });

    const request = new NextRequest("http://localhost:3000/api/search/click", {
      method: "POST",
      body: JSON.stringify({
        query: "english",
        context: "PUBLIC",
        resultType: "COURSE",
        resultId: "c1",
        resultUrl: "/courses/demo",
        position: 0,
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);

    expect(response.status).toBe(429);
    expect(mockedRecordClick).not.toHaveBeenCalled();
  });

  it("validates payload", async () => {
    const request = new NextRequest("http://localhost:3000/api/search/click", {
      method: "POST",
      body: JSON.stringify({ query: "", context: "PUBLIC" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(mockedRecordClick).not.toHaveBeenCalled();
  });

  it("persists click event", async () => {
    mockedUser.mockResolvedValue({
      id: "u1",
      interfaceLanguage: "en",
    } as never);

    const request = new NextRequest("http://localhost:3000/api/search/click", {
      method: "POST",
      body: JSON.stringify({
        query: " english ",
        context: "TEACHER",
        resultType: "ASSIGNMENT",
        resultId: "a1",
        resultUrl: "/teacher/assignments",
        position: 4,
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);

    expect(response.status).toBe(204);
    expect(mockedRecordClick).toHaveBeenCalledWith(
      expect.objectContaining({
        query: "english",
        context: "TEACHER",
        resultType: "ASSIGNMENT",
        resultId: "a1",
        resultUrl: "/teacher/assignments",
        position: 4,
        userId: "u1",
        locale: "en",
      }),
    );
  });
});
