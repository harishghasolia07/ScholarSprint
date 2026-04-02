import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001";
const webServerCommand = process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ?? "npm run dev -- --port 3001";

export default defineConfig({
    testDir: "./e2e",
    timeout: 30_000,
    expect: {
        timeout: 5_000,
    },
    fullyParallel: true,
    reporter: "list",
    use: {
        baseURL,
        trace: "on-first-retry",
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
    webServer: {
        command: webServerCommand,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
    },
});
