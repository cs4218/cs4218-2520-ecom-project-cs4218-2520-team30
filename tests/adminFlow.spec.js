import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard Flow', () => {
  async function loginAsAdmin(page) {
    await page.goto('/login');
    await page.fill('input[placeholder="Enter Your Email "]', 'playwright-admin@test.com');
    await page.fill('input[placeholder="Enter Your Password"]', 'adminpassword123');
    await page.click('button:has-text("LOGIN")');
    await expect(page).toHaveURL('/');
    await page.waitForTimeout(1000);
  }

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Admin can log in and view profile information on dashboard', async ({ page }) => {
    await page.goto('/dashboard/admin');
    await expect(page).toHaveURL('/dashboard/admin');

    await expect(page.locator('h3', { hasText: 'Admin Name : Playwright Admin' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Admin Email : playwright-admin@test.com' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Admin Contact : 1234567890' })).toBeVisible();
  });

  test('Admin dashboard profile information persists after refresh', async ({ page }) => {
    await page.goto('/dashboard/admin');
    await expect(page).toHaveURL('/dashboard/admin');

    await page.reload();

    await expect(page.locator('h3', { hasText: 'Admin Name : Playwright Admin' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Admin Email : playwright-admin@test.com' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Admin Contact : 1234567890' })).toBeVisible();
  });

  test('Invalid admin login does not reach the dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[placeholder="Enter Your Email "]', 'playwright-admin@test.com');
    await page.fill('input[placeholder="Enter Your Password"]', 'wrongpassword');
    await page.click('button:has-text("LOGIN")');

    await expect(page).not.toHaveURL('/');
    await expect(page).not.toHaveURL('/dashboard/admin');
    await expect(page.getByRole('button', { name: 'LOGIN' })).toBeVisible();
  });

  test('Unauthenticated user cannot directly access admin dashboard', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('/dashboard/admin');
    await expect(page).not.toHaveURL('/dashboard/admin');

    await context.close();
  });

  test('Admin logout clears session and blocks dashboard access', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'PLAYWRIGHT ADMIN' }).click();
    await page.getByRole('link', { name: 'Logout' }).click();

    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('button', { name: 'LOGIN' })).toBeVisible();

    await page.goto('/dashboard/admin');
    await expect(page).not.toHaveURL('/dashboard/admin');
  });

  test('Admin remains able to access dashboard after revisiting login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: 'LOGIN' })).toBeVisible();

    await page.goto('/dashboard/admin');
    await expect(page).toHaveURL('/dashboard/admin');

    await expect(page.locator('h3', { hasText: 'Admin Name : Playwright Admin' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Admin Email : playwright-admin@test.com' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Admin Contact : 1234567890' })).toBeVisible();
  });
});
