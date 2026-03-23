/**
 * Black-box E2E: shared layout, header/footer navigation, 404, and recovery to home.
 */

import { test, expect } from "@playwright/test";

test("Layout navigation: header to cart, footer to about, invalid URL 404, go back home", async ({
  page,
}) => {
  // Lum Yi Ren Johannsen, A0273503L

  // ARRANGE
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("link", { name: /Virtual Vault/i })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole("navigation")).toBeVisible();
  const footer = page.locator(".footer");
  await expect(footer).toBeVisible();
  await expect(footer.getByRole("link", { name: "About" })).toBeVisible();
  await expect(footer.getByRole("link", { name: "Contact" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "All Products" })).toBeVisible();

  // ACT 1 — Header: navigate to Cart
  await page.getByRole("link", { name: "Cart", exact: true }).click();

  // ASSERT 1
  await expect(page).toHaveURL(/\/cart\/?$/);
  await expect(async () => {
    await expect(page.getByText(/Your Cart Is Empty|items in your cart/i)).toBeVisible();
  }).toPass({ timeout: 15_000 });

  // ACT 2 — Footer: navigate to About
  await footer.getByRole("link", { name: "About" }).click();

  // ASSERT 2
  await expect(page).toHaveURL(/\/about\/?$/);
  await expect(async () => {
    await expect(page.getByText("Add text")).toBeVisible();
  }).toPass({ timeout: 15_000 });

  // ACT 3 — Invalid route → 404
  await page.goto("/this-page-does-not-exist");
  await page.waitForLoadState("domcontentloaded");

  // ASSERT 3 — Pagenotfound (client/src/pages/Pagenotfound.js)
  await expect(async () => {
    await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Oops ! Page Not Found/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "Go Back" })).toBeVisible();
  }).toPass({ timeout: 15_000 });

  // ACT 4 — Recovery via Go Back
  await page.getByRole("link", { name: "Go Back" }).click();

  // ASSERT 4
  await expect(page).toHaveURL(/\/\/?$/);
  await expect(async () => {
    await expect(page.getByRole("heading", { name: "All Products" })).toBeVisible();
  }).toPass({ timeout: 15_000 });
});
