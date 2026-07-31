import { defineConfig } from "playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm.cmd run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
