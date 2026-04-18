import path from "node:path";
import { defineConfig } from "@playwright/test";

const businessDir = __dirname;
const customerDir = path.resolve(__dirname, "../customer");

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3001",
    browserName: "chromium",
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    testIdAttribute: "data-testid",
  },
  webServer: [
    {
      command: "npx next dev --turbopack --hostname 127.0.0.1 --port 3001",
      cwd: businessDir,
      url: "http://127.0.0.1:3001/login",
      timeout: 180_000,
      reuseExistingServer: true,
    },
    {
      command: "npx next dev --hostname 127.0.0.1 --port 3000",
      cwd: customerDir,
      url: "http://127.0.0.1:3000/",
      timeout: 180_000,
      reuseExistingServer: true,
    },
  ],
});
