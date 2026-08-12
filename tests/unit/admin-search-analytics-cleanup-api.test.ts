jest.mock("@/core/server/platform-owner-guard", () => ({
  requirePlatformOwner: jest.fn(),
}));

jest.mock("@/modules/search/services/search-analytics.service", () => ({
  cleanupSearchHistory: jest.fn(),
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/admin/analytics/search/cleanup/route";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { cleanupSearchHistory } from "@/modules/search/services/search-analytics.service";

const mockedGuard = jest.mocked(requirePlatformOwner);
const mockedCleanup = jest.mocked(cleanupSearchHistory);

describe("api admin search analytics cleanup route", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockedCleanup.mockResolvedValue({
      retentionDays: 180,
      dryRun: true,
      deletedHistoryRows: 0,
      deletedMetricRows: 0,
    });
  });

  it("returns 403 when guard fails", async () => {
    mockedGuard.mockResolvedValue({
      ok: false,
      status: 403,
      error: "Forbidden",
    } as never);

    const response = await POST(
      new NextRequest(
        "http://localhost:3000/api/admin/analytics/search/cleanup",
        { method: "POST", body: "{}" },
      ),
    );

    expect(response.status).toBe(403);
    expect(mockedCleanup).not.toHaveBeenCalled();
  });

  it("validates payload", async () => {
    mockedGuard.mockResolvedValue({
      ok: true,
      user: { id: "owner-1" },
      role: "student",
    } as never);

    const response = await POST(
      new NextRequest(
        "http://localhost:3000/api/admin/analytics/search/cleanup",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ retentionDays: 1 }),
        },
      ),
    );

    expect(response.status).toBe(400);
    expect(mockedCleanup).not.toHaveBeenCalled();
  });

  it("runs cleanup", async () => {
    mockedGuard.mockResolvedValue({
      ok: true,
      user: { id: "owner-1" },
      role: "student",
    } as never);

    const response = await POST(
      new NextRequest(
        "http://localhost:3000/api/admin/analytics/search/cleanup",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ retentionDays: 365, dryRun: true }),
        },
      ),
    );

    expect(response.status).toBe(200);
    expect(mockedCleanup).toHaveBeenCalledWith({
      retentionDays: 365,
      dryRun: true,
    });
  });
});
