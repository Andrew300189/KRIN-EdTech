import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

describe("Auth.js callback proxy bypass", () => {
  it.each([
    "/api/auth/callback/google?code=test-code&state=test-state",
    "/api/auth/signin/google",
    "/api/auth/session",
    "/api/auth/google/start",
  ])("does not run CMS or session guards for %s", async (path) => {
    const response = await proxy(new NextRequest(`http://localhost:3000${path}`));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
