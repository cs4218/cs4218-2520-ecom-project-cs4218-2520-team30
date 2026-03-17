import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard Flow', () => {
  test('Admin can log in and view profile information on dashboard', async ({ page }) => {
    // 1. Navigate to login
    await page.goto('/login');

    // 2. Fill login form
    await page.fill('input[placeholder="Enter Your Email "]', 'playwright-admin@test.com');
    await page.fill('input[placeholder="Enter Your Password"]', 'adminpassword123');

    // 3. Click Login
    await page.click('button:has-text("LOGIN")');

    // 4. Wait for redirect to home or toast success
    await expect(page).toHaveURL('/');
    // Wait for the auth context to update and redirect (usually goes back to state or '/' based on logic)
    await page.waitForTimeout(1000);

    // 5. Navigate explicitly to Admin Dashboard
    await page.goto('/dashboard/admin');
    await expect(page).toHaveURL('/dashboard/admin');

    // 6. Verify Admin Information is visible on the dashboard
    await expect(page.locator('h3', { hasText: 'Admin Name : Playwright Admin' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Admin Email : playwright-admin@test.com' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Admin Contact : 1234567890' })).toBeVisible();

  });

test('Admin can create, view, update and delete a category', async ({ page }) => {
    // 1. Navigate to login
    await page.goto('/login');

    // 2. Fill login form
    await page.fill('input[placeholder="Enter Your Email "]', 'playwright-admin@test.com');
    await page.fill('input[placeholder="Enter Your Password"]', 'adminpassword123');

    // 3. Click Login
    await page.click('button:has-text("LOGIN")');

    // 4. Wait for redirect to home
    await expect(page).toHaveURL('/');
    await page.waitForTimeout(1000); 

    // 2. Go to Category Route
    await page.getByRole('button', { name: 'PLAYWRIGHT ADMIN' }).click();
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await page.getByRole('link', { name: 'Create Category' }).click();

    // 3. Create a Category
    const categoryName = `Test Category ${Date.now()}`;
    await page.getByPlaceholder('Enter new category').fill(categoryName);
    await page.getByRole('button', { name: 'Submit' }).click();

    // 4. Verify it was created and is visible
    await expect(page.locator(`td:has-text("${categoryName}")`)).toBeVisible();

    // 5. Edit the Category
    const updatedCategoryName = `${categoryName} Updated`;
    // Find the row containing our category, and click the Edit button inside that row
    const row = page.locator('tr', { hasText: categoryName });
    await row.getByRole('button', { name: 'Edit' }).click();
    
    // The edit modal might pop up, depending on the implementation
    // Assuming the modal input has a placeholder 'Enter new category' or similar, we update it
    await page.getByRole('dialog').getByPlaceholder('Enter new category').fill(updatedCategoryName);
    await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click();

    // 6. Verify it was updated
    await expect(page.locator(`td:has-text("${updatedCategoryName}")`)).toBeVisible();

    // 7. Delete the Category
    const newRow = page.locator('tr', { hasText: updatedCategoryName });
    await newRow.getByRole('button', { name: 'Delete' }).click();

    // 8. Verify it was deleted
    // Wait a brief moment for the DOM to update after deletion
    await page.waitForTimeout(1000); 
    await expect(page.locator(`td:has-text("${updatedCategoryName}")`)).not.toBeVisible();
  });
});
