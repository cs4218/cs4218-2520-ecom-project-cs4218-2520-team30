/**
 * Integration: real Product in Mongo → cart shape (as client) → Braintree payment → Order refs product _id.
 * Sandwich: GET catalog (bottom) → controller (middle) → HTTP GET + POST (top).
 *
 * Basil Boh, A0273232M
 */

import {
  jest,
  describe,
  beforeAll,
  afterAll,
  afterEach,
  beforeEach,
  test,
  expect,
} from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import JWT from "jsonwebtoken";
import http from "http";
import braintree from "braintree";
import userModel from "../../../models/userModel.js";
import orderModel from "../../../models/orderModel.js";
import categoryModel from "../../../models/categoryModel.js";
import productModel from "../../../models/productModel.js";
import { hashPassword } from "../../../helpers/authHelper.js";

let mongoServer;
let app;
let server;
let baseUrl;

const mockSale = braintree.BraintreeGateway._mockSale;

process.env.JWT_SECRET = "test-jwt-secret-cart-product-integration";

const PRODUCT_SLUG = "integration-cart-widget";

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
  await orderModel.deleteMany({});
  await userModel.deleteMany({});
  await productModel.deleteMany({});
  await categoryModel.deleteMany({});
});

const httpRequest = (method, path, { body = null, token = null } = {}) => {
  return new Promise((resolve, reject) => {
    const payload = body != null ? JSON.stringify(body) : "";
    /** @type {Record<string, string>} */
    const headers = {};
    if (token) {
      headers.Authorization = token;
    }
    if (method !== "GET" && payload !== "") {
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = String(Buffer.byteLength(payload));
    }

    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: new URL(baseUrl).port,
        path,
        method,
        headers,
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
            rawBody: responseBody,
          });
        });
      }
    );

    req.on("error", reject);
    if (payload && method !== "GET") {
      req.write(payload);
    }
    req.end();
  });
};

const seedBuyer = async () => {
  const hashedPw = await hashPassword("SecurePass123");
  return new userModel({
    name: "Cart Product User",
    email: "cartproduct@test.com",
    password: hashedPw,
    phone: "91234567",
    address: "1 Test St",
    answer: "soccer",
    role: 0,
  }).save();
};

/** Category + Product as stored in Mongo (cart lines reference real Products _id). */
const seedCategoryAndProduct = async () => {
  const category = await new categoryModel({
    name: "Integration Category",
    slug: "integration-category",
  }).save();

  const product = await new productModel({
    name: "Cart Widget",
    slug: PRODUCT_SLUG,
    description: "Seeded for cart–product integration",
    price: 29.5,
    category: category._id,
    quantity: 10,
    shipping: true,
  }).save();

  return { category, product };
};

/**
 * Phase 1 [Bottom]: catalog API returns a document the client can put in cart (ProductDetails flow).
 */
describe("Phase 1 [Bottom]: GET /get-product/:slug with seeded Product", () => {
  test("should return product fields used when adding to cart", async () => {
    await seedCategoryAndProduct();

    const res = await httpRequest(
      "GET",
      `/api/v1/product/get-product/${PRODUCT_SLUG}`
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.product).toBeDefined();
    expect(res.body.product.slug).toBe(PRODUCT_SLUG);
    expect(res.body.product.price).toBe(29.5);
    expect(res.body.product.name).toBe("Cart Widget");
    expect(res.body.product._id).toBeDefined();
    expect(res.body.product.category).toBeDefined();
  });
});

/**
 * Phase 2 [Middle]: payment controller with cart built from a real product _id (not random ObjectId).
 */
describe("Phase 2 [Middle]: brainTreePaymentController + real Product ref", () => {
  let brainTreePaymentController;

  beforeAll(async () => {
    const mod = await import("../../../controllers/productController.js");
    brainTreePaymentController = mod.brainTreePaymentController;
  });

  beforeEach(() => {
    mockSale.mockReset();
  });

  const fakeRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  test("should charge product price and persist order referencing seeded product _id", async () => {
    const buyer = await seedBuyer();
    const { product } = await seedCategoryAndProduct();

    const cart = [
      {
        _id: product._id.toString(),
        name: product.name,
        description: product.description,
        price: product.price,
        slug: product.slug,
      },
    ];

    mockSale.mockImplementation((opts, callback) => {
      expect(opts.amount).toBe(29.5);
      callback(null, { success: true, transaction: { id: "cart-product-tx" } });
    });

    await brainTreePaymentController(
      {
        user: { _id: buyer._id.toString() },
        body: { nonce: "fake-nonce", cart },
      },
      fakeRes()
    );
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));

    expect(mockSale).toHaveBeenCalled();
    const orders = await orderModel.find({ buyer: buyer._id });
    expect(orders).toHaveLength(1);
    expect(orders[0].products[0].toString()).toBe(product._id.toString());
    expect(orders[0].payment.success).toBe(true);
  });
});

/**
 * Phase 3 [Top]: HTTP GET product → cart array like CartPage → POST payment with JWT.
 */
describe("Phase 3 [Top]: GET product then checkout over HTTP", () => {
  beforeEach(() => {
    mockSale.mockReset();
    mockSale.mockImplementation((opts, callback) => {
      callback(null, { success: true, transaction: { id: "http-cart-tx" } });
    });
  });

  test("should persist order whose product ref matches catalog GET response", async () => {
    const buyer = await seedBuyer();
    await seedCategoryAndProduct();

    const getRes = await httpRequest(
      "GET",
      `/api/v1/product/get-product/${PRODUCT_SLUG}`
    );
    expect(getRes.statusCode).toBe(200);
    const apiProduct = getRes.body.product;

    const cart = [apiProduct];
    const token = JWT.sign({ _id: buyer._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    const payRes = await httpRequest(
      "POST",
      "/api/v1/product/braintree/payment",
      {
        body: { nonce: "fake-valid-nonce", cart },
        token,
      }
    );

    expect(payRes.statusCode).toBe(200);
    expect(payRes.body).toEqual({ ok: true });

    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));

    expect(mockSale).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 29.5,
        paymentMethodNonce: "fake-valid-nonce",
        options: { submitForSettlement: true },
      }),
      expect.any(Function)
    );

    const orders = await orderModel.find({ buyer: buyer._id });
    expect(orders).toHaveLength(1);
    expect(orders[0].products[0].toString()).toBe(String(apiProduct._id));
    expect(orders[0].payment.success).toBe(true);
  });
});
