import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e-demo",
  fullyParallel: true,
  workers: 2,
  timeout: 30000,
  use: {
    baseURL: "http://127.0.0.1:5175/trainingmanagement/",
    browserName: "chromium",
    launchOptions: process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {},
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run preview -- --mode demo --port 5175 --strictPort",
    url: "http://127.0.0.1:5175/trainingmanagement/",
    reuseExistingServer: false,
  },
});
