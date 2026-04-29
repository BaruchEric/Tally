import { expect, test } from "@playwright/test";

test("demo ledger renders and opens balances", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Ledgers" })).toBeVisible();
  await page.getByRole("link", { name: /Tokyo Apartment/i }).click();
  await expect(page.getByRole("heading", { name: "Tokyo Apartment" })).toBeVisible();
  await page.getByRole("link", { name: "Balances" }).click();
  await expect(page.getByRole("heading", { name: "Balances" })).toBeVisible();
});
