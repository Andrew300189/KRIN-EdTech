import { logAuthDiagnostic } from "@/core/server/auth-diagnostics";

describe("auth diagnostics", () => {
  const originalEnvironment = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnvironment;
    jest.restoreAllMocks();
  });

  it("logs only the allowlisted event payload in development", () => {
    process.env.NODE_ENV = "development";
    const info = jest.spyOn(console, "info").mockImplementation();

    logAuthDiagnostic({ event: "auth_provider", provider: "google" });

    expect(info).toHaveBeenCalledWith(
      "[auth-diagnostic]",
      JSON.stringify({ event: "auth_provider", provider: "google" }),
    );
  });

  it("does not emit authentication diagnostics in production", () => {
    process.env.NODE_ENV = "production";
    const info = jest.spyOn(console, "info").mockImplementation();

    logAuthDiagnostic({ event: "cms_guard_result", result: "forbidden" });

    expect(info).not.toHaveBeenCalled();
  });

  it("removes query and hash values from post-auth destination diagnostics", () => {
    process.env.NODE_ENV = "development";
    const info = jest.spyOn(console, "info").mockImplementation();

    logAuthDiagnostic({
      event: "post_auth_destination",
      destination: "/student?access_token=never-log-this#fragment",
    });

    expect(info).toHaveBeenCalledWith(
      "[auth-diagnostic]",
      JSON.stringify({ event: "post_auth_destination", destination: "/student" }),
    );
  });
});
