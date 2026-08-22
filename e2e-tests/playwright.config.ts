import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 120_000, // 2 min per test (LLM calls are slow)
  retries: 1,
  workers: 1, // Sequential — shared auth state
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "https://frontend-red-one-81.vercel.app",
    headless: true,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    viewport: { width: 1280, height: 900 },
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
