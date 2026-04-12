/**
 * Integration Tests: cart payload × brainTreePaymentController × orderModel × requireSignIn × Braintree (mocked)
 * Sandwich integration for checkout: client "cart" array posted to /braintree/payment.
 *
 * Basil Boh A0273232M
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
import { hashPassword } from "../../../helpers/authHelper.js";

let mongoServer;

/** Hoisted via tests/integration/setup-braintree-mock.cjs (same pattern as productController.test.js) */
const mockSale = braintree.BraintreeGateway._mockSale;

process.env.JWT_SECRET = "test-jwt-secret-payment-integration";

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

afterEach(async () => {
  await userModel.deleteMany({});
  await orderModel.deleteMany({});
});

const validUserData = {
  name: "Pay Test User",
  email: "payuser@test.com",
  password: "SecurePass123",
  phone: "91234567",
  address: "456 Payment Lane",
  answer: "Football",
};

const seedBuyer = async () => {
  const hashedPw = await hashPassword(validUserData.password);
  const user = await new userModel({
    name: validUserData.name,
    email: validUserData.email,
    password: hashedPw,
    phone: validUserData.phone,
    address: validUserData.address,
    answer: validUserData.answer,
    role: 0,
  }).save();
  return user;
};

/** Client-shaped cart line (as sent from CartPage) */
const sampleCart = () => {
  const pid = new mongoose.Types.ObjectId();
  return [
    {
      _id: pid.toString(),
      name: "Integration Novel",
      description: "Test item",
      price: 14.99,
      slug: "integration-novel",
    },
  ];
};

const makeRequest = (baseUrl, method, path, body, authToken = null) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body ?? {});

    /** @type {Record<string, string>} */
    const headers = {
      "Content-Type": "application/json",
      "Content-Length": String(Buffer.byteLength(data)),
    };
    if (authToken) {
      headers.Authorization = authToken;
    }

    const options = {
      hostname: "127.0.0.1",
      port: new URL(baseUrl).port,
      path,
      method,
      headers,
    };

    const req = http.request(options, (res) => {
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
    });

    req.on("error", reject);
    req.write(data);
    req.end();
  });
};

/**
 * Phase 1 [Bottom]: orderModel + MongoDB — products are ObjectId refs (client cart fields are not embedded)
 */
describe("Phase 1 [Bottom]: orderModel + MongoDB (checkout payload shape)", () => {
  test("should persist an order with product ObjectId refs and a buyer ref", async () => {
    const buyer = await seedBuyer();
    const productId = new mongoose.Types.ObjectId();

    const saved = await new orderModel({
      products: [productId],
      payment: { success: true, transaction: { id: "mock-tx" } },
      buyer: buyer._id,
    }).save();

    expect(saved._id).toBeDefined();
    expect(saved.products).toHaveLength(1);
    expect(saved.products[0].toString()).toBe(productId.toString());
    expect(saved.buyer.toString()).toBe(buyer._id.toString());
    expect(saved.payment.success).toBe(true);
  });
});

/**
 * Phase 2 [Middle]: brainTreePaymentController + orderModel + mocked Braintree sale
 */
describe("Phase 2 [Middle]: brainTreePaymentController + orderModel + mocked Braintree", () => {
  let brainTreePaymentController;

  beforeAll(async () => {
    const mod = await import("../../../controllers/productController.js");
    brainTreePaymentController = mod.brainTreePaymentController;
  });

  beforeEach(() => {
    mockSale.mockReset();
  });

  const createFakeResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  test("should charge summed cart total, return ok, and persist order for buyer", async () => {
    const buyer = await seedBuyer();
    const cart = sampleCart();
    mockSale.mockImplementation((opts, callback) => {
      expect(opts.amount).toBe(14.99);
      expect(opts.paymentMethodNonce).toBe("fake-valid-nonce");
      callback(null, { success: true, transaction: { id: "sandbox-tx-1" } });
    });

    const req = {
      user: { _id: buyer._id.toString() },
      body: { nonce: "fake-valid-nonce", cart },
    };
    const res = createFakeResponse();

    await brainTreePaymentController(req, res);

    expect(mockSale).toHaveBeenCalled();

    // Wait for the async callback's await .save() to complete
    const deadline = Date.now() + 5000;
    let orders = [];
    while (Date.now() < deadline) {
      orders = await orderModel.find({ buyer: buyer._id });
      if (orders.length > 0) break;
      await new Promise((r) => setTimeout(r, 50));
    }
    expect(res.json).toHaveBeenCalledWith({ ok: true });
    expect(orders).toHaveLength(1);
    expect(orders[0].products).toHaveLength(1);
    expect(orders[0].payment.success).toBe(true);
  });

  test("should respond 500 and not create order when Braintree sale fails", async () => {
    const buyer = await seedBuyer();
    const cart = sampleCart();
    const braintreeError = new Error("processor declined");
    mockSale.mockImplementation((opts, callback) => {
      callback(braintreeError, null);
    });

    const req = {
      user: { _id: buyer._id.toString() },
      body: { nonce: "bad-nonce", cart },
    };
    const res = createFakeResponse();

    await brainTreePaymentController(req, res);
    await new Promise((r) => setImmediate(r));

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(braintreeError);

    const orders = await orderModel.find({ buyer: buyer._id });
    expect(orders).toHaveLength(0);
  });
});

/**
 * Phase 3 [Top]: Express + product routes + requireSignIn + full HTTP stack
 */
describe("Phase 3 [Top]: POST /api/v1/product/braintree/payment (sandwich)", () => {
  let app;
  let server;
  let baseUrl;

  beforeAll(async () => {
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
  });

  beforeEach(() => {
    mockSale.mockReset();
    mockSale.mockImplementation((opts, callback) => {
      callback(null, { success: true, transaction: { id: "http-tx-1" } });
    });
  });

  test("should return 401 without Authorization header", async () => {
    const response = await makeRequest(
      baseUrl,
      "POST",
      "/api/v1/product/braintree/payment",
      { nonce: "x", cart: sampleCart() },
      null
    );

    expect(response.statusCode).toBe(401);
    expect(response.body.success).toBe(false);
  });

  test("should return 401 for invalid JWT", async () => {
    const response = await makeRequest(
      baseUrl,
      "POST",
      "/api/v1/product/braintree/payment",
      { nonce: "x", cart: sampleCart() },
      "not-a-valid-jwt"
    );

    expect(response.statusCode).toBe(401);
  });

  test("should complete payment through HTTP and persist order when token and cart are valid", async () => {
    const buyer = await seedBuyer();
    const token = JWT.sign({ _id: buyer._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    const cart = sampleCart();

    const response = await makeRequest(
      baseUrl,
      "POST",
      "/api/v1/product/braintree/payment",
      { nonce: "fake-valid-nonce", cart },
      token
    );

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ ok: true });

    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));

    expect(mockSale).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 14.99,
        paymentMethodNonce: "fake-valid-nonce",
        options: { submitForSettlement: true },
      }),
      expect.any(Function)
    );

    const orders = await orderModel.find({ buyer: buyer._id });
    expect(orders).toHaveLength(1);
    expect(orders[0].products).toHaveLength(1);
    expect(orders[0].products[0].toString()).toBe(cart[0]._id);
    expect(orders[0].payment.success).toBe(true);
  });
});
