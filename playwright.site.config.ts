import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/site",
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:4174",
    ...devices["Desktop Chrome"],
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node_modules/.bin/vite --config vite.site.config.ts --host 127.0.0.1 --port 4174",
    url: "http://127.0.0.1:4174/feishu-card-renderer/",
    reuseExistingServer: false,
  },
});
