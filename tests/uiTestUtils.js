// Alek Kwek, A0273471A
import bcrypt from "bcrypt";
import fs from "fs";
import { expect } from "@playwright/test";
import { MongoClient } from "mongodb";
import path from "path";
import { fileURLToPath } from "url";

export const PLAYWRIGHT_ADMIN_EMAIL = "playwright-admin@test.com";
export const PLAYWRIGHT_ADMIN_PASSWORD = "adminpassword123";
export const PLAYWRIGHT_USER_EMAIL = "playwright-user@test.com";
export const PLAYWRIGHT_USER_PASSWORD = "userpassword123";
const WORKER_ID = process.env.TEST_WORKER_INDEX || "0";
export const PLAYWRIGHT_PREFIX = `__pw_w${WORKER_ID}__`;
export const ADMIN_EMAIL = PLAYWRIGHT_ADMIN_EMAIL;
export const ADMIN_PASSWORD = PLAYWRIGHT_ADMIN_PASSWORD;
const DEFAULT_PLAYWRIGHT_MONGO_URL =
  "mongodb://127.0.0.1:27017/ecom-playwright";
const PLAYWRIGHT_DB_NAME = "ecom-playwright";
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cleanupTargets = [
  {
    collection: "products",
    filter: { name: { $regex: `^${PLAYWRIGHT_PREFIX}` } },
    printableFilter: '{ "name": { "$regex": "^__pw_w" } }',
  },
  {
    collection: "categories",
    filter: { name: { $regex: `^${PLAYWRIGHT_PREFIX}` } },
    printableFilter: '{ "name": { "$regex": "^__pw_w" } }',
  },
];

const artifactCleanupTargets = cleanupTargets;

const addDatabaseNameToMongoUrl = (mongoUrl, databaseName) => {
  const [baseUrl, queryString] = mongoUrl.split("?");
  const schemeIndex = baseUrl.indexOf("://");

  if (schemeIndex === -1) {
    return mongoUrl;
  }

  const pathStartIndex = baseUrl.indexOf("/", schemeIndex + 3);

  if (pathStartIndex === -1) {
    return `${baseUrl}/${databaseName}${queryString ? `?${queryString}` : ""}`;
  }

  const authority = baseUrl.slice(0, pathStartIndex);
  const pathName = baseUrl.slice(pathStartIndex + 1);

  if (!pathName) {
    return `${authority}/${databaseName}${queryString ? `?${queryString}` : ""}`;
  }

  return mongoUrl;
};

export const getPlaywrightMongoUrl = () => {
  if (process.env.PLAYWRIGHT_MONGO_URL) {
    return process.env.PLAYWRIGHT_MONGO_URL;
  }

  if (process.env.MONGO_URL) {
    return addDatabaseNameToMongoUrl(process.env.MONGO_URL, PLAYWRIGHT_DB_NAME);
  }

  return DEFAULT_PLAYWRIGHT_MONGO_URL;
};

export const getMongoDatabaseName = (mongoUrl) => {
  const withoutQuery = mongoUrl.split("?")[0];
  const slashIndex = withoutQuery.lastIndexOf("/");
  const pathName = slashIndex >= 0 ? withoutQuery.slice(slashIndex + 1) : "";

  return pathName && !pathName.includes("@")
    ? decodeURIComponent(pathName)
    : "test";
};

const withDatabase = async (callback) => {
  const mongoUrl = getPlaywrightMongoUrl();
  const client = new MongoClient(mongoUrl, {
    serverSelectionTimeoutMS: 5_000,
    connectTimeoutMS: 5_000,
  });
  try {
    await client.connect();
    return await callback(client.db());
  } catch (error) {
    throw new Error(
      `Playwright could not connect to ${mongoUrl}. Start Mongo locally or set PLAYWRIGHT_MONGO_URL explicitly.`
    );
  } finally {
    await client.close().catch(() => {});
  }
};

export const cleanupTargetsInDatabase = async (label, targets) => {
  const appMongoUrl = process.env.PLAYWRIGHT_APP_MONGO_URL || getPlaywrightMongoUrl();

  console.log(`[Playwright cleanup:${label}] app Mongo URI target: ${appMongoUrl}`);
  console.log(
    `[Playwright cleanup:${label}] app database name: ${getMongoDatabaseName(
      appMongoUrl
    )}`
  );

  await withDatabase(async (db) => {
    console.log(
      `[Playwright cleanup:${label}] Playwright helper database name: ${db.databaseName}`
    );

    targets.forEach((target) => {
      console.log(
        `[Playwright cleanup:${label}] ${target.collection} ${target.printableFilter}`
      );
    });

    for (const target of targets) {
      const result = await db.collection(target.collection).deleteMany(target.filter);
      console.log(
        `[Playwright cleanup:${label}] deleted ${result.deletedCount} document(s) from ${target.collection}`
      );
    }
  });
};

export const cleanupPlaywrightData = async (label) =>
  cleanupTargetsInDatabase(label, cleanupTargets);

export const cleanupPlaywrightArtifacts = async (label) =>
  cleanupTargetsInDatabase(label, artifactCleanupTargets);

