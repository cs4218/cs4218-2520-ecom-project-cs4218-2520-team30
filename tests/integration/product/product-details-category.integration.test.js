/**
 * Integration: Category listing (CategoryProduct) ↔ Product details (ProductDetails) ↔ related products.
 * Sandwich: Mongo refs (bottom) → controllers (middle) → HTTP chain (top).
 *
 * Basil Boh, A0273232M
 */

import {
  jest,
  describe,
  beforeAll,
  afterAll,
  afterEach,
  test,
  expect,
} from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import http from "http";
import categoryModel from "../../../models/categoryModel.js";
import productModel from "../../../models/productModel.js";

let mongoServer;
let app;
let server;
let baseUrl;

const CATEGORY_SLUG = "integration-fiction-cat";
const PRODUCT_SLUG_A = "integration-book-a";
const PRODUCT_SLUG_B = "integration-book-b";

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  const express = (await import("express")).default;
  app = express();
  app.use(express.json());

  const productRouteModule = await import("../../../routes/productRoutes.js");
  const productRoutes = productRouteModule.default?.default ?? productRouteModule.default;
  app.use("/api/v1/product", productRoutes);

  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

afterEach(async () => {
  await productModel.deleteMany({});
  await categoryModel.deleteMany({});
});

const httpRequest = (method, path) => {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: new URL(baseUrl).port,
        path,
        method,
        headers: {},
      },
      (res) => {
        let responseBody = "";
        res.on("data", (chunk) => {
          responseBody += chunk;
        });
        res.on("end", () => {
          let parsed = responseBody;
          try {
            parsed = responseBody ? JSON.parse(responseBody) : {};
          } catch {
            /* non-JSON */
          }
          resolve({
            statusCode: res.statusCode,
            body: parsed,
          });
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
};

const seedCategoryWithTwoProducts = async () => {
  const category = await new categoryModel({
    name: "Integration Fiction",
    slug: CATEGORY_SLUG,
  }).save();

  const productA = await new productModel({
    name: "Book A",
    slug: PRODUCT_SLUG_A,
    description: "First seeded book",
    price: 10,
    category: category._id,
    quantity: 5,
    shipping: false,
  }).save();

  const productB = await new productModel({
    name: "Book B",
    slug: PRODUCT_SLUG_B,
    description: "Second seeded book",
    price: 12,
    category: category._id,
    quantity: 3,
    shipping: false,
  }).save();

  return { category, productA, productB };
};

const chainableRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  return res;
};

/**
 * Phase 1 [Bottom]: category + products in Mongo share one category ref
 */
describe("Phase 1 [Bottom]: categoryModel + productModel consistency", () => {
  test("should seed two products pointing at the same category", async () => {
    const { category, productA, productB } = await seedCategoryWithTwoProducts();

    const count = await productModel.countDocuments({ category: category._id });
    expect(count).toBe(2);
    expect(productA.category.toString()).toBe(category._id.toString());
    expect(productB.category.toString()).toBe(category._id.toString());
  });
});

/**
 * Phase 2 [Middle]: controllers with fake req/res (same logic as HTTP routes)
 */
describe("Phase 2 [Middle]: productCategory + getSingleProduct + relatedProduct controllers", () => {
  let productCategoryController;
  let getSingleProductController;
  let relatedProductController;

  beforeAll(async () => {
    const mod = await import("../../../controllers/productController.js");
    productCategoryController = mod.productCategoryController;
    getSingleProductController = mod.getSingleProductController;
    relatedProductController = mod.relatedProductController;
  });

  test("productCategoryController returns category and products for slug", async () => {
    const { category, productA } = await seedCategoryWithTwoProducts();
    const res = chainableRes();

    await productCategoryController({ params: { slug: CATEGORY_SLUG } }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.send.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.category._id.toString()).toBe(category._id.toString());
    expect(payload.products).toHaveLength(2);
    const ids = payload.products.map((p) => p._id.toString());
    expect(ids).toContain(productA._id.toString());
  });

  test("getSingleProductController populates category matching listing", async () => {
    const { category } = await seedCategoryWithTwoProducts();
    const res = chainableRes();

    await getSingleProductController({ params: { slug: PRODUCT_SLUG_A } }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const { product } = res.send.mock.calls[0][0];
    expect(product.slug).toBe(PRODUCT_SLUG_A);
    expect(product.category._id.toString()).toBe(category._id.toString());
    expect(product.category.slug).toBe(CATEGORY_SLUG);
  });

  test("relatedProductController excludes current id and returns same-category sibling", async () => {
    const { category, productA, productB } = await seedCategoryWithTwoProducts();
    const res = chainableRes();

    await relatedProductController(
      {
        params: {
          pid: productA._id.toString(),
          cid: category._id.toString(),
        },
      },
      res
    );

    expect(res.status).toHaveBeenCalledWith(200);
    const { products } = res.send.mock.calls[0][0];
    expect(products.length).toBeGreaterThanOrEqual(1);
    const ids = products.map((p) => p._id.toString());
    expect(ids).not.toContain(productA._id.toString());
    expect(ids).toContain(productB._id.toString());
  });
});

/**
 * Phase 3 [Top]: HTTP flow mirrors CategoryProduct → ProductDetails → related carousel
 */
describe("Phase 3 [Top]: HTTP category listing → product detail → related products", () => {
  test("should chain GETs with consistent category and related sibling", async () => {
    const { category, productA, productB } = await seedCategoryWithTwoProducts();

    const listRes = await httpRequest(
      "GET",
      `/api/v1/product/product-category/${CATEGORY_SLUG}`
    );
    expect(listRes.statusCode).toBe(200);
    expect(listRes.body.success).toBe(true);
    expect(listRes.body.category.slug).toBe(CATEGORY_SLUG);
    expect(listRes.body.products).toHaveLength(2);

    const pickedSlug = listRes.body.products[0].slug;
    const pickedId = listRes.body.products[0]._id;

    const detailRes = await httpRequest(
      "GET",
      `/api/v1/product/get-product/${pickedSlug}`
    );
    expect(detailRes.statusCode).toBe(200);
    const p = detailRes.body.product;
    expect(p.slug).toBe(pickedSlug);
    expect(String(p.category._id)).toBe(String(category._id));
    expect(p.category.slug).toBe(CATEGORY_SLUG);

    const relatedRes = await httpRequest(
      "GET",
      `/api/v1/product/related-product/${pickedId}/${p.category._id}`
    );
    expect(relatedRes.statusCode).toBe(200);
    expect(relatedRes.body.success).toBe(true);
    const relIds = relatedRes.body.products.map((x) => String(x._id));
    expect(relIds).not.toContain(String(pickedId));
    const otherId =
      String(pickedId) === String(productA._id)
        ? String(productB._id)
        : String(productA._id);
    expect(relIds).toContain(otherId);
  });
});
