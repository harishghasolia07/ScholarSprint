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

  await expect(page.locator("#login-error")).toHaveText("Account not found. Please register first.");
});

test("demo admin can login and open dashboard", async ({ page }) => {
  await page.goto("/login");

  await page.getByRole("button", { name: "Demo Login as Admin" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText("admin workspace")).toBeVisible();
});

test("register shows API validation for invalid email", async ({ page }) => {
  await page.goto("/register");

  await page.getByPlaceholder("Full name").fill("Test User");
  await page.getByPlaceholder("Email").fill("invalid@domain.c");
  await page.getByPlaceholder("Password").fill("SecurePass@123");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.locator("#register-error")).toHaveText("Invalid registration payload.");
});