export const ensurePlaywrightAdmin = async () => {
  await ensurePlaywrightUser({
    name: "Playwright Admin",
    email: PLAYWRIGHT_ADMIN_EMAIL,
    password: PLAYWRIGHT_ADMIN_PASSWORD,
    role: 1,
  });
};

export const ensurePlaywrightRegularUser = async () => {
  await ensurePlaywrightUser({
    name: "Playwright User",
    email: PLAYWRIGHT_USER_EMAIL,
    password: PLAYWRIGHT_USER_PASSWORD,
    role: 0,
  });
};

export const ensurePlaywrightCatalog = async () => {
  await withDatabase(async (db) => {
    const now = new Date();
    const fixturePath = getProductFixturePath();
    const photoData = fs.readFileSync(fixturePath);

    await db.collection("categories").updateOne(
      { slug: PLAYWRIGHT_SEED_CATEGORY_SLUG },
      {
        $set: {
          name: "Playwright Seeded Category",
          slug: PLAYWRIGHT_SEED_CATEGORY_SLUG,
        },
      },
      { upsert: true }
    );

    const seededCategory = await db
      .collection("categories")
      .findOne({ slug: PLAYWRIGHT_SEED_CATEGORY_SLUG });

    if (!seededCategory?._id) {
      throw new Error("Playwright could not seed the test category.");
    }

    for (const product of PLAYWRIGHT_SEED_PRODUCTS) {
      await db.collection("products").updateOne(
        { slug: product.slug },
        {
          $set: {
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
          $setOnInsert: {
            createdAt: now,
          },
        },
        { upsert: true }
      );
    }
  });
};

const ensurePlaywrightUser = async ({ name, email, password, role }) => {
  await withDatabase(async (db) => {
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.collection("users").updateOne(
      { email },
      {
        $set: {
          name,
          email,
          password: hashedPassword,
          phone: "1234567890",
          address: "Playwright Address",
          answer: "Playwright Answer",
          role,
        },
      },
      { upsert: true }
    );
  });
};

export const makePlaywrightName = (label) =>
  `${PLAYWRIGHT_PREFIX} ${label} ${Date.now()} ${Math.floor(Math.random() * 1000)}`;

export const getProductFixturePath = () =>
  path.join(__dirname, "fixtures", "playwright-product.svg");

export const loginAsPlaywrightAdmin = async (page) => {
  await page.goto("/login");
  await page.getByPlaceholder("Enter Your Email ").fill(PLAYWRIGHT_ADMIN_EMAIL);
  await page.getByPlaceholder("Enter Your Password").fill(
    PLAYWRIGHT_ADMIN_PASSWORD
  );
  await page.getByRole("button", { name: "LOGIN" }).click();
  await page.waitForURL("**/");
  const authData = await page.evaluate(() => localStorage.getItem("auth"));
  expect(authData).not.toBeNull();
};

export const resetAdminTestData = async () => {
  await cleanupPlaywrightData("resetAdminTestData");
  await ensurePlaywrightAdmin();
};

export const clearAdminTestData = async () =>
  cleanupPlaywrightArtifacts("clearAdminTestData");

export const loginAsAdmin = async (page) => {
  await loginAsPlaywrightAdmin(page);
  await expect(page.getByText("Playwright Admin")).toBeVisible();
};

export const createCategory = async (page, categoryName) => {
  await page.goto("/dashboard/admin/create-category");
  await expect(
    page.getByRole("heading", { name: /manage category/i })
  ).toBeVisible();

  await page.getByPlaceholder("Enter new category").fill(categoryName);
  await page.getByRole("button", { name: "Submit" }).first().click();

  const createdRow = page.locator("tbody tr").filter({ hasText: categoryName });
  await expect(createdRow).toHaveCount(1);
};

export const createProduct = async (page, productDetails) => {
  const {
    categoryName,
    name,
    description,
    price,
    quantity,
    shippingLabel = "Yes",
  } = productDetails;

  const productFixturePath = getProductFixturePath();

  await page.getByRole("link", { name: "Create Product" }).click();
  await expect(page).toHaveURL("/dashboard/admin/create-product");
  await expect(
    page.getByRole("heading", { name: /create product/i })
  ).toBeVisible();

  await page.locator(".ant-select").first().click();
  await page
    .locator(".ant-select-item-option-content", { hasText: categoryName })
    .click();
  await page.locator('input[name="photo"]').setInputFiles(productFixturePath);
  await page.locator('input[placeholder="write a name"]').fill(name);
  await page
    .locator('textarea[placeholder="write a description"]')
    .fill(description);
  await page.locator('input[placeholder="write a Price"]').fill(String(price));
  await page
    .locator('input[placeholder="write a quantity"]')
    .fill(String(quantity));
  await page.locator(".ant-select").nth(1).click();
  await page
    .locator(".ant-select-item-option-content", { hasText: shippingLabel })
    .click();
  await page.getByRole("button", { name: /create product/i }).click();

  await expect(page).toHaveURL("/dashboard/admin/products");
  await expect(
    page.getByRole("heading", { name: /all products list/i })
  ).toBeVisible();
};
