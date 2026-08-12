jest.mock("@/core/server/platform-owner-guard", () => ({
  requirePlatformOwner: jest.fn(),
}));

jest.mock("@/modules/search/services/search-analytics.service", () => ({
  getSearchAnalyticsSummary: jest.fn(),
}));

import { NextRequest } from "next/server";
import { GET } from "@/app/api/admin/analytics/search/route";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { getSearchAnalyticsSummary } from "@/modules/search/services/search-analytics.service";

const mockedGuard = jest.mocked(requirePlatformOwner);
const mockedSummary = jest.mocked(getSearchAnalyticsSummary);

describe("api admin search analytics route", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockedSummary.mockResolvedValue({
      periodDays: 30,
      totals: {
        totalSearches: 0,
        totalClicks: 0,
        noResultSearches: 0,
        clickThroughRate: 0,
        noResultRate: 0,
      },
      byContext: [],
      daily: [],
      topQueries: [],
    });
  });

  it("returns access error for a non-owner", async () => {
    mockedGuard.mockResolvedValue({
      ok: false,
      status: 403,
      error: "Forbidden",
    } as never);

    const request = new NextRequest(
      "http://localhost:3000/api/admin/analytics/search",
    );
    const response = await GET(request);

    expect(response.status).toBe(403);
    expect(mockedSummary).not.toHaveBeenCalled();
  });

  it("returns search analytics summary", async () => {
    mockedGuard.mockResolvedValue({
      ok: true,
      user: { id: "owner-1" },
      role: "student",
    } as never);

    const request = new NextRequest(
      "http://localhost:3000/api/admin/analytics/search?days=14&context=TEACHER",
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockedSummary).toHaveBeenCalledWith({
      days: 14,
      context: "TEACHER",
    });
  });
});
