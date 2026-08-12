jest.mock("@/core/server/platform-owner-guard", () => ({
  requirePlatformOwner: jest.fn(),
}));

jest.mock("@/modules/search/services/search-analytics.service", () => ({
  getSearchAnalyticsExport: jest.fn(),
}));

import { NextRequest } from "next/server";
import { GET } from "@/app/api/admin/analytics/search/export/route";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { getSearchAnalyticsExport } from "@/modules/search/services/search-analytics.service";

const mockedGuard = jest.mocked(requirePlatformOwner);
const mockedExport = jest.mocked(getSearchAnalyticsExport);

describe("api admin search analytics export route", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockedExport.mockResolvedValue({
      generatedAt: "2026-08-01T00:00:00.000Z",
      periodDays: 30,
      totals: {
        totalSearches: 10,
        totalClicks: 4,
        noResultSearches: 2,
        clickThroughRate: 40,
        noResultRate: 20,
      },
      byContext: [
        {
          context: "PUBLIC",
          totalSearches: 7,
          totalClicks: 3,
          noResultSearches: 1,
          clickThroughRate: 42.9,
          noResultRate: 14.3,
        },
      ],
      daily: [
        {
          day: new Date("2026-08-01T00:00:00.000Z"),
          totalSearches: 10,
          totalClicks: 4,
          noResultSearches: 2,
        },
      ],
      topQueries: [
        {
          queryHash: "abc",
          query: "english",
          searches: 5,
          clicks: 2,
          noResults: 1,
          sampleCount: 4,
        },
      ],
    });
  });

  it("returns 403 when guard fails", async () => {
    mockedGuard.mockResolvedValue({
      ok: false,
      status: 403,
      error: "Forbidden",
    } as never);

    const response = await GET(
      new NextRequest(
        "http://localhost:3000/api/admin/analytics/search/export",
      ),
    );

    expect(response.status).toBe(403);
    expect(mockedExport).not.toHaveBeenCalled();
  });

  it("returns csv payload", async () => {
    mockedGuard.mockResolvedValue({
      ok: true,
      user: { id: "owner-1" },
      role: "student",
    } as never);

    const response = await GET(
      new NextRequest(
        "http://localhost:3000/api/admin/analytics/search/export?days=14&context=PUBLIC",
      ),
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/text\/csv/);
    expect(mockedExport).toHaveBeenCalledWith({ days: 14, context: "PUBLIC" });
    expect(body).toContain("section,context,day,queryHash");
    expect(body).toContain("top_query");
  });
});
