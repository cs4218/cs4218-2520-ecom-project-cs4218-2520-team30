import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard Flow', () => {

  test.beforeEach(async ({ page }) => {
    // 1. Navigate to login
    await page.goto('/login');

    // 2. Fill login form
    await page.fill('input[placeholder="Enter Your Email "]', 'playwright-admin@test.com');
    await page.fill('input[placeholder="Enter Your Password"]', 'adminpassword123');

    // 3. Click Login
    await page.click('button:has-text("LOGIN")');

    // 4. Wait for redirect to home
    await expect(page).toHaveURL('/');
    
    // Wait for the auth context to settle
    await page.waitForTimeout(1000); 
  });

  test('Admin can log in and view profile information on dashboard', async ({ page }) => {
    await page.goto('/dashboard/admin');
    await expect(page).toHaveURL('/dashboard/admin');

    await expect(page.locator('h3', { hasText: 'Admin Name : Playwright Admin' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Admin Email : playwright-admin@test.com' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Admin Contact : 1234567890' })).toBeVisible();
  });
});
