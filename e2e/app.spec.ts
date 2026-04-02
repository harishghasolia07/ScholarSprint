import { expect, test } from "@playwright/test";

test("landing page renders and links to auth flow", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "EdTech Assignment Tracker" })).toBeVisible();
  await page.getByRole("link", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/login/);
});

test("shows account not found for unknown login", async ({ page }) => {
  await page.goto("/login");

  await page.getByPlaceholder("Email").fill("unknown.user@example.com");
  await page.getByPlaceholder("Password").fill("SomePassword@123");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByText("Account not found. Please register first.")).toBeVisible();
});

test("demo admin can login and open dashboard", async ({ page }) => {
  await page.goto("/login");

  await page.getByRole("button", { name: "Create/Refresh demo users" }).click();
  await page.getByRole("button", { name: "Login as Admin" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText("ADMIN WORKSPACE")).toBeVisible();
});
