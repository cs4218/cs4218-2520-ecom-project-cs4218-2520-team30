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
import {
  PLAYWRIGHT_ADMIN_ADDRESS,
  PLAYWRIGHT_ADMIN_ANSWER,
  PLAYWRIGHT_ADMIN_EMAIL,
  PLAYWRIGHT_ADMIN_NAME,
  PLAYWRIGHT_ADMIN_PASSWORD,
  PLAYWRIGHT_ADMIN_PHONE,
  PLAYWRIGHT_DB_NAME,
  PLAYWRIGHT_PREFIX,
  getBaseMongoUri,
  getPlaywrightMongoUri,
} from "./playwrightDb.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prefixRegex = new RegExp(`^${PLAYWRIGHT_PREFIX}`, "i");

export const PLAYWRIGHT_USER_EMAIL = "playwright-user@test.com";
export const PLAYWRIGHT_USER_PASSWORD = "userpassword123";

const PLAYWRIGHT_SEED_CATEGORY_SLUG = "playwright-seeded-category";
const PLAYWRIGHT_SEED_PRODUCTS = [
  {
    slug: "playwright-alpha-product",
    name: "Playwright Alpha Product",
    description: "A seeded Playwright alpha catalog item for search and cart flows.",
    price: 19,
    quantity: 12,
    shipping: true,
  },
  {
    slug: "playwright-beta-product",
    name: "Playwright Beta Product",
    description: "A seeded Playwright beta catalog item for multi-result search coverage.",
    price: 29,
    quantity: 8,
    shipping: false,
  },
];

export function getPlaywrightMongoUrl() {
  return getPlaywrightMongoUri();
}

export async function withPlaywrightConnection(work) {
  const uri = getPlaywrightMongoUri();
  // Ensure we are not already connected to a different DB
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

    // Legacy admin expected by some tests
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

export async function ensurePlaywrightRegularUser() {
  const uri = getPlaywrightMongoUri();
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  await mongoose.connect(uri);
  try {
    const hashedPassword = await bcrypt.hash(PLAYWRIGHT_USER_PASSWORD, 10);
    await userModel.findOneAndUpdate(
      { email: PLAYWRIGHT_USER_EMAIL },
      {
        name: "Playwright User",
        email: PLAYWRIGHT_USER_EMAIL,
        password: hashedPassword,
        phone: "1234567890",
        address: "Playwright Address",
        answer: "Playwright Answer",
        role: 0,
      },
      { upsert: true }
    );
  } finally {
    await mongoose.disconnect();
  }
}

export async function cleanupPlaywrightData({ includeAdmin = false } = {}) {
  const uri = getPlaywrightMongoUri();
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  await mongoose.connect(uri);
  try {
    await productModel.deleteMany({ name: prefixRegex });
    await categoryModel.deleteMany({ name: prefixRegex });

    if (includeAdmin) {
      await userModel.deleteMany({
        email: { $in: [PLAYWRIGHT_ADMIN_EMAIL, "admin@test.sg", PLAYWRIGHT_USER_EMAIL] },
      });
    }
  } finally {
    await mongoose.disconnect();
  }
}

export async function ensurePlaywrightCatalog() {
  const uri = getPlaywrightMongoUri();
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  await mongoose.connect(uri);
  try {
    const fixturePath = getProductFixturePath();
    const photoData = fs.readFileSync(fixturePath);
    const now = new Date();

    await categoryModel.findOneAndUpdate(
      { slug: PLAYWRIGHT_SEED_CATEGORY_SLUG },
      {
        name: "Playwright Seeded Category",
        slug: PLAYWRIGHT_SEED_CATEGORY_SLUG,
      },
      { upsert: true, new: true }
    );

    const seededCategory = await categoryModel.findOne({
      slug: PLAYWRIGHT_SEED_CATEGORY_SLUG,
    });

    for (const product of PLAYWRIGHT_SEED_PRODUCTS) {
      await productModel.findOneAndUpdate(
        { slug: product.slug },
        {
          name: product.name,
          slug: product.slug,
          description: product.description,
          price: product.price,
          category: seededCategory._id,
          quantity: product.quantity,
          shipping: product.shipping,
          photo: {
            data: photoData,
            contentType: "image/svg+xml",
          },
          updatedAt: now,
        },
        { upsert: true }
      );
    }
  } finally {
    await mongoose.disconnect();
  }
}

export const makePlaywrightName = (label) =>
  `${PLAYWRIGHT_PREFIX} ${label} ${Date.now()} ${Math.floor(Math.random() * 1000)}`;

export const getProductFixturePath = () =>
  path.join(__dirname, "fixtures", "playwright-product.svg");

export async function loginAsPlaywrightAdmin(page) {
  await page.goto("/login");
  await page.getByPlaceholder("Enter Your Email ").fill(PLAYWRIGHT_ADMIN_EMAIL);
  await page.getByPlaceholder("Enter Your Password").fill(
    PLAYWRIGHT_ADMIN_PASSWORD
  );
  await page.getByRole("button", { name: "LOGIN" }).click();
  await page.waitForURL("**/");
  const authData = await page.evaluate(() => localStorage.getItem("auth"));
  expect(authData).not.toBeNull();
}
