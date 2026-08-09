jest.mock("@/core/server/session", () => ({
  requireAuth: jest.fn(),
}));

jest.mock("@/modules/search/services/search-analytics.service", () => ({
  listUserSearchHistory: jest.fn(),
}));

import { NextRequest } from "next/server";
import { GET } from "@/app/api/profile/search/history/route";
import { requireAuth } from "@/core/server/session";
import { listUserSearchHistory } from "@/modules/search/services/search-analytics.service";

const mockedRequireAuth = jest.mocked(requireAuth);
const mockedList = jest.mocked(listUserSearchHistory);

describe("api profile search history route", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockedList.mockResolvedValue({ items: [], total: 0, cursor: 0, nextCursor: null });
  });

  it("returns 401 for unauthenticated user", async () => {
    mockedRequireAuth.mockResolvedValue(null as never);

    const request = new NextRequest("http://localhost:3000/api/profile/search/history");
    const response = await GET(request);

    expect(response.status).toBe(401);
    expect(mockedList).not.toHaveBeenCalled();
  });

  it("returns paginated user history", async () => {
    mockedRequireAuth.mockResolvedValue({ user: { id: "u1" } } as never);

    const request = new NextRequest("http://localhost:3000/api/profile/search/history?cursor=5&limit=10&context=STUDENT&eventType=CLICK");
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockedList).toHaveBeenCalledWith(expect.objectContaining({
      userId: "u1",
      cursor: 5,
      limit: 10,
      context: "STUDENT",
      eventType: "CLICK",
    }));
  });
});
