// Alek Kwek, A0273471A
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { expect } from "@playwright/test";
import { MongoClient } from "mongodb";
import { fileURLToPath } from "url";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

export const ADMIN_EMAIL = "playwright-admin@test.com";
export const ADMIN_PASSWORD = "adminpassword123";
export const PLAYWRIGHT_PREFIX = "__playwright__";

const DEFAULT_MONGO_URL = "mongodb://127.0.0.1:27017/test";
const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9p0N8iAAAAAASUVORK5CYII=";
const PLAYWRIGHT_NAME_REGEX = new RegExp(`^${PLAYWRIGHT_PREFIX}`);

function getMongoConfig() {
  const mongoUrl = process.env.MONGO_URL || DEFAULT_MONGO_URL;

  try {
    const parsedUrl = new URL(mongoUrl);
    const dbName = parsedUrl.pathname.replace(/^\//, "") || "test";
    return { mongoUrl, dbName };
  } catch (error) {
    return { mongoUrl, dbName: "test" };
  }
}

export async function resetAdminTestData() {
  const { mongoUrl, dbName } = getMongoConfig();
  const client = new MongoClient(mongoUrl);
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

  await client.connect();

  try {
    const db = client.db(dbName);

    await clearPlaywrightTestData(db);

    await db.collection("users").insertOne({
      name: "Playwright Admin",
      email: ADMIN_EMAIL,
      password: hashedPassword,
      phone: "1234567890",
      address: "Test Address",
      answer: "Test Answer",
      role: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } finally {
    await client.close();
  }
}

export async function clearAdminTestData() {
  const { mongoUrl, dbName } = getMongoConfig();
  const client = new MongoClient(mongoUrl);

  await client.connect();

  try {
    await clearPlaywrightTestData(client.db(dbName));
  } finally {
    await client.close();
  }
}

async function clearPlaywrightTestData(db) {
  await Promise.all([
    db.collection("categories").deleteMany({ name: PLAYWRIGHT_NAME_REGEX }),
    db.collection("products").deleteMany({ name: PLAYWRIGHT_NAME_REGEX }),
    db.collection("users").deleteMany({ email: ADMIN_EMAIL }),
  ]);
}

export async function loginAsAdmin(page) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /login form/i })).toBeVisible();

  await page
    .getByPlaceholder("Enter Your Email ")
    .fill(ADMIN_EMAIL);
  await page.getByPlaceholder("Enter Your Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "LOGIN" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByText("Playwright Admin")).toBeVisible();
}

export async function createCategory(page, categoryName) {
  await page.goto("/dashboard/admin/create-category");
  await expect(
    page.getByRole("heading", { name: /manage category/i })
  ).toBeVisible();

  await page.getByPlaceholder("Enter new category").fill(categoryName);
  await page.getByRole("button", { name: "Submit" }).first().click();

  const createdRow = page.locator("tbody tr").filter({ hasText: categoryName });
  await expect(createdRow).toHaveCount(1);
}

export async function createProduct(page, productDetails) {
  const {
    categoryName,
    name,
    description,
    price,
    quantity,
    shippingLabel = "Yes",
    imageName = "product.png",
  } = productDetails;

  await page.getByRole("link", { name: "Create Product" }).click();
  await expect(page).toHaveURL("/dashboard/admin/create-product");
  await expect(
    page.getByRole("heading", { name: /create product/i })
  ).toBeVisible();

  await page.locator('input[placeholder="write a name"]').fill(name);
  await page
    .locator('textarea[placeholder="write a description"]')
    .fill(description);
  await page.locator('input[placeholder="write a Price"]').fill(String(price));
  await page
    .locator('input[placeholder="write a quantity"]')
    .fill(String(quantity));

  await page.locator(".ant-select-selector").first().click();
  await page
    .locator(".ant-select-item-option-content", { hasText: categoryName })
    .click();

  await page.locator(".ant-select-selector").nth(1).click();
  await page
    .locator(".ant-select-item-option-content", { hasText: shippingLabel })
    .click();

  await page.setInputFiles('input[name="photo"]', {
    name: imageName,
    mimeType: "image/png",
    buffer: Buffer.from(PNG_BASE64, "base64"),
  });

  await page.getByRole("button", { name: /create product/i }).click();

  await expect(page).toHaveURL("/dashboard/admin/products");
  await expect(page.getByRole("heading", { name: /all products list/i })).toBeVisible();
}
