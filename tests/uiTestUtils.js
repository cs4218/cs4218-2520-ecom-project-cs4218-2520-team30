// Alek Kwek, A0273471A
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { expect } from "@playwright/test";

import categoryModel from "../models/categoryModel.js";
import productModel from "../models/productModel.js";
import userModel from "../models/userModel.js";
import orderModel from "../models/orderModel.js";
import {
  PLAYWRIGHT_ADMIN_ADDRESS,
  PLAYWRIGHT_ADMIN_ANSWER,
  PLAYWRIGHT_ADMIN_EMAIL,
  PLAYWRIGHT_ADMIN_NAME,
  PLAYWRIGHT_ADMIN_PASSWORD,
  PLAYWRIGHT_ADMIN_PHONE,
  PLAYWRIGHT_DB_NAME,
  PLAYWRIGHT_PREFIX as BASE_PLAYWRIGHT_PREFIX,
  getBaseMongoUri,
  getPlaywrightMongoUri,
} from "./playwrightDb.js";

// Re-export constants for tests
export {
  PLAYWRIGHT_ADMIN_ADDRESS,
  PLAYWRIGHT_ADMIN_ANSWER,
  PLAYWRIGHT_ADMIN_EMAIL,
  PLAYWRIGHT_ADMIN_NAME,
  PLAYWRIGHT_ADMIN_PASSWORD,
  PLAYWRIGHT_ADMIN_PHONE,
  PLAYWRIGHT_DB_NAME,
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parallel worker support
const WORKER_ID = process.env.TEST_WORKER_INDEX || "0";
export const PLAYWRIGHT_PREFIX = `${BASE_PLAYWRIGHT_PREFIX}_w${WORKER_ID}__`;
const prefixRegex = new RegExp(`^${BASE_PLAYWRIGHT_PREFIX}`, "i");

export const PLAYWRIGHT_USER_EMAIL = "playwright-user@test.com";
export const PLAYWRIGHT_USER_PASSWORD = "userpassword123";

const PLAYWRIGHT_SEED_CATEGORY_SLUG = "playwright-seeded-category";
const PLAYWRIGHT_SEED_ALT_CATEGORY_SLUG = "playwright-alt-category";

// Admin Orders Specific Constants (from HEAD)
export const PLAYWRIGHT_BUYER_NAME = "__playwright__ Buyer";
export const PLAYWRIGHT_ORDER_PRODUCT_NAMES = [
  "__playwright__ Admin Orders Keyboard",
  "__playwright__ Admin Orders Mouse",
];
export const PLAYWRIGHT_ORDER_STATUSES = ["Not Process", "Processing"];

const PLAYWRIGHT_CATEGORY_ID = new mongoose.Types.ObjectId("65f000000000000000000001");
const PLAYWRIGHT_PRODUCT_IDS = [
  new mongoose.Types.ObjectId("65f000000000000000000011"),
  new mongoose.Types.ObjectId("65f000000000000000000012"),
];
const PLAYWRIGHT_ORDER_IDS = [
  new mongoose.Types.ObjectId("65f000000000000000000031"),
  new mongoose.Types.ObjectId("65f000000000000000000032"),
];

const PLAYWRIGHT_SEED_PRODUCTS = [
  {
    slug: "playwright-alpha-product",
    name: "Playwright Alpha Product",
    description: "A seeded Playwright alpha catalog item for search and cart flows.",
    price: 19,
    quantity: 12,
    shipping: true,
    categorySlug: PLAYWRIGHT_SEED_CATEGORY_SLUG
  },
  {
    slug: "playwright-beta-product",
    name: "Playwright Beta Product",
    description: "A seeded Playwright beta catalog item for multi-result search coverage.",
    price: 29,
    quantity: 8,
    shipping: false,
    categorySlug: PLAYWRIGHT_SEED_CATEGORY_SLUG
  },
  {
    slug: "playwright-gamma-product",
    name: "Playwright Gamma Product",
    description: "A seeded Playwright high-price item for filtering tests.",
    price: 150,
    quantity: 5,
    shipping: true,
    categorySlug: PLAYWRIGHT_SEED_ALT_CATEGORY_SLUG
  },
  {
    slug: "nus-t-shirt",
    name: "NUS T-shirt",
    description: "Plain NUS T-shirt for sale",
    price: 20,
    quantity: 10,
    shipping: true,
    categorySlug: PLAYWRIGHT_SEED_CATEGORY_SLUG
  },
  {
    slug: "playwright-delta-product",
    name: "Playwright Delta Product",
    description: "A seeded Playwright delta item for load-more coverage.",
    price: 39,
    quantity: 6,
    shipping: true,
    categorySlug: PLAYWRIGHT_SEED_CATEGORY_SLUG
  },
  {
    slug: "playwright-epsilon-product",
    name: "Playwright Epsilon Product",
    description: "A seeded Playwright epsilon item for load-more coverage.",
    price: 49,
    quantity: 4,
    shipping: false,
    categorySlug: PLAYWRIGHT_SEED_CATEGORY_SLUG
  },
  {
    slug: "playwright-zeta-product",
    name: "Playwright Zeta Product",
    description: "A seeded Playwright zeta item for load-more coverage.",
    price: 59,
    quantity: 3,
    shipping: true,
    categorySlug: PLAYWRIGHT_SEED_CATEGORY_SLUG
  },
];

export function getPlaywrightMongoUrl() {
  return getPlaywrightMongoUri();
}

/**
 * Shared logic for DB connections.
 */
export async function withPlaywrightConnection(work) {
  const uri = getPlaywrightMongoUri();
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(uri);
  try {
    return await work(mongoose.connection.db);
  } finally {
    await mongoose.disconnect();
  }
}

export const withPlaywrightDb = withPlaywrightConnection;

export async function seedPlaywrightAdmin() {
  return withPlaywrightConnection(async () => {
    // Standard admin
    const hashedStandardPassword = await bcrypt.hash(PLAYWRIGHT_ADMIN_PASSWORD, 10);
    await userModel.findOneAndUpdate(
      { email: PLAYWRIGHT_ADMIN_EMAIL },
      {
        name: PLAYWRIGHT_ADMIN_NAME,
        email: PLAYWRIGHT_ADMIN_EMAIL,
        password: hashedStandardPassword,
        phone: PLAYWRIGHT_ADMIN_PHONE,
        address: PLAYWRIGHT_ADMIN_ADDRESS,
        answer: PLAYWRIGHT_ADMIN_ANSWER,
        role: 1,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Legacy admin
    const hashedLegacyPassword = await bcrypt.hash("admin@test.sg", 10);
    await userModel.findOneAndUpdate(
      { email: "admin@test.sg" },
      {
        name: "admin@test.sg",
        email: "admin@test.sg",
        password: hashedLegacyPassword,
        phone: "admin@test.sg",
        address: "admin@test.sg",
        answer: "Admin Answer",
        role: 1,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  });
}

export async function ensurePlaywrightAdmin() {
  return seedPlaywrightAdmin();
}

/**
 * Cleanup targets used by teardown.
 */
export const cleanupTargetsInDatabase = async (label, targets) => {
  return withPlaywrightConnection(async (db) => {
    for (const target of targets) {
      const result = await db.collection(target.collection).deleteMany(target.filter);
      console.log(`[Playwright cleanup:${label}] deleted ${result.deletedCount} from ${target.collection}`);
    }
  });
};

export async function cleanupPlaywrightData({ includeAdmin = false } = {}) {
  return withPlaywrightConnection(async () => {
    await productModel.deleteMany({ name: prefixRegex });
    await categoryModel.deleteMany({ name: prefixRegex });
    
    // Also cleanup based on specific IDs if any
    await orderModel.deleteMany({ _id: { $in: PLAYWRIGHT_ORDER_IDS } });
    await productModel.deleteMany({ _id: { $in: PLAYWRIGHT_PRODUCT_IDS } });
    await categoryModel.deleteMany({ _id: PLAYWRIGHT_CATEGORY_ID });

    if (includeAdmin) {
      await userModel.deleteMany({
        email: { $in: [PLAYWRIGHT_ADMIN_EMAIL, "admin@test.sg", PLAYWRIGHT_USER_EMAIL, "playwright-buyer@test.com"] },
      });
    }
  });
}

export const cleanupPlaywrightArtifacts = cleanupPlaywrightData;

export async function ensurePlaywrightCatalog() {
  return withPlaywrightConnection(async () => {
    const fixturePath = getProductFixturePath();
    const photoData = fs.readFileSync(fixturePath);
    const now = new Date();

    // Default category
    await categoryModel.findOneAndUpdate(
      { slug: PLAYWRIGHT_SEED_CATEGORY_SLUG },
      { name: "Playwright Seeded Category", slug: PLAYWRIGHT_SEED_CATEGORY_SLUG },
      { upsert: true, new: true }
    );
    
    // Alt category
    await categoryModel.findOneAndUpdate(
      { slug: PLAYWRIGHT_SEED_ALT_CATEGORY_SLUG },
      { name: "Playwright Alt Category", slug: PLAYWRIGHT_SEED_ALT_CATEGORY_SLUG },
      { upsert: true, new: true }
    );

    const categories = await categoryModel.find({ 
      slug: { $in: [PLAYWRIGHT_SEED_CATEGORY_SLUG, PLAYWRIGHT_SEED_ALT_CATEGORY_SLUG] } 
    }).lean();
    
    const catMap = categories.reduce((acc, c) => {
      acc[c.slug] = c._id;
      return acc;
    }, {});

    for (const product of PLAYWRIGHT_SEED_PRODUCTS) {
      await productModel.findOneAndUpdate(
        { slug: product.slug },
        {
          name: product.name,
          slug: product.slug,
          description: product.description,
          price: product.price,
          category: catMap[product.categorySlug],
          quantity: product.quantity,
          shipping: product.shipping,
          photo: { data: photoData, contentType: "image/svg+xml" },
          updatedAt: now,
        },
        { upsert: true }
      );
    }
  });
}

export const makePlaywrightName = (label) =>
  `${PLAYWRIGHT_PREFIX} ${label} ${Date.now()} ${Math.floor(Math.random() * 1000)}`;

export const getProductFixturePath = () =>
  path.join(__dirname, "fixtures", "playwright-product.svg");

export async function loginAsPlaywrightAdmin(page) {
  await page.goto("/login");
  await page.getByPlaceholder("Enter Your Email ").fill(PLAYWRIGHT_ADMIN_EMAIL);
  await page.getByPlaceholder("Enter Your Password").fill(PLAYWRIGHT_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "LOGIN" }).click();
  await page.waitForURL("**/");
  const authData = await page.evaluate(() => localStorage.getItem("auth"));
  expect(authData).not.toBeNull();
}

// Additional Remote-added Helpers
export const loginAsAdmin = async (page) => {
  await loginAsPlaywrightAdmin(page);
  await expect(page.getByText(PLAYWRIGHT_ADMIN_NAME)).toBeVisible();
};

export const resetAdminTestData = async () => {
  await cleanupPlaywrightData({ includeAdmin: true });
  await ensurePlaywrightAdmin();
};

export const clearAdminTestData = async () =>
  cleanupPlaywrightArtifacts("clearAdminTestData");

export const createCategory = async (page, categoryName) => {
  await page.goto("/dashboard/admin/create-category");
  await expect(page.getByRole("heading", { name: /manage category/i })).toBeVisible();
  await page.getByPlaceholder("Enter new category").fill(categoryName);
  await page.getByRole("button", { name: "Submit" }).first().click();
  const createdRow = page.locator("tbody tr").filter({ hasText: categoryName });
  await expect(createdRow).toHaveCount(1);
};

export const createProduct = async (page, productDetails) => {
  const { categoryName, name, description, price, quantity, shippingLabel = "Yes" } = productDetails;
  const productFixturePath = getProductFixturePath();

  await page.getByRole("link", { name: "Create Product" }).click();
  await expect(page).toHaveURL("/dashboard/admin/create-product");
  await page.locator(".ant-select").first().click();
  await page.locator(".ant-select-item-option-content", { hasText: categoryName }).click();
  await page.locator('input[name="photo"]').setInputFiles(productFixturePath);
  await page.locator('input[placeholder="write a name"]').fill(name);
  await page.locator('textarea[placeholder="write a description"]').fill(description);
  await page.locator('input[placeholder="write a Price"]').fill(String(price));
  await page.locator('input[placeholder="write a quantity"]').fill(String(quantity));
  await page.locator(".ant-select").nth(1).click();
  await page.locator(".ant-select-item-option-content", { hasText: shippingLabel }).click();
  await page.getByRole("button", { name: /create product/i }).click();
  await expect(page).toHaveURL("/dashboard/admin/products");
};

// Admin Orders Helpers (from HEAD, adapted for ESM/Mongoose)
export async function cleanupPlaywrightAdminOrdersData(reason) {
    await cleanupPlaywrightData();
}

export async function seedPlaywrightAdminOrdersData() {
    return withPlaywrightConnection(async () => {
        // Seed category
        await categoryModel.findOneAndUpdate(
            { _id: PLAYWRIGHT_CATEGORY_ID },
            {
                name: "__playwright__ Admin Orders Category",
                slug: "__playwright__-admin-orders-category",
            },
            { upsert: true }
        );

        // Seed products
        const products = [
            {
                _id: PLAYWRIGHT_PRODUCT_IDS[0],
                name: PLAYWRIGHT_ORDER_PRODUCT_NAMES[0],
                slug: "__playwright__-admin-orders-keyboard",
                description: "Playwright-owned seeded keyboard for admin order tests.",
                price: 149,
                category: PLAYWRIGHT_CATEGORY_ID,
                quantity: 5,
                shipping: true,
            },
            {
                _id: PLAYWRIGHT_PRODUCT_IDS[1],
                name: PLAYWRIGHT_ORDER_PRODUCT_NAMES[1],
                slug: "__playwright__-admin-orders-mouse",
                description: "Playwright-owned seeded mouse for admin order tests.",
                price: 59,
                category: PLAYWRIGHT_CATEGORY_ID,
                quantity: 8,
                shipping: false,
            },
        ];

        for (const p of products) {
            await productModel.findOneAndUpdate({ _id: p._id }, p, { upsert: true });
        }

        // Seed Users
        const hashedAdminPassword = await bcrypt.hash(PLAYWRIGHT_ADMIN_PASSWORD, 10);
        const adminUser = await userModel.findOneAndUpdate(
            { email: PLAYWRIGHT_ADMIN_EMAIL },
            {
                name: PLAYWRIGHT_ADMIN_NAME,
                email: PLAYWRIGHT_ADMIN_EMAIL,
                password: hashedAdminPassword,
                phone: "12345678",
                address: "Playwright Admin Address",
                answer: "__playwright__ admin answer",
                role: 1
            },
            { upsert: true, new: true }
        );

        const hashedBuyerPassword = await bcrypt.hash(PLAYWRIGHT_ADMIN_PASSWORD, 10);
        const buyerUser = await userModel.findOneAndUpdate(
            { email: "playwright-buyer@test.com" },
            {
                name: PLAYWRIGHT_BUYER_NAME,
                email: "playwright-buyer@test.com",
                password: hashedBuyerPassword,
                phone: "87654321",
                address: "Playwright Buyer Address",
                answer: "__playwright__ buyer answer",
                role: 0
            },
            { upsert: true, new: true }
        );

        // Seed Orders
        const orders = [
            {
                _id: PLAYWRIGHT_ORDER_IDS[0],
                products: [PLAYWRIGHT_PRODUCT_IDS[0]],
                payment: { success: true },
                buyer: buyerUser._id,
                status: PLAYWRIGHT_ORDER_STATUSES[0],
                createdAt: new Date("2026-03-19T10:00:00.000Z"),
            },
            {
                _id: PLAYWRIGHT_ORDER_IDS[1],
                products: [PLAYWRIGHT_PRODUCT_IDS[1]],
                payment: { success: false },
                buyer: buyerUser._id,
                status: PLAYWRIGHT_ORDER_STATUSES[1],
                createdAt: new Date("2026-03-18T10:00:00.000Z"),
            },
        ];

        for (const o of orders) {
            await orderModel.findOneAndUpdate({ _id: o._id }, o, { upsert: true });
        }
    });
}
